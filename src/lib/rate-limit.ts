type RateLimitBucket = {
  hits: number[];
};

const buckets = new Map<string, RateLimitBucket>();

type Options = {
  windowMs: number;
  max: number;
};

function getIdentifier(req: Request) {
  // Try common proxy headers; fall back to anonymous.
  const forwarded = req.headers.get('x-forwarded-for') || '';
  const ip = forwarded.split(',')[0]?.trim() || req.headers.get('x-real-ip') || 'anon';
  const ua = req.headers.get('user-agent') || '';
  return `${ip}:${ua}`;
}

export function rateLimit(req: Request, key: string, opts: Options): { ok: boolean; retryAfter?: number } {
  return rateLimitByKey(`${key}:${getIdentifier(req)}`, opts);
}

/**
 * Rate-limit on an arbitrary key (e.g. `login:<email>`, `orders:<userId>`).
 *
 * NOTE: buckets live in this server instance's memory, so on Vercel each
 * instance counts separately. It still stops naive brute-force loops; move to
 * a shared store (e.g. Upstash Redis) if you need a hard global limit.
 */
export function rateLimitByKey(id: string, opts: Options): { ok: boolean; retryAfter?: number } {
  const now = Date.now();
  const bucket = buckets.get(id) || { hits: [] };

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
