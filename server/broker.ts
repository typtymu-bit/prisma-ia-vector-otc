import type { Candle, MarketSnapshot, MarketTick } from "@shared/market";

const AUTH_URL = "https://auth.trade.optgobroker.com/api/v1.0/login";
const BROKER_WS_URL = "wss://ws.trade.optgobroker.com/echo/websocket";
const ONE_MINUTE_REQUEST = { size: 60, duration: 60 } as const;
const ONE_SECOND_REQUEST = { size: 1, duration: 1 } as const;
const REQUEST_TIMEOUT_MS = 8_000;
const SESSION_TTL_MS = 45 * 60 * 1_000;

type BrokerMessage = Record<string, unknown>;
type PendingRequest = { resolve: (value: Candle[]) => void; reject: (error: Error) => void; timer: ReturnType<typeof setTimeout> };

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" ? (value as Record<string, unknown>) : null;
}

function parseJson(value: unknown): unknown {
  if (typeof value !== "string") return value;
  try {
    return JSON.parse(value);
  } catch {
    return value;
  }
}

function findSession(value: unknown, depth = 0): string | null {
  if (depth > 5) return null;
  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed.length >= 16 ? trimmed : null;
  }
  const record = asRecord(value);
  if (!record) return null;

  for (const key of ["ssid", "SSID", "session", "session_id", "sessionId", "token"]) {
    const candidate = findSession(record[key], depth + 1);
    if (candidate) return candidate;
  }
  for (const key of ["data", "result", "auth", "profile", "user"]) {
    const candidate = findSession(record[key], depth + 1);
    if (candidate) return candidate;
  }
  return null;
}

function normalizeTuple(item: unknown): Candle | null {
  if (!Array.isArray(item) || item.length < 5) return null;
  const numbers = item.slice(0, 5).map(Number);
  if (numbers.some((number) => !Number.isFinite(number))) return null;
  const [time, open, close, fourth, fifth] = numbers;
  const firstOrder = { high: fourth, low: fifth };
  const secondOrder = { high: fifth, low: fourth };
  const valid = (candidate: { high: number; low: number }) => candidate.high >= Math.max(open, close) && candidate.low <= Math.min(open, close);
  const range = valid(firstOrder) ? firstOrder : valid(secondOrder) ? secondOrder : { high: Math.max(fourth, fifth, open, close), low: Math.min(fourth, fifth, open, close) };
  return { time, open, high: range.high, low: range.low, close };
}

export function parseBrokerCandles(payload: unknown): Candle[] {
  const findItems = (value: unknown, depth = 0): unknown[] => {
    if (depth > 5) return [];
    const parsed = parseJson(value);
    if (Array.isArray(parsed)) return parsed;
    const record = asRecord(parsed);
    if (!record) return [];
    for (const key of ["candles", "data", "history", "msg", "result", "body"]) {
      const items = findItems(record[key], depth + 1);
      if (items.length > 0) return items;
    }
    return [];
  };
  const items = findItems(payload);

  return items
    .map((item): Candle | null => {
      if (Array.isArray(item)) return normalizeTuple(item);
      const row = asRecord(item);
      if (!row) return null;
      const time = Number(row.from ?? row.time ?? row.timestamp ?? row.at ?? 0);
      const open = Number(row.open ?? 0);
      const close = Number(row.close ?? row.open ?? 0);
      const high = Number(row.max ?? row.high ?? Math.max(open, close));
      const low = Number(row.min ?? row.low ?? Math.min(open, close));
      if (![time, open, high, low, close].every(Number.isFinite) || time <= 0) return null;
      return { time, open, high, low, close };
    })
    .filter((candle): candle is Candle => candle !== null)
    .sort((left, right) => left.time - right.time);
}

function isOneMinute(candles: Candle[]) {
  if (candles.length < 2) return false;
  const recent = candles.slice(-8);
  const intervals = recent.slice(1).map((candle, index) => candle.time - recent[index].time);
  return intervals.length > 0 && intervals.every((interval) => interval === 60);
}

