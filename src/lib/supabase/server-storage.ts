import 'server-only';
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

export type StorageAdminClient = NonNullable<ReturnType<typeof getStorageAdminClient>>;

export const PROOF_BUCKET = 'payment-proofs';
export const MODEL_BUCKET = 'model-uploads';

/**
 * Parse a Supabase Storage object URL on THIS project and return the object
 * path inside `bucket`, or null if it isn't one.
 * Accepts the public / sign / authenticated URL variants.
 */
export function storageObjectPath(raw: unknown, bucket: string): string | null {
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
  const prefix = `/storage/v1/object/`;
  if (!url.pathname.startsWith(prefix)) return null;
  const rest = url.pathname.slice(prefix.length);
  const m = rest.match(/^(?:public|sign|authenticated)\/([^/]+)\/(.+)$/);
  if (!m || m[1] !== bucket) return null;
  let path: string;
  try {
    path = decodeURIComponent(m[2]);
  } catch {
    return null;
  }
  if (path.includes('..')) return null;
  return path;
}

/** Object path inside the payment-proofs bucket, or null. */
export function proofObjectPath(raw: unknown): string | null {
  return storageObjectPath(raw, PROOF_BUCKET);
}

/** Object path inside the model-uploads bucket, or null. */
export function modelObjectPath(raw: unknown): string | null {
  return storageObjectPath(raw, MODEL_BUCKET);
}

/**
 * Size and type of a stored object, or null when it does not exist.
 * Uses `list` on the parent folder (supported by every Storage version).
 */
export async function statStorageObject(
  client: StorageAdminClient,
  bucket: string,
  path: string
): Promise<{ size: number; mimetype: string } | null> {
  const slash = path.lastIndexOf('/');
  const folder = slash === -1 ? '' : path.slice(0, slash);
  const name = slash === -1 ? path : path.slice(slash + 1);
  const { data, error } = await client.storage.from(bucket).list(folder, { search: name, limit: 20 });
  if (error) throw error;
  const obj = (data || []).find((o) => o.name === name);
  if (!obj || !obj.id) return null; // folders have no id
  const meta = (obj.metadata || {}) as Record<string, unknown>;
  return {
    size: Number(meta.size ?? meta.contentLength ?? 0),
    mimetype: String(meta.mimetype || ''),
  };
}
