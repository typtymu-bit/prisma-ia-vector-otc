import { describe, expect, it } from "vitest";
import { analyze } from "../client/src/lib/analysis";
import type { Candle } from "../shared/market";

function flatHistory(price = 100): Candle[] {
  return Array.from({ length: 30 }, (_, index) => ({
    time: index * 60,
    open: price,
    high: price + 0.04,
    low: price - 0.04,
    close: price,
  }));
}

describe("Vector reversal analysis", () => {
  it("arms CALL when a red candle rejects nearby support without a close below the line", () => {
    const candles = [...flatHistory(), { time: 1_800, open: 100.15, high: 100.18, low: 99.98, close: 100.05 }];
    const result = analyze(candles);
    expect(result?.direction).toBe("call");
    expect(result?.activeLine).toBe("r1");
    expect(result?.signalReady).toBe(true);
  });

  it("arms PUT when a green candle rejects nearby resistance without a close above the line", () => {
    const candles = [...flatHistory(), { time: 1_800, open: 99.85, high: 100.02, low: 99.82, close: 99.95 }];
    const result = analyze(candles);
    expect(result?.direction).toBe("put");
    expect(result?.activeLine).toBe("r2");
    expect(result?.signalReady).toBe(true);
  });

  it("blocks a CALL when the candle closes through support", () => {
    const candles = [...flatHistory(), { time: 1_800, open: 100.15, high: 100.18, low: 99.72, close: 99.8 }];
    const result = analyze(candles);
    expect(result?.signalReady).toBe(false);
    expect(result?.blocks.join(" ")).toContain("rompido");
  });

  it("turns a false resistance breakout into R2 PUT", () => {
    const candles = [...flatHistory(), { time: 1_800, open: 100.05, high: 100.22, low: 100.02, close: 100.18 }, { time: 1_860, open: 100.14, high: 100.19, low: 99.98, close: 100.00 }];
    const result = analyze(candles);
    expect(result?.direction).toBe("put");
    expect(result?.activeLine).toBe("r2");
    expect(result?.pattern).toContain("Falso rompimento");
  });

  it("turns a false support breakout into R1 CALL", () => {
    const candles = [...flatHistory(), { time: 1_800, open: 99.95, high: 99.98, low: 99.78, close: 99.82 }, { time: 1_860, open: 99.86, high: 100.01, low: 99.81, close: 99.97 }];
    const result = analyze(candles);
    expect(result?.direction).toBe("call");
    expect(result?.activeLine).toBe("r1");
    expect(result?.pattern).toContain("Falso rompimento");
  });
});
