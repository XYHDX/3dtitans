import { createClient } from '@supabase/supabase-js';

/**
 * Service-role Supabase client for server routes (storage only).
 * Never import from client components.
 */
export function getStorageAdminClient() {
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
}

export const PROOF_BUCKET = 'payment-proofs';

/**
 * Parse a Supabase Storage object URL on THIS project and return the object
 * path inside the payment-proofs bucket, or null if it isn't one.
 * Accepts the public / sign / authenticated URL variants.
 */
export function proofObjectPath(raw: unknown): string | null {
  if (typeof raw !== 'string' || raw.length === 0 || raw.length > 2048) return null;
  let url: URL;
  let projectHost: string;
  try {
    url = new URL(raw);
    projectHost = new URL(process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || '').host;
  } catch {
    return null;
  }
  if (url.protocol !== 'https:' || !projectHost || url.host !== projectHost) return null;
  const m = url.pathname.match(/^\/storage\/v1\/object\/(?:public|sign|authenticated)\/payment-proofs\/(.+)$/);
  if (!m) return null;
  const path = decodeURIComponent(m[1]);
  if (path.includes('..')) return null;
  return path;
}
