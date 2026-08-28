import type { Candle, SignalDirection } from "@shared/market";

export type SignalState = "ready" | "watching" | "blocked";
/** R1 is the buy-reversal line; R2 is the sell-reversal line. */
export type ActiveLine = "r1" | "r2";

export interface HorizontalLevels {
  support: number;
  supportOuter: number;
  resistance: number;
  resistanceOuter: number;
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
  levels: HorizontalLevels;
  trend: "up" | "down" | "lateral";
  pattern: string;
  context: string;
  activeLine: ActiveLine | null;
  reasons: string[];
  blocks: string[];
}

function clamp(value: number, min: number, max: number) { return Math.max(min, Math.min(max, value)); }
function average(values: number[]) { return values.reduce((total, value) => total + value, 0) / Math.max(values.length, 1); }
function atr(candles: Candle[], period = 14) {
  if (candles.length < 2) return 0;
  const ranges = candles.slice(1).map((candle, index) => Math.max(candle.high - candle.low, Math.abs(candle.high - candles[index].close), Math.abs(candle.low - candles[index].close)));
  return average(ranges.slice(-period));
}
function parts(candle: Candle) {
  return { body: Math.max(Math.abs(candle.close - candle.open), Number.EPSILON), red: candle.close < candle.open, green: candle.close > candle.open, lowerWick: Math.max(0, Math.min(candle.open, candle.close) - candle.low), upperWick: Math.max(0, candle.high - Math.max(candle.open, candle.close)) };
}
function clusterLevels(values: number[], tolerance: number) {
  const clusters: { level: number; touches: number }[] = [];
  for (const value of [...values].sort((a, b) => a - b)) {
    const cluster = clusters.find((item) => Math.abs(item.level - value) <= tolerance);
    if (cluster) { cluster.level = (cluster.level * cluster.touches + value) / (cluster.touches + 1); cluster.touches += 1; }
    else clusters.push({ level: value, touches: 1 });
  }
  return clusters;
}

/** Four real horizontal zones: two supports and two resistances from swing extremes/clusters. */
export function findHorizontalLevels(candles: Candle[]): HorizontalLevels {
  const recent = candles.slice(-80);
  const price = recent.at(-1)?.close ?? 0;
  const volatility = Math.max(atr(recent), Math.abs(price) * 0.0001);
  const tolerance = Math.max(volatility * 0.45, Math.abs(price) * 0.0002);
  const lows: number[] = [];
  const highs: number[] = [];
  for (let index = 2; index < recent.length - 2; index += 1) {
    const window = recent.slice(index - 2, index + 3);
    if (recent[index].low <= Math.min(...window.map((item) => item.low))) lows.push(recent[index].low);
    if (recent[index].high >= Math.max(...window.map((item) => item.high))) highs.push(recent[index].high);
  }
  const supports = clusterLevels(lows.length ? lows : recent.map((item) => item.low), tolerance).filter((item) => item.level <= price + tolerance).sort((a, b) => b.level - a.level);
  const resistances = clusterLevels(highs.length ? highs : recent.map((item) => item.high), tolerance).filter((item) => item.level >= price - tolerance).sort((a, b) => a.level - b.level);
  const support = supports[0] ?? { level: Math.min(...recent.map((item) => item.low)), touches: 0 };
  const resistance = resistances[0] ?? { level: Math.max(...recent.map((item) => item.high)), touches: 0 };
  const supportOuter = supports[1]?.level ?? Math.min(...recent.map((item) => item.low));
  const resistanceOuter = resistances[1]?.level ?? Math.max(...recent.map((item) => item.high));
  return { support: support.level, supportOuter: Math.min(support.level, supportOuter), resistance: resistance.level, resistanceOuter: Math.max(resistance.level, resistanceOuter), supportTouches: support.touches, resistanceTouches: resistance.touches };
}

/** Estimates pressure from real 1-second candle bodies; it is not an order-book reading. */
export function computeBigPlayersForce(candles: Candle[]): BigPlayersForce {
  let bull = 0; let bear = 0;
  for (const candle of candles.slice(-90)) { const move = candle.close - candle.open; if (move > 0) bull += move; else if (move < 0) bear += Math.abs(move); }
  const total = bull + bear;
  if (!total) return { bullPct: 50, bearPct: 50, winner: "bull", leader: 0 };
  const bullPct = Math.round((bull / total) * 100);
  return { bullPct, bearPct: 100 - bullPct, winner: bullPct >= 50 ? "bull" : "bear", leader: Math.round((Math.abs(bull - bear) / total) * 100) };
}

