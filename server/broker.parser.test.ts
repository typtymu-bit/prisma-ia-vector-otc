import { describe, expect, it } from "vitest";
import { ONE_MINUTE_REQUEST, ONE_SECOND_REQUEST, parseBrokerCandles } from "./broker";

describe("OPTGO candle parser", () => {
  it("normalizes the broker object format from/min/max", () => {
    const candles = parseBrokerCandles({ msg: { candles: [{ from: 1_800, open: 1.17, close: 1.18, min: 1.16, max: 1.19 }] } });
    expect(candles).toEqual([{ time: 1_800, open: 1.17, high: 1.19, low: 1.16, close: 1.18 }]);
  });

  it("normalizes compact tuples without trusting a fixed high/low position", () => {
    const candles = parseBrokerCandles([[1_800, 1.17, 1.18, 1.16, 1.19]]);
    expect(candles[0]).toEqual({ time: 1_800, open: 1.17, high: 1.19, low: 1.16, close: 1.18 });
  });

  it("keeps the broker's exact 1-minute and live 1-second requests", () => {
    expect(ONE_MINUTE_REQUEST).toEqual({ size: 60, duration: 60 });
    expect(ONE_SECOND_REQUEST).toEqual({ size: 1, duration: 1 });
  });
});