async function loginForSession(): Promise<string> {
  const email = process.env.OPTGO_BROKER_EMAIL?.trim();
  const password = process.env.OPTGO_BROKER_PASSWORD?.trim();
  if (!email || !password) throw new Error("Credenciais OPTGO não configuradas no servidor.");

  const response = await fetch(AUTH_URL, {
    method: "POST",
    headers: {
      accept: "application/json",
      "content-type": "application/json",
      origin: "https://trade.optgobroker.com",
      referer: "https://trade.optgobroker.com/",
    },
    body: JSON.stringify({ email, password }),
  });
  if (!response.ok) throw new Error(`Login OPTGO recusado (HTTP ${response.status}).`);
  const payload = await response.json().catch(() => null);
  const session = findSession(payload);
  if (!session) throw new Error("Login OPTGO não retornou uma sessão válida.");
  return session;
}

class OtcBrokerConnection {
  private socket: WebSocket | null = null;
  private connected = false;
  private connecting: Promise<void> | null = null;
  private sequence = 0;
  private pending = new Map<string, PendingRequest>();
  private session: string | null = null;
  private sessionExpiresAt = 0;

  private reset(error: Error) {
    this.connected = false;
    this.socket = null;
    this.pending.forEach((pending) => {
      clearTimeout(pending.timer);
      pending.reject(error);
    });
    this.pending.clear();
  }

  private async getSession() {
    const directSession = process.env.OPTGO_BROKER_SSID?.trim();
    if (directSession) return directSession;
    if (!this.session || Date.now() >= this.sessionExpiresAt) {
      this.session = await loginForSession();
      this.sessionExpiresAt = Date.now() + SESSION_TTL_MS;
    }
    return this.session;
  }

  private async ensureConnected() {
    if (this.connected && this.socket) return;
    if (this.connecting) return this.connecting;
    this.connecting = (async () => {
      const session = await this.getSession();
      const socket = new WebSocket(BROKER_WS_URL);
      this.socket = socket;
      const authenticated = new Promise<void>((resolve, reject) => {
        const timer = setTimeout(() => reject(new Error("Timeout ao autenticar o WebSocket OPTGO.")), REQUEST_TIMEOUT_MS);
        const finish = (error?: Error) => {
          clearTimeout(timer);
          if (error) reject(error);
          else resolve();
        };
        socket.addEventListener("open", () => socket.send(JSON.stringify({ name: "ssid", msg: session })));
        socket.addEventListener("message", (event) => {
          const message = parseJson(event.data);
          const record = asRecord(message);
          if (!record) return;
          if (record.name === "profile") {
            if (record.msg === false) finish(new Error("A corretora recusou a sessão OPTGO."));
            else finish();
          }
          this.handleMessage(record);
        });
        socket.addEventListener("error", () => finish(new Error("Falha de conexão com o WebSocket OPTGO.")));
        socket.addEventListener("close", () => {
          this.reset(new Error("Conexão OPTGO encerrada."));
          if (!this.connected) finish(new Error("Conexão OPTGO encerrada antes da autenticação."));
        });
      });
      await authenticated;
      this.connected = true;
    })().catch((error: unknown) => {
      this.reset(error instanceof Error ? error : new Error("Falha na conexão OPTGO."));
      throw error;
    }).finally(() => {
      this.connecting = null;
    });
    return this.connecting;
  }

  private handleMessage(message: BrokerMessage) {
    const requestId = String(message.request_id ?? message.requestId ?? "");
    if (!requestId) return;
    const pending = this.pending.get(requestId);
    if (!pending) return;
    const candles = parseBrokerCandles(message.msg ?? message.candles ?? message.data);
    if (candles.length > 0) {
      clearTimeout(pending.timer);
      this.pending.delete(requestId);
      pending.resolve(candles);
    }
  }

