import { reportIngestionStatus, type IngestionSource } from "./ingestionLog.server";

export const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0 Safari/537.36";

const DEFAULT_FETCH_TIMEOUT_MS = 2500;

export async function fetchWithTimeout(
  input: string,
  init: RequestInit = {},
  timeoutMs = DEFAULT_FETCH_TIMEOUT_MS,
): Promise<Response> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    return await fetch(input, { ...init, signal: ctrl.signal });
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Inserts into a plain `Map` used as an in-memory cache layer, evicting the
 * oldest entry (insertion order) once size exceeds `maxSize`. Several
 * providers (asset/classification/HG Brasil/Dados de Mercado caches) keep an
 * unbounded `Map` as their fast layer in front of Firestore — in a
 * long-running server instance tracking thousands of distinct tickers over
 * weeks, that grows without bound. This is a simple FIFO cap, not a true
 * LRU (re-setting an existing key does bump it to "most recent" via the
 * delete+set below, but a plain read/hit does not) — good enough to bound
 * memory without adding a dependency.
 */
export function boundedCacheSet<K, V>(map: Map<K, V>, key: K, value: V, maxSize: number): void {
  map.delete(key);
  map.set(key, value);
  while (map.size > maxSize) {
    const oldestKey = map.keys().next().value;
    if (oldestKey === undefined) break;
    map.delete(oldestKey);
  }
}

/**
 * A bounded, TTL-expiring in-memory Map cache — the "fast layer" shape
 * duplicated across assetCache/hgBrasilClassification/dadosDeMercadoScraper
 * (each: Map lookup, expire-if-stale, bounded insert). `V` must carry its
 * own `cachedAt` since each caller's Firestore layer already persists that
 * field on the same shape it stores in memory.
 */
export interface TtlMemoryCache<V extends { cachedAt: number }> {
  get(key: string, now?: number): V | null;
  set(key: string, value: V): void;
  clear(): void;
}

export function createTtlMemoryCache<V extends { cachedAt: number }>(
  ttlMs: number,
  maxEntries = 5000,
): TtlMemoryCache<V> {
  const map = new Map<string, V>();
  return {
    get(key, now = Date.now()) {
      const entry = map.get(key);
      if (!entry) return null;
      if (now - entry.cachedAt > ttlMs) {
        map.delete(key);
        return null;
      }
      return entry;
    },
    set(key, value) {
      boundedCacheSet(map, key, value, maxEntries);
    },
    clear() {
      map.clear();
    },
  };
}

export const num = (v: unknown): number | null => {
  if (v && typeof v === "object" && "raw" in v) v = (v as { raw: unknown }).raw;
  return typeof v === "number" && Number.isFinite(v) ? v : null;
};

// ---------- Shared per-isolate state (survives HMR) ----------

type HttpState = {
  inflight: Map<string, Promise<unknown>>;
  lastCall: Map<string, number>;
};

const g = globalThis as unknown as { __fuenteHttp?: HttpState };
const state: HttpState =
  g.__fuenteHttp ?? (g.__fuenteHttp = { inflight: new Map(), lastCall: new Map() });

/**
 * Collapse concurrent calls with the same key onto a single in-flight promise.
 * Result is not cached — once the promise settles the entry is cleared. Use
 * TanStack Query for response caching; this only prevents a stampede on the
 * upstream service.
 */
export function dedupeInFlight<T>(
  key: string,
  fn: () => Promise<T>,
): Promise<T> {
  const existing = state.inflight.get(key) as Promise<T> | undefined;
  if (existing) return existing;
  const p = (async () => {
    try {
      return await fn();
    } finally {
      state.inflight.delete(key);
    }
  })();
  state.inflight.set(key, p);
  return p;
}

/** Soft rate limit: ensure at least `ms` between calls for the same key. */
export async function minInterval(key: string, ms: number): Promise<void> {
  const last = state.lastCall.get(key) ?? 0;
  const wait = last + ms - Date.now();
  if (wait > 0) await new Promise((r) => setTimeout(r, wait));
  state.lastCall.set(key, Date.now());
}

/**
 * Sanitizes sensitive query parameters (e.g. key, api_key, token, secret, auth)
 * from URLs or error messages to prevent credential leaks in logs/telemetry.
 */
export function sanitizeLogMessage(message: string): string {
  if (!message || typeof message !== "string") return message;
  return message.replace(/([?&](?:api_?key|key|token|secret|auth)=)[^&\s"']+/gi, '$1[REDACTED]');
}

/**
 * fetchWithTimeout + exponential backoff on 429/5xx/timeout. Retries at most
 * `retries` times with jittered backoff. Non-retryable responses (4xx other
 * than 429) return immediately.
 */
export async function fetchWithRetry(
  input: string,
  source: IngestionSource,
  init: RequestInit = {},
  opts: { timeoutMs?: number; retries?: number; baseDelayMs?: number } = {},
): Promise<Response> {
  const { timeoutMs = DEFAULT_FETCH_TIMEOUT_MS, retries = 2, baseDelayMs = 300 } = opts;
  let attempt = 0;

  while (true) {
    try {
      const r = await fetchWithTimeout(input, init, timeoutMs);
      if (r.ok) {
        reportIngestionStatus(source, "PASSED");
        return r;
      }
      if (attempt >= retries) {
        reportIngestionStatus(source, "FAILED", `HTTP ${r.status}`);
        return r;
      }
      const retryable = r.status === 429 || r.status >= 500;
      if (!retryable) {
        reportIngestionStatus(source, "FAILED", `HTTP ${r.status}`);
        return r;
      }
    } catch (err) {
      if (attempt >= retries) {
        const rawMsg = err instanceof Error ? err.message : String(err);
        reportIngestionStatus(source, "ERROR", sanitizeLogMessage(rawMsg));
        throw err;
      }
    }
    const delay = baseDelayMs * 2 ** attempt + Math.random() * baseDelayMs;
    await new Promise((r) => setTimeout(r, delay));
    attempt++;
  }
}
