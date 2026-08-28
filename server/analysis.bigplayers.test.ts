import { describe, expect, it } from "vitest";
import { analyze, computeBigPlayersForce, findHorizontalLevels } from "../client/src/lib/analysis";
import type { Candle } from "../shared/market";

function candle(time: number, open: number, close: number, high = Math.max(open, close) + 0.02, low = Math.min(open, close) - 0.02): Candle {
  return { time, open, close, high, low };
}

describe("restauração Big Players e níveis horizontais", () => {
  it("calcula pressão somente a partir dos corpos das microvelas", () => {
    const force = computeBigPlayersForce([
      candle(1, 100, 101, 110, 90),
      candle(2, 101, 100),
      candle(3, 100, 102),
    ]);
    expect(force.bullPct).toBe(75);
    expect(force.bearPct).toBe(25);
    expect(force.winner).toBe("bull");
  });

  it("encontra e expõe níveis horizontais a partir de swings reais", () => {
    const candles = Array.from({ length: 40 }, (_, index) => candle(index * 60, 100, 100, 100.12, 99.88));
    candles[10] = candle(600, 100, 100.02, 100.06, 99.4);
    candles[20] = candle(1200, 100, 99.98, 100.6, 99.94);
    candles[30] = candle(1800, 100, 100.01, 100.08, 99.42);
    const levels = findHorizontalLevels(candles);
    expect(levels.support).toBeLessThanOrEqual(100.02);
    expect(levels.resistance).toBeGreaterThanOrEqual(99.98);
  });

  it("mantém os níveis no resultado da análise", () => {
    const candles = Array.from({ length: 35 }, (_, index) => candle(index * 60, 100, 100, 100.04, 99.96));
    const result = analyze(candles);
    expect(result?.levels.support).toBeTypeOf("number");
    expect(result?.levels.resistance).toBeTypeOf("number");
  });
});
