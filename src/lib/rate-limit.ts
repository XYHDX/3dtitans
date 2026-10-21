type RateLimitBucket = {
  hits: number[];
  windowMs: number;
};

const buckets = new Map<string, RateLimitBucket>();

type Options = {
  windowMs: number;
  max: number;
};

/** Sweep expired buckets at most this often, so the map can't grow forever. */
const PRUNE_EVERY_MS = 60 * 1000;
/** Hard ceiling: if an attacker floods us with unique keys, start over rather than run out of memory. */
const MAX_BUCKETS = 50_000;
let lastPrune = 0;

function prune(now: number) {
  if (now - lastPrune < PRUNE_EVERY_MS && buckets.size < MAX_BUCKETS) return;
  lastPrune = now;
  buckets.forEach((bucket, id) => {
    const newest = bucket.hits[bucket.hits.length - 1];
    if (newest === undefined || now - newest >= bucket.windowMs) buckets.delete(id);
  });
  if (buckets.size >= MAX_BUCKETS) buckets.clear();
}

type HeaderSource = Request | { headers?: Headers | Record<string, unknown> | null } | null | undefined;

function readHeader(source: HeaderSource, name: string): string {
  const headers = source?.headers as Headers | Record<string, unknown> | null | undefined;
  if (!headers) return '';
  if (typeof (headers as Headers).get === 'function') return (headers as Headers).get(name) || '';
  const value = (headers as Record<string, unknown>)[name];
  if (Array.isArray(value)) return String(value[0] ?? '');
  return typeof value === 'string' ? value : '';
}

/**
 * Best-effort client IP. On Vercel `x-vercel-forwarded-for` is set by the edge
 * and can't be spoofed by the client; elsewhere the first `x-forwarded-for`
 * hop, then `x-real-ip`. Accepts a fetch Request or a NextAuth-style
 * `{ headers: Record<string, string> }` object.
 */
export function clientIp(source: HeaderSource): string {
  const first = (v: string) => v.split(',')[0]?.trim() || '';
  return (
    first(readHeader(source, 'x-vercel-forwarded-for')) ||
    first(readHeader(source, 'x-forwarded-for')) ||
    readHeader(source, 'x-real-ip').trim() ||
    'anon'
  );
}

/** Rate-limit per client IP for one action (`key`, e.g. 'signup'). */
export function rateLimit(req: Request, key: string, opts: Options): { ok: boolean; retryAfter?: number } {
  return rateLimitByKey(`${key}:${clientIp(req)}`, opts);
}

/**
 * Rate-limit on an arbitrary key (e.g. `login:<email>`, `orders:<userId>`).
 *
 * NOTE: buckets live in this server instance's memory, so on Vercel each
 * instance counts separately. It still stops naive brute-force loops; move to
 * a shared store (e.g. Upstash Redis) or Vercel Firewall rate-limit rules if
 * you need a hard global limit.
 */
export function rateLimitByKey(id: string, opts: Options): { ok: boolean; retryAfter?: number } {
  const now = Date.now();
  prune(now);

  const bucket = buckets.get(id) || { hits: [], windowMs: opts.windowMs };
  bucket.windowMs = opts.windowMs;

  // drop old hits
  bucket.hits = bucket.hits.filter((t) => now - t < opts.windowMs);

  if (bucket.hits.length >= opts.max) {
    const retryAfter = opts.windowMs - (now - bucket.hits[0]);
    buckets.set(id, bucket);
    return { ok: false, retryAfter };
  }

  bucket.hits.push(now);
  buckets.set(id, bucket);
  return { ok: true };
}
