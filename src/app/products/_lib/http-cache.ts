/** Cache-Control values for the public catalog API (safe to import anywhere on the server). */

/** Anonymous catalog responses may be served from Vercel's CDN. */
export const PUBLIC_CACHE_CONTROL = 'public, s-maxage=60, stale-while-revalidate=300';
/** Anything that depends on the session (dashboards, drafts) must never be shared. */
export const PRIVATE_CACHE_CONTROL = 'private, no-store';
