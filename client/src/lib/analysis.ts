import type { Candle, SignalDirection } from "@shared/market";

export type SignalState = "ready" | "watching" | "blocked";
export type ActiveLine = "orange" | "blue" | "horizontal";

export interface LineSeries {
  orange: number[];
  blue: number[];
}

export interface HorizontalLevels {
  support: number;
  resistance: number;
  supportTouches: number;
  resistanceTouches: number;
}

export interface BigPlayersForce {
  bullPct: number;
  bearPct: number;
  winner: "bull" | "bear";
  leader: number;
}

export interface VectorAnalysis {
  direction: SignalDirection;
  state: SignalState;
  confidence: number;
  signalReady: boolean;
  lastPrice: number;
  emaOrange: number;
  emaBlue: number;
  lines: LineSeries;
  levels: HorizontalLevels;
  trend: "up" | "down" | "lateral";
  pattern: string;
  context: string;
  activeLine: ActiveLine | null;
  reasons: string[];
  blocks: string[];
}

const ORANGE_PERIOD = 9;
const BLUE_PERIOD = 21;

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function average(values: number[]) {
  return values.reduce((total, value) => total + value, 0) / Math.max(values.length, 1);
}

function ema(values: number[], period: number): number[] {
  if (!values.length) return [];
  const result = Array.from({ length: values.length }, (_, index) => values[index]);
  const multiplier = 2 / (period + 1);
  let previous = average(values.slice(0, Math.min(period, values.length)));

  for (let index = 0; index < values.length; index += 1) {
    if (index < period - 1) {
      result[index] = values[index];
      continue;
    }
    if (index === period - 1) previous = average(values.slice(0, period));
    else previous = values[index] * multiplier + previous * (1 - multiplier);
    result[index] = previous;
  }
  return result;
}

function atr(candles: Candle[], period = 14) {
  if (candles.length < 2) return 0;
  const ranges = candles.slice(1).map((candle, index) => {
    const priorClose = candles[index].close;
    return Math.max(candle.high - candle.low, Math.abs(candle.high - priorClose), Math.abs(candle.low - priorClose));
  });
  return average(ranges.slice(-period));
}

function candleParts(candle: Candle) {
  const body = Math.max(Math.abs(candle.close - candle.open), Number.EPSILON);
  return {
    body,
    isRed: candle.close < candle.open,
    isGreen: candle.close > candle.open,
    lowerWick: Math.max(0, Math.min(candle.open, candle.close) - candle.low),
    upperWick: Math.max(0, candle.high - Math.max(candle.open, candle.close)),
  };
}

function nearestLine(price: number, orange: number, blue: number): "orange" | "blue" {
  return Math.abs(price - orange) <= Math.abs(price - blue) ? "orange" : "blue";
}

function clusterLevels(values: number[], tolerance: number) {
  const clusters: { level: number; touches: number }[] = [];
  for (const value of values.sort((a, b) => a - b)) {
    const cluster = clusters.find((item) => Math.abs(item.level - value) <= tolerance);
    if (cluster) {
      cluster.level = (cluster.level * cluster.touches + value) / (cluster.touches + 1);
      cluster.touches += 1;
    } else {
      clusters.push({ level: value, touches: 1 });
    }
  }
  return clusters;
}

