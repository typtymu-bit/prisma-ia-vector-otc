import type { Candle, MarketSnapshot } from "@shared/market";

const BROKER_WS_URL = "wss://ws.trade.optgobroker.com/echo/websocket";

function seededRandom(seed: number) {
  let value = seed >>> 0;
  return () => {
    value = (value * 1664525 + 1013904223) >>> 0;
    return value / 4294967296;
  };
}

function simulatedCandles(assetId: number, count: number): Candle[] {
  const now = Math.floor(Date.now() / 1000);
  const minute = Math.floor(now / 60);
  const random = seededRandom(assetId * 7919 + Math.floor(minute / 120));
  const base = assetId >= 100 ? 67_000 : assetId < 20 ? 180 + assetId * 11 : 1 + (assetId % 7) / 10;
  const precision = base > 100 ? 0.22 : 0.00045;
  const candles: Candle[] = [];
  let price = base * (1 + Math.sin((minute + assetId) / 23) * 0.009);

  for (let index = 0; index < count; index += 1) {
    const position = minute - count + 1 + index;
    const impulse = Math.sin((position + assetId * 3) / 7) * precision * 0.7;
    const noise = (random() - 0.5) * precision * 0.75;
    const open = price;
    const close = open + impulse + noise;
    const high = Math.max(open, close) + random() * precision * 0.55;
    const low = Math.min(open, close) - random() * precision * 0.55;
    candles.push({ time: position * 60, open, high, low, close });
    price = close;
  }

  // The final candle evolves inside the current minute so visual validation is
  // possible before credentials are connected. It never replaces broker data.
  const active = candles[candles.length - 1];
  const seconds = now % 60;
  const liveMove = Math.sin((seconds + assetId) * 0.56) * precision * 0.85;
  active.close = active.open + liveMove;
  active.high = Math.max(active.high, active.open, active.close);
  active.low = Math.min(active.low, active.open, active.close);
  return candles;
}

function parseCandles(payload: unknown): Candle[] {
  const raw = Array.isArray(payload)
    ? payload
    : (payload as { candles?: unknown } | null)?.candles;
  if (!Array.isArray(raw)) return [];

  return raw
    .filter((item): item is Record<string, unknown> => Boolean(item && typeof item === "object"))
    .map((item) => ({
      time: Number(item.from ?? item.time ?? 0),
      open: Number(item.open ?? 0),
      high: Number(item.max ?? item.high ?? item.open ?? 0),
      low: Number(item.min ?? item.low ?? item.open ?? 0),
      close: Number(item.close ?? item.open ?? 0),
    }))
    .filter((candle) => Number.isFinite(candle.time) && candle.time > 0 && Number.isFinite(candle.close));
}

async function brokerCandles(activeId: number, count: number): Promise<Candle[] | null> {
  const ssid = process.env.OPTGO_BROKER_SSID?.trim();
  if (!ssid) return null;

  const requestId = `vector-${Date.now()}`;
  return new Promise((resolve, reject) => {
    const socket = new WebSocket(BROKER_WS_URL);
    const timer = setTimeout(() => {
      socket.close();
      reject(new Error("Broker candle request timed out"));
    }, 7000);

    const close = () => {
      clearTimeout(timer);
      socket.close();
    };

    socket.addEventListener("open", () => {
      socket.send(JSON.stringify({ name: "ssid", msg: ssid }));
    });

    socket.addEventListener("message", (event) => {
      let message: Record<string, unknown>;
      try {
        message = JSON.parse(String(event.data)) as Record<string, unknown>;
      } catch {
        return;
      }

      if (message.name === "profile" && message.msg === false) {
        close();
        reject(new Error("Broker rejected the server session"));
        return;
      }

      if (message.name === "profile") {
        socket.send(
          JSON.stringify({
            name: "sendMessage",
            request_id: requestId,
            msg: {
              name: "get-candles",
              version: "2.0",
              body: { active_id: activeId, size: 60, duration: 60 },
            },
          }),
        );
      }

      if ((message.name === "candles" || message.name === "history") && message.request_id === requestId) {
        const candles = parseCandles(message.msg);
        close();
        resolve(candles.slice(-count));
      }
    });

    socket.addEventListener("error", () => {
      close();
      reject(new Error("Broker WebSocket connection failed"));
    });
  });
}

export async function getMarketSnapshot(assetId: number, count = 120): Promise<MarketSnapshot> {
  const startedAt = Date.now();
  try {
    const broker = await brokerCandles(assetId, count);
    if (broker && broker.length >= 23) {
      return {
        assetId,
        candles: broker,
        source: "broker",
        updatedAt: Date.now(),
        latencyMs: Date.now() - startedAt,
      };
    }
  } catch {
    // A credentials/connectivity error must never expose secret values or
    // prevent the user from inspecting the dashboard in simulation mode.
  }

  return {
    assetId,
    candles: simulatedCandles(assetId, count),
    source: "simulated",
    updatedAt: Date.now(),
    latencyMs: Date.now() - startedAt,
  };
}
