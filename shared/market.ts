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
  source: "broker" | "unavailable";
  updatedAt: number;
  latencyMs: number;
  candleDurationSeconds?: number;
  error?: string;
}

export interface MarketTick {
  assetId: number;
  candle: Candle | null;
  candles?: Candle[];
  source: "broker" | "unavailable";
  updatedAt: number;
  error: string | null;
}

export const OTC_ASSETS: OtcAsset[] = [
  { id: 76, symbol: "EURUSD-OTC", label: "EUR/USD OTC", category: "forex", payout: 85 },
  { id: 77, symbol: "EURGBP-OTC", label: "EUR/GBP OTC", category: "forex", payout: 84 },
  { id: 79, symbol: "EURJPY-OTC", label: "EUR/JPY OTC", category: "forex", payout: 83 },
  { id: 80, symbol: "AUDUSD-OTC", label: "AUD/USD OTC", category: "forex", payout: 84 },
  { id: 81, symbol: "GBPUSD-OTC", label: "GBP/USD OTC", category: "forex", payout: 86 },
  { id: 82, symbol: "AUDJPY-OTC", label: "AUD/JPY OTC", category: "forex", payout: 83 },
  { id: 84, symbol: "GBPJPY-OTC", label: "GBP/JPY OTC", category: "forex", payout: 82 },
  { id: 85, symbol: "USDJPY-OTC", label: "USD/JPY OTC", category: "forex", payout: 82 },
  { id: 86, symbol: "USDCHF-OTC", label: "USD/CHF OTC", category: "forex", payout: 82 },
  { id: 87, symbol: "CADJPY-OTC", label: "CAD/JPY OTC", category: "forex", payout: 82 },
  { id: 100, symbol: "USDCAD-OTC", label: "USD/CAD OTC", category: "forex", payout: 82 },
  { id: 101, symbol: "CHFJPY-OTC", label: "CHF/JPY OTC", category: "forex", payout: 82 },
  { id: 102, symbol: "GBPAUD-OTC", label: "GBP/AUD OTC", category: "forex", payout: 82 },
  { id: 103, symbol: "EURCHF-OTC", label: "EUR/CHF OTC", category: "forex", payout: 82 },
  { id: 104, symbol: "GBPCAD-OTC", label: "GBP/CAD OTC", category: "forex", payout: 82 },
  { id: 105, symbol: "EURCAD-OTC", label: "EUR/CAD OTC", category: "forex", payout: 82 },
  { id: 107, symbol: "NZDUSD-OTC", label: "NZD/USD OTC", category: "forex", payout: 82 },
  { id: 1, symbol: "AAPL-OTC", label: "Apple OTC", category: "stocks", payout: 80 },
  { id: 3, symbol: "AMZN-OTC", label: "Amazon OTC", category: "stocks", payout: 79 },
  { id: 4, symbol: "MSFT-OTC", label: "Microsoft OTC", category: "stocks", payout: 80 },
  { id: 5, symbol: "NVDA-OTC", label: "NVIDIA OTC", category: "stocks", payout: 78 },
  { id: 6, symbol: "GOOGL-OTC", label: "Google OTC", category: "stocks", payout: 78 },
  { id: 7, symbol: "META-OTC", label: "Meta OTC", category: "stocks", payout: 78 },
  { id: 8, symbol: "TSLA-OTC", label: "Tesla OTC", category: "stocks", payout: 77 },
  { id: 9, symbol: "JPM-OTC", label: "JPMorgan OTC", category: "stocks", payout: 77 },
  { id: 10, symbol: "NFLX-OTC", label: "Netflix OTC", category: "stocks", payout: 77 },
  { id: 11, symbol: "BA-OTC", label: "Boeing OTC", category: "stocks", payout: 77 },
];

export function getAsset(assetId: number) {
  return OTC_ASSETS.find((asset) => asset.id === assetId) ?? OTC_ASSETS[0];
}