/** Detects automatically refreshed horizontal swing levels from real OHLC candles. */
export function findHorizontalLevels(candles: Candle[]): HorizontalLevels {
  const recent = candles.slice(-60);
  const price = recent.at(-1)?.close ?? 0;
  const volatility = Math.max(atr(recent), Math.abs(price) * 0.0001);
  const clusterTolerance = Math.max(volatility * 0.45, Math.abs(price) * 0.0002);
  const lows: number[] = [];
  const highs: number[] = [];

  for (let index = 2; index < recent.length - 2; index += 1) {
    const candle = recent[index];
    const neighbours = recent.slice(index - 2, index + 3);
    if (candle.low <= Math.min(...neighbours.map((item) => item.low))) lows.push(candle.low);
    if (candle.high >= Math.max(...neighbours.map((item) => item.high))) highs.push(candle.high);
  }

  const supportClusters = clusterLevels(lows.length ? lows : recent.map((candle) => candle.low), clusterTolerance);
  const resistanceClusters = clusterLevels(highs.length ? highs : recent.map((candle) => candle.high), clusterTolerance);
  const below = supportClusters.filter((item) => item.level <= price + clusterTolerance).sort((a, b) => b.level - a.level);
  const above = resistanceClusters.filter((item) => item.level >= price - clusterTolerance).sort((a, b) => a.level - b.level);
  const support = below[0] ?? supportClusters.at(-1) ?? { level: price, touches: 0 };
  const resistance = above[0] ?? resistanceClusters.at(0) ?? { level: price, touches: 0 };

  return {
    support: support.level,
    resistance: resistance.level,
    supportTouches: support.touches,
    resistanceTouches: resistance.touches,
  };
}

/** Estimates bull/bear pressure from real 1-second candle bodies, not an order-book claim. */
export function computeBigPlayersForce(candles: Candle[]): BigPlayersForce {
  let bull = 0;
  let bear = 0;
  for (const candle of candles.slice(-90)) {
    const move = candle.close - candle.open;
    if (move > 0) bull += move;
    else if (move < 0) bear += Math.abs(move);
  }
  const total = bull + bear;
  if (!total) return { bullPct: 50, bearPct: 50, winner: "bull", leader: 0 };
  const bullPct = Math.round((bull / total) * 100);
  const bearPct = 100 - bullPct;
  return { bullPct, bearPct, winner: bullPct >= 50 ? "bull" : "bear", leader: Math.round((Math.abs(bull - bear) / total) * 100) };
}

/**
 * Vector reversal logic: a CALL is armed only when a red candle rejects nearby
 * support without closing through it. A PUT mirrors this at resistance.
 */
