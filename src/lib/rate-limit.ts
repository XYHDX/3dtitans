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
  const id = `${key}:${getIdentifier(req)}`;
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