  async requestCandles(params: { size: number; duration: number }, timeout = REQUEST_TIMEOUT_MS) {
    await this.ensureConnected();
    if (!this.socket || !this.connected) throw new Error("Sessão OPTGO não está conectada.");
    const requestId = String(++this.sequence);
    const candlesPromise = new Promise<Candle[]>((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pending.delete(requestId);
        reject(new Error("A corretora não respondeu ao pedido de candles."));
      }, timeout);
      this.pending.set(requestId, { resolve, reject, timer });
    });
    this.socket.send(JSON.stringify({
      name: "sendMessage",
      request_id: requestId,
      msg: {
        name: "get-candles",
        version: "2.0",
        body: { active_id: Number(process.env.OPTGO_DEFAULT_ACTIVE_ID ?? 76), ...params },
      },
    }));
    return candlesPromise;
  }

  private async requestAssetCandlesOnce(activeId: number, params: { size: number; duration: number }) {
    await this.ensureConnected();
    if (!this.socket || !this.connected) throw new Error("Sessão OPTGO não está conectada.");
    const requestId = String(++this.sequence);
    const candlesPromise = new Promise<Candle[]>((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pending.delete(requestId);
        reject(new Error("A corretora não respondeu ao pedido de candles."));
      }, REQUEST_TIMEOUT_MS);
      this.pending.set(requestId, { resolve, reject, timer });
    });
    this.socket.send(JSON.stringify({
      name: "sendMessage",
      request_id: requestId,
      msg: { name: "get-candles", version: "2.0", body: { active_id: activeId, ...params } },
    }));
    return candlesPromise;
  }

  async requestAssetCandles(activeId: number, params: { size: number; duration: number }) {
    let lastError: unknown = new Error("Feed OPTGO indisponível.");
    for (let attempt = 0; attempt < 2; attempt += 1) {
      try {
        return await this.requestAssetCandlesOnce(activeId, params);
      } catch (error) {
        lastError = error;
        // A white-label OPTGO can keep the authenticated socket alive while
        // dropping the first RPC after a restart. Reconnect once, then expose
        // the real broker error instead of drawing synthetic market data.
        this.reset(error instanceof Error ? error : new Error("Reconexão OPTGO necessária."));
        if (attempt === 0) await new Promise((resolve) => setTimeout(resolve, 150));
      }
    }
    throw lastError;
  }

  async verify() {
    await this.ensureConnected();
    return { authenticated: true as const };
  }
}

const connection = new OtcBrokerConnection();

export async function verifyBrokerCredentials() {
  const configured = Boolean(process.env.OPTGO_BROKER_SSID?.trim() || (process.env.OPTGO_BROKER_EMAIL?.trim() && process.env.OPTGO_BROKER_PASSWORD?.trim()));
  if (!configured) return { configured: false as const, authenticated: false as const, reason: "credentials_not_configured" as const };
  try {
    await connection.verify();
    return { configured: true as const, authenticated: true as const };
  } catch (error) {
    return { configured: true as const, authenticated: false as const, reason: error instanceof Error ? error.message : "broker_connection_failed" };
  }
}

export async function getMarketSnapshot(assetId: number, count = 120): Promise<MarketSnapshot> {
  const startedAt = Date.now();
  try {
    const candles = (await connection.requestAssetCandles(assetId, ONE_MINUTE_REQUEST)).slice(-count);
    if (candles.length < 23 || !isOneMinute(candles)) {
      return { assetId, candles: [], source: "unavailable", updatedAt: Date.now(), latencyMs: Date.now() - startedAt, error: "A corretora não retornou candles reais de 1 minuto para este ativo." };
    }
    return { assetId, candles, source: "broker", updatedAt: Date.now(), latencyMs: Date.now() - startedAt, candleDurationSeconds: 60 };
  } catch (error) {
    return { assetId, candles: [], source: "unavailable", updatedAt: Date.now(), latencyMs: Date.now() - startedAt, error: error instanceof Error ? error.message : "Feed OPTGO indisponível." };
  }
}

export async function getMarketTick(assetId: number): Promise<MarketTick> {
  try {
    const candles = await connection.requestAssetCandles(assetId, ONE_SECOND_REQUEST);
    const candle = candles.at(-1);
    if (!candle) throw new Error("A corretora não retornou o preço ao vivo.");
    return { assetId, candle, candles: candles.slice(-90), source: "broker", updatedAt: Date.now(), error: null };
  } catch (error) {
    return { assetId, candle: null, source: "unavailable", updatedAt: Date.now(), error: error instanceof Error ? error.message : "Tick OPTGO indisponível." };
  }
}

export { ONE_MINUTE_REQUEST, ONE_SECOND_REQUEST };