export function analyze(candles: Candle[]): VectorAnalysis | null {
  if (candles.length < BLUE_PERIOD + 2) return null;

  const closes = candles.map((candle) => candle.close);
  const orangeSeries = ema(closes, ORANGE_PERIOD);
  const blueSeries = ema(closes, BLUE_PERIOD);
  const last = candles[candles.length - 1];
  const orange = orangeSeries.at(-1) ?? last.close;
  const blue = blueSeries.at(-1) ?? last.close;
  const previousOrange = orangeSeries.at(-2) ?? orange;
  const volatility = Math.max(atr(candles), Math.abs(last.close) * 0.00005);
  const tolerance = Math.max(volatility * 1.25, Math.abs(last.close) * 0.00015);
  const parts = candleParts(last);
  const levels = findHorizontalLevels(candles);

  const trend: VectorAnalysis["trend"] = orange > blue && orange >= previousOrange ? "up" : orange < blue && orange <= (blueSeries.at(-2) ?? blue) ? "down" : "lateral";

  const support = Math.max(orange, blue);
  const callLine = nearestLine(support, orange, blue);
  const distanceToSupport = Math.abs(last.low - support);
  const bodyAboveSupport = Math.min(last.open, last.close) >= support - tolerance * 0.12;
  const supportNotBroken = last.close >= support - tolerance * 0.08 && last.low >= support - tolerance * 0.65;
  const supportNear = distanceToSupport <= tolerance;
  const redReversal = parts.isRed && parts.lowerWick >= parts.body * 0.55;
  const callScore = [parts.isRed, redReversal, supportNear, bodyAboveSupport, supportNotBroken].filter(Boolean).length;
  const callReady = callScore === 5;

  const resistance = Math.min(orange, blue);
  const putLine = nearestLine(resistance, orange, blue);
  const distanceToResistance = Math.abs(last.high - resistance);
  const bodyBelowResistance = Math.max(last.open, last.close) <= resistance + tolerance * 0.12;
  const resistanceNotBroken = last.close <= resistance + tolerance * 0.08 && last.high <= resistance + tolerance * 0.65;
  const resistanceNear = distanceToResistance <= tolerance;
  const greenReversal = parts.isGreen && parts.upperWick >= parts.body * 0.55;
  const putScore = [parts.isGreen, greenReversal, resistanceNear, bodyBelowResistance, resistanceNotBroken].filter(Boolean).length;
  const putReady = putScore === 5;

  const direction: SignalDirection = callReady ? "call" : putReady ? "put" : "hold";
  const activeLine: ActiveLine | null = callReady ? callLine : putReady ? putLine : null;
  const readinessScore = Math.max(callScore, putScore);
  const state: SignalState = direction !== "hold" ? "ready" : readinessScore >= 3 ? "watching" : "blocked";
  const reasons: string[] = [];
  const blocks: string[] = [];

  if (callReady) {
    reasons.push("Vela vermelha rejeitou o suporte sem fechar abaixo da linha.");
    reasons.push(`Linha ${callLine === "orange" ? "laranja (EMA 9)" : "azul (EMA 21)"} abaixo da vela e dentro da zona de proximidade.`);
    reasons.push(`Nível horizontal de suporte atualizado em ${levels.support.toFixed(5)} (${levels.supportTouches} toque${levels.supportTouches === 1 ? "" : "s"}).`);
  } else if (putReady) {
    reasons.push("Vela verde rejeitou a resistência sem fechar acima da linha.");
    reasons.push(`Linha ${putLine === "orange" ? "laranja (EMA 9)" : "azul (EMA 21)"} acima da vela e dentro da zona de proximidade.`);
    reasons.push(`Nível horizontal de resistência atualizado em ${levels.resistance.toFixed(5)} (${levels.resistanceTouches} toque${levels.resistanceTouches === 1 ? "" : "s"}).`);
  } else if (callScore >= putScore) {
    if (!parts.isRed) blocks.push("A vela atual não é vermelha para uma reversão de compra.");
    if (!supportNear) blocks.push("A linha de suporte ainda não está próxima da mínima da vela.");
    if (!supportNotBroken || !bodyAboveSupport) blocks.push("O suporte foi pressionado/rompido; compra bloqueada.");
    if (parts.isRed && parts.lowerWick < parts.body * 0.7) blocks.push("Falta pavio de rejeição suficiente no suporte.");
  } else {
    if (!parts.isGreen) blocks.push("A vela atual não é verde para uma reversão de venda.");
    if (!resistanceNear) blocks.push("A linha de resistência ainda não está próxima da máxima da vela.");
    if (!resistanceNotBroken || !bodyBelowResistance) blocks.push("A resistência foi pressionada/rompida; venda bloqueada.");
    if (parts.isGreen && parts.upperWick < parts.body * 0.7) blocks.push("Falta pavio de rejeição suficiente na resistência.");
  }

  const pattern = direction === "call" ? "Rejeição vermelha no suporte" : direction === "put" ? "Rejeição verde na resistência" : "Aguardando reversão sem rompimento";
  return {
    direction,
    state,
    confidence: direction === "hold" ? clamp(42 + readinessScore * 9, 42, 78) : clamp(78 + readinessScore * 4, 78, 98),
    signalReady: direction !== "hold",
    lastPrice: last.close,
    emaOrange: orange,
    emaBlue: blue,
    lines: { orange: orangeSeries, blue: blueSeries },
    levels,
    trend,
    pattern,
    context: trend === "up" ? "Linhas vetoriais inclinadas para cima" : trend === "down" ? "Linhas vetoriais inclinadas para baixo" : "Linhas próximas; mercado em transição",
    activeLine,
    reasons,
    blocks: blocks.slice(0, 3),
  };
}
