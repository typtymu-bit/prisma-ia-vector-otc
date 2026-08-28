import { describe, expect, it } from "vitest";
import { OTC_ASSETS } from "../shared/market";

describe("ativos OTC reais do arquivo", () => {
  it("mantém os 27 ativos com IDs únicos", () => {
    expect(OTC_ASSETS).toHaveLength(27);
    expect(new Set(OTC_ASSETS.map((asset) => asset.id)).size).toBe(27);
    expect(OTC_ASSETS.some((asset) => asset.symbol === "AUDJPY-OTC")).toBe(true);
    expect(OTC_ASSETS.some((asset) => asset.symbol === "BA-OTC")).toBe(true);
  });
});