export function analyze(candles: Candle[]): VectorAnalysis | null {
  if (candles.length < 23) return null;
  const last = candles.at(-1)!;
  const levels = findHorizontalLevels(candles.slice(0, -1));
  const volatility = Math.max(atr(candles), Math.abs(last.close) * 0.00005);
  const tolerance = Math.max(volatility * 1.25, Math.abs(last.close) * 0.00015);
  const p = parts(last);
  const trendDelta = last.close - average(candles.slice(-8, -3).map((item) => item.close));
  const trend = trendDelta > volatility * 0.35 ? "up" : trendDelta < -volatility * 0.35 ? "down" : "lateral";
  const callNear = Math.abs(last.low - levels.support) <= tolerance;
  const callNotBroken = last.close >= levels.support && last.low >= levels.support - tolerance * 0.65;
  const callBodyAbove = Math.min(last.open, last.close) >= levels.support - tolerance * 0.12;
  const callReject = p.red && p.lowerWick >= p.body * 0.55;
  const callScore = [p.red, callReject, callNear, callBodyAbove, callNotBroken].filter(Boolean).length;
  const putNear = Math.abs(last.high - levels.resistance) <= tolerance;
  const putNotBroken = last.close <= levels.resistance && last.high <= levels.resistance + tolerance * 0.65;
  const putBodyBelow = Math.max(last.open, last.close) <= levels.resistance + tolerance * 0.12;
  const putReject = p.green && p.upperWick >= p.body * 0.55;
  const putScore = [p.green, putReject, putNear, putBodyBelow, putNotBroken].filter(Boolean).length;
  const previous = candles.at(-2)!;
  const previousParts = parts(previous);
  const breakoutBase = candles.slice(0, -2);
  const falseLevels = breakoutBase.length >= 23 ? findHorizontalLevels(breakoutBase) : levels;
  const falseResistanceBreak = previousParts.green && previous.close > falseLevels.resistance + tolerance * 0.08 && last.close <= falseLevels.resistance - tolerance * 0.05 && last.high >= falseLevels.resistance - tolerance * 0.12 && p.red;
  const falseSupportBreak = previousParts.red && previous.close < falseLevels.support - tolerance * 0.08 && last.close >= falseLevels.support + tolerance * 0.05 && last.low <= falseLevels.support + tolerance * 0.12 && p.green;
  const direction: SignalDirection = falseSupportBreak || (callScore === 5 && putScore !== 5) ? "call" : falseResistanceBreak || (putScore === 5 && callScore !== 5) ? "put" : "hold";
  const activeLine: ActiveLine | null = direction === "call" ? "r1" : direction === "put" ? "r2" : null;
  const readiness = Math.max(callScore, putScore);
  const reasons: string[] = []; const blocks: string[] = [];
  if (direction === "call") { reasons.push(falseSupportBreak ? "Falso rompimento de suporte: a vela vermelha rompeu e a seguinte voltou para dentro; R1 compra." : "R1 isolada: vela vermelha rejeitou o suporte sem fechar abaixo; sinal de compra."); reasons.push(`R1 em ${levels.support.toFixed(5)} com ${levels.supportTouches} toque${levels.supportTouches === 1 ? "" : "s"}.`); }
  else if (direction === "put") { reasons.push(falseResistanceBreak ? "Falso rompimento de resistência: a vela verde rompeu e a seguinte voltou para dentro; R2 venda." : "R2 isolada: vela verde rejeitou a resistência sem fechar acima; sinal de venda."); reasons.push(`R2 em ${levels.resistance.toFixed(5)} com ${levels.resistanceTouches} toque${levels.resistanceTouches === 1 ? "" : "s"}.`); }
  else if (callScore >= putScore) { if (!p.red) blocks.push("A vela não é vermelha para reversão de compra."); if (!callNear) blocks.push("O suporte real ainda não está próximo da mínima."); if (!callNotBroken || !callBodyAbove) blocks.push("O suporte foi rompido; compra bloqueada."); if (p.red && !callReject) blocks.push("Falta pavio de rejeição suficiente no suporte."); }
  else { if (!p.green) blocks.push("A vela não é verde para reversão de venda."); if (!putNear) blocks.push("A resistência real ainda não está próxima da máxima."); if (!putNotBroken || !putBodyBelow) blocks.push("A resistência foi rompida; venda bloqueada."); if (p.green && !putReject) blocks.push("Falta pavio de rejeição suficiente na resistência."); }
  if (last.close < levels.support - tolerance * 0.08) blocks.unshift("O suporte foi rompido; compra bloqueada.");
  if (last.close > levels.resistance + tolerance * 0.08) blocks.unshift("A resistência foi rompida; venda bloqueada.");
  return { direction, state: direction !== "hold" ? "ready" : readiness >= 3 ? "watching" : "blocked", confidence: direction === "hold" ? clamp(42 + readiness * 9, 42, 78) : clamp(78 + readiness * 4, 78, 98), signalReady: direction !== "hold", lastPrice: last.close, levels, trend, pattern: falseSupportBreak ? "Falso rompimento no suporte · R1 compra" : falseResistanceBreak ? "Falso rompimento na resistência · R2 venda" : direction === "call" ? "Rejeição vermelha no suporte" : direction === "put" ? "Rejeição verde na resistência" : "Aguardando reversão sem rompimento", context: trend === "up" ? "Zonas reais inclinadas para cima" : trend === "down" ? "Zonas reais inclinadas para baixo" : "Zonas horizontais próximas; mercado em transição", activeLine, reasons, blocks: blocks.slice(0, 3) };
}
