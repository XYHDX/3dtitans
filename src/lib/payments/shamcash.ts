/**
 * Sham Cash API client (server-only).
 *
 * Implements the HTTP API documented at https://shamcash-api.com/en/docs (v1):
 *   GET /accounts       — linked Sham Cash accounts + subscription status
 *   GET /transactions   — INCOMING transfers (transaction_id, amount, currency,
 *                         occurred_at, sender_name, note, …)
 * Every response is an envelope: { status, code, message, data }.
 *
 * Env vars (set them in .env.local and in Vercel → Settings → Environment Variables):
 *   SHAMCASH_BASE_URL     e.g. https://api.shamcash-api.com/v1
 *   SHAMCASH_SECRET_KEY   the secret API token — sent as "Authorization: Bearer <token>"
 *   SHAMCASH_AGENT_KEY    the agent key your provider issued (kept for the provider's
 *                         auth scheme; see buildAuthHeaders below)
 *   SHAMCASH_ACCOUNT_ID   optional — only needed if more than one wallet is linked
 *
 * The API is READ-ONLY: it can see money that arrived, it cannot move money.
 * NEVER import this file from client components — the keys must stay on the server.
 */

export type ShamCashTransaction = {
  transaction_id: number | string;
  amount: number;
  currency: { id: number; code: string };
  occurred_at: string;
  receiver_name?: string;
  sender_name?: string;
  sender_address?: string;
  note?: string;
};

export type ShamCashAccount = {
  id: string;
  name?: string;
  address?: string | null;
  status: 'active' | 'inactive' | string;
  subscription_expires_at?: string | null;
};

export class ShamCashError extends Error {
  constructor(public code: string, message: string, public httpStatus?: number) {
    super(message);
    this.name = 'ShamCashError';
  }
}

/** Currency ids used by the Sham Cash API. */
const COIN_IDS: Record<string, number> = { USD: 1, SYP: 2, EUR: 3 };

export function shamCashCoinId(currency: string): number | undefined {
  return COIN_IDS[(currency || '').trim().toUpperCase()];
}

function config() {
  return {
    baseUrl: (process.env.SHAMCASH_BASE_URL || '').trim().replace(/\/+$/, ''),
    secretKey: (process.env.SHAMCASH_SECRET_KEY || '').trim(),
    agentKey: (process.env.SHAMCASH_AGENT_KEY || '').trim(),
    accountId: (process.env.SHAMCASH_ACCOUNT_ID || '').trim(),
  };
}

export function isShamCashApiConfigured(): boolean {
  const c = config();
  return !!c.baseUrl && !!c.secretKey;
}

/**
 * The only place that knows how to authenticate. The published docs use a single
 * Bearer token; if your provider documents a different scheme for the
 * Agent Key + Secret Key pair (e.g. a signature header), change only this function.
 */
function buildAuthHeaders(): Record<string, string> {
  const c = config();
  const headers: Record<string, string> = {
    Authorization: `Bearer ${c.secretKey}`,
    Accept: 'application/json',
  };
  return headers;
}

async function request<T>(path: string, params: Record<string, string | number | undefined> = {}): Promise<T> {
  const c = config();
  if (!c.baseUrl || !c.secretKey) {
    throw new ShamCashError('NOT_CONFIGURED', 'Sham Cash API is not configured (SHAMCASH_BASE_URL / SHAMCASH_SECRET_KEY).');
  }
  let url: URL;
  try {
    url = new URL(c.baseUrl + path);
  } catch {
    throw new ShamCashError('NOT_CONFIGURED', 'SHAMCASH_BASE_URL is not a valid URL.');
  }
  const isLocal = ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname);
  if (url.protocol !== 'https:' && !(isLocal && process.env.NODE_ENV !== 'production')) {
    throw new ShamCashError('NOT_CONFIGURED', 'SHAMCASH_BASE_URL must use https.');
  }
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== '') url.searchParams.set(k, String(v));
  }

  let res: Response;
  try {
    res = await fetch(url, {
      headers: buildAuthHeaders(),
      cache: 'no-store',
      signal: AbortSignal.timeout(15_000),
    });
  } catch (err: any) {
    throw new ShamCashError('NETWORK_ERROR', `Could not reach the Sham Cash API: ${err?.message || err}`);
  }

  let body: any = null;
  try {
    body = await res.json();
  } catch {
    throw new ShamCashError('BAD_RESPONSE', `Sham Cash API returned a non-JSON response (HTTP ${res.status}).`, res.status);
  }
  if (!res.ok || body?.status !== 'success') {
    throw new ShamCashError(
      String(body?.code || `HTTP_${res.status}`),
      String(body?.message || `Sham Cash API error (HTTP ${res.status}).`),
      res.status
    );
  }
  return body.data as T;
}

export async function listShamCashAccounts(): Promise<ShamCashAccount[]> {
  const data = await request<ShamCashAccount[] | ShamCashAccount>('/accounts');
  return Array.isArray(data) ? data : data ? [data] : [];
}

/**
 * Damascus-time ISO timestamp with an explicit offset — the API interprets
 * values without an offset as Asia/Damascus, so always send one.
 */
function isoWithOffset(d: Date): string {
  return d.toISOString().replace('Z', '+00:00');
}

export async function listShamCashTransactions(opts: {
  since?: Date;
  currency?: string;
  transactionIds?: Array<string | number>;
  limit?: number;
}): Promise<ShamCashTransaction[]> {
  const c = config();
  const data = await request<{ transactions?: ShamCashTransaction[] }>('/transactions', {
    account_id: c.accountId || undefined,
    start_at: opts.since ? isoWithOffset(opts.since) : undefined,
    coin_id: opts.currency ? shamCashCoinId(opts.currency) : undefined,
    transaction_ids: opts.transactionIds?.length ? opts.transactionIds.join(',') : undefined,
    limit: opts.limit ?? 200,
  });
  return Array.isArray(data?.transactions) ? data.transactions : [];
}
