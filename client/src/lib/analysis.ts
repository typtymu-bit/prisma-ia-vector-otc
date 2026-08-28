import type { Candle, SignalDirection } from "@shared/market";

export type SignalState = "ready" | "watching" | "blocked";

export interface LineSeries {
  orange: number[];
  blue: number[];
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
  trend: "up" | "down" | "lateral";
  pattern: string;
  context: string;
  activeLine: "orange" | "blue" | null;
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
    if (index === period - 1) {
      previous = average(values.slice(0, period));
    } else {
      previous = values[index] * multiplier + previous * (1 - multiplier);
    }
    result[index] = previous;
  }

  return result;
}

function atr(candles: Candle[], period = 14) {
  if (candles.length < 2) return 0;
  const ranges = candles.slice(1).map((candle, index) => {
    const priorClose = candles[index].close;
    return Math.max(
      candle.high - candle.low,
      Math.abs(candle.high - priorClose),
      Math.abs(candle.low - priorClose),
    );
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

/**
 * Vector reversal logic intentionally has no RSI, Bollinger or voting stack.
 * A CALL is armed only when a red candle rejects a nearby moving-average support
 * without closing through it. A PUT mirrors this at moving-average resistance.
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
  const previousBlue = blueSeries.at(-2) ?? blue;
  const volatility = Math.max(atr(candles), Math.abs(last.close) * 0.00005);
  // A reversal wick must be allowed to touch the vector zone. The close is
  // still validated independently below, so expanding the contact area never
  // turns a real line break into a signal.
  const tolerance = Math.max(volatility * 1.25, Math.abs(last.close) * 0.00015);
  const parts = candleParts(last);

  const trend: VectorAnalysis["trend"] =
    orange > blue && orange >= previousOrange ? "up" : orange < blue && orange <= previousOrange ? "down" : "lateral";

  // For a CALL, the nearest line must be below the candle and close enough to
  // be acting as support. The body cannot close below it: wick contact is
  // accepted, a structural break is not.
  const support = Math.max(orange, blue);
  const callLine = nearestLine(support, orange, blue);
  const distanceToSupport = Math.abs(last.low - support);
  const bodyAboveSupport = Math.min(last.open, last.close) >= support - tolerance * 0.12;
  const supportNotBroken = last.close >= support - tolerance * 0.08 && last.low >= support - tolerance * 0.65;
  const supportNear = distanceToSupport <= tolerance;
  const redReversal = parts.isRed && parts.lowerWick >= parts.body * 0.55;
  const callScore = [parts.isRed, redReversal, supportNear, bodyAboveSupport, supportNotBroken].filter(Boolean).length;
  const callReady = callScore === 5;

  // PUT is exactly the inverse: a green candle rejects a nearby line above it,
  // leaving its body beneath resistance without breaking it.
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
  const activeLine = callReady ? callLine : putReady ? putLine : null;
  const readinessScore = Math.max(callScore, putScore);
  const state: SignalState = direction !== "hold" ? "ready" : readinessScore >= 3 ? "watching" : "blocked";
  const reasons: string[] = [];
  const blocks: string[] = [];

  if (callReady) {
    reasons.push("Vela vermelha rejeitou o suporte sem fechar abaixo da linha.");
    reasons.push(`Linha ${callLine === "orange" ? "laranja (EMA 9)" : "azul (EMA 21)"} abaixo da vela e dentro da zona de proximidade.`);
    reasons.push("Pavio inferior confirma defesa do suporte; não houve rompimento estrutural.");
  } else if (putReady) {
    reasons.push("Vela verde rejeitou a resistência sem fechar acima da linha.");
    reasons.push(`Linha ${putLine === "orange" ? "laranja (EMA 9)" : "azul (EMA 21)"} acima da vela e dentro da zona de proximidade.`);
    reasons.push("Pavio superior confirma rejeição da resistência; não houve rompimento estrutural.");
  } else {
    if (callScore >= putScore) {
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
  }

  const pattern =
    direction === "call"
      ? "Rejeição vermelha no suporte"
      : direction === "put"
        ? "Rejeição verde na resistência"
        : "Aguardando reversão sem rompimento";

  return {
    direction,
    state,
    confidence: direction === "hold" ? clamp(42 + readinessScore * 9, 42, 78) : clamp(78 + readinessScore * 4, 78, 98),
    signalReady: direction !== "hold",
    lastPrice: last.close,
    emaOrange: orange,
    emaBlue: blue,
    lines: { orange: orangeSeries, blue: blueSeries },
    trend,
    pattern,
    context:
      trend === "up"
        ? "Linhas vetoriais inclinadas para cima"
        : trend === "down"
          ? "Linhas vetoriais inclinadas para baixo"
          : "Linhas próximas; mercado em transição",
    activeLine,
    reasons,
    blocks: blocks.slice(0, 3),
  };
}
