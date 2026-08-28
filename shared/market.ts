export type SignalDirection = "call" | "put" | "hold";

export interface Candle {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
}

export interface OtcAsset {
  id: number;
  symbol: string;
  label: string;
  category: "forex" | "stocks" | "crypto";
  payout: number;
}

export interface MarketSnapshot {
  assetId: number;
  candles: Candle[];
  source: "broker" | "simulated";
  updatedAt: number;
  latencyMs: number;
}

export const OTC_ASSETS: OtcAsset[] = [
  { id: 76, symbol: "EURUSD-OTC", label: "EUR/USD OTC", category: "forex", payout: 85 },
  { id: 77, symbol: "EURGBP-OTC", label: "EUR/GBP OTC", category: "forex", payout: 84 },
  { id: 79, symbol: "EURJPY-OTC", label: "EUR/JPY OTC", category: "forex", payout: 83 },
  { id: 80, symbol: "AUDUSD-OTC", label: "AUD/USD OTC", category: "forex", payout: 84 },
  { id: 81, symbol: "GBPUSD-OTC", label: "GBP/USD OTC", category: "forex", payout: 86 },
  { id: 84, symbol: "GBPJPY-OTC", label: "GBP/JPY OTC", category: "forex", payout: 82 },
  { id: 1, symbol: "AAPL-OTC", label: "Apple OTC", category: "stocks", payout: 80 },
  { id: 3, symbol: "AMZN-OTC", label: "Amazon OTC", category: "stocks", payout: 79 },
  { id: 4, symbol: "MSFT-OTC", label: "Microsoft OTC", category: "stocks", payout: 80 },
  { id: 5, symbol: "NVDA-OTC", label: "NVIDIA OTC", category: "stocks", payout: 78 },
  { id: 8, symbol: "TSLA-OTC", label: "Tesla OTC", category: "stocks", payout: 77 },
  { id: 101, symbol: "BTCUSD-OTC", label: "Bitcoin OTC", category: "crypto", payout: 75 },
];

export function getAsset(assetId: number) {
  return OTC_ASSETS.find((asset) => asset.id === assetId) ?? OTC_ASSETS[0];
}
