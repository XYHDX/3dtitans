/**
 * ShamCash Electronic Payment (e-pay) client — SERVER ONLY.
 *
 * Guarded by `server-only`: importing it (directly or through another module)
 * from a 'use client' file fails the build, because it reads the AES secret
 * key. Client code should only use the API routes under /api/payments/shamcash/*.
 *
 * Implements "ShamCashEPayDoc v1.0.0":
 *   POST {baseUrl}/api/ElectronicPayment/createBill
 *   POST {baseUrl}/api/ElectronicPayment/getBillInfo
 *   POST {baseUrl}/api/ElectronicPayment/refundBill
 *   POST {baseUrl}/api/ElectronicPayment/getTransactions
 * Request body: { encData: <Direct JWE (dir + A256GCM)>, agentKey }.
 * Responses are cleartext JSON { result, succeeded, data, message } — HTTP 200
 * does NOT mean success; result 2500 does.
 *
 * Env vars (Vercel → Settings → Environment Variables):
 *   SHAMCASH_BASE_URL    sandbox: https://dev.shamlogix.tech/services
 *   SHAMCASH_AGENT_KEY   identifies the partner (3D Titans)
 *   SHAMCASH_SECRET_KEY  Base64 of exactly 32 random bytes (the AES-256 key)
 */

import 'server-only';
import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';

export const SHAMCASH_EPAY_PROVIDER = 'sham_cash_epay';
export const SHAMCASH_EPAY_REFUND_PROVIDER = 'sham_cash_epay_refund';

/** Application result codes (doc §7.1). */
export const SHAMCASH_RESULT = {
  SUCCESS: 2500,
  GENERAL_ERROR: 1000,
  BALANCE_NOT_ENOUGH: 1304,
  RECEIVER_BLOCKED: 1322,
  CUSTOM_VALIDATION: 1700,
  AGENT_KEY_INVALID: 1701,
  AGENT_NOT_ACTIVE: 1702,
  BILL_NOT_FOUND: 1703,
  BILL_NO_EXISTS: 1704,
  ENC_DATA_INVALID: 1705,
  ACCOUNT_BLOCKED: 1706,
  ORIGIN_BILL_NOT_PAID: 1707,
  REFUND_EXCEEDS_REMAINING: 1708,
} as const;

/** Bill status ids (doc §6.3 "Bill Status Codes"). */
export const BILL_STATUS = {
  PENDING: 1,
  REFUNDED: 2,
  EXPIRED: 3,
  PAID: 4,
  PARTLY_REFUNDED: 5,
} as const;

/** Bills expire on the ShamCash side 10 minutes after creation. */
export const BILL_LIFETIME_MS = 10 * 60 * 1000;

const REQUEST_TIMEOUT_MS = 15_000;
/** Lifetime of the encData we send (doc: "set exp to 5 minutes after iat"). */
const TOKEN_TTL_SEC = 300;
/** Clock-skew allowances when validating tokens we RECEIVE. */
const EXP_LEEWAY_SEC = 60;
const IAT_FUTURE_LEEWAY_SEC = 300;
const MAX_TOKEN_LENGTH = 64 * 1024;

/** Exactly the header the doc prescribes; also the AES-GCM AAD (as ASCII). */
const JWE_HEADER_JSON = '{"alg":"dir","enc":"A256GCM","cty":"json"}';
const JWE_HEADER_B64 = Buffer.from(JWE_HEADER_JSON, 'utf8').toString('base64url');

// ---------------------------------------------------------------------------
// Errors
// ---------------------------------------------------------------------------

export type ShamCashErrorKind = 'not_configured' | 'invalid_request' | 'network' | 'http' | 'bad_response' | 'api';

/**
 * Any failure talking to ShamCash. `result` is the ShamCash application code
 * (e.g. 1704) when the API answered, or 0 for transport/config problems.
 * Messages never contain keys.
 */
export class ShamCashEpayError extends Error {
  readonly result: number;
  readonly kind: ShamCashErrorKind;
  readonly httpStatus?: number;

  constructor(result: number, message: string, opts: { kind: ShamCashErrorKind; httpStatus?: number }) {
    super(message);
    this.name = 'ShamCashEpayError';
    this.result = result;
    this.kind = opts.kind;
    this.httpStatus = opts.httpStatus;
  }

  /** True when the request may never have reached ShamCash (safe to retry with the same billNo / idempotencyKey). */
  get retryable(): boolean {
    return this.kind === 'network' || (this.kind === 'http' && [502, 503, 504].includes(this.httpStatus || 0));
  }
}

export type JweErrorReason = 'malformed' | 'unsupported_header' | 'auth_failed' | 'expired' | 'not_yet_valid' | 'bad_payload';

/** A JWE we received could not be accepted. */
export class ShamCashJweError extends Error {
  readonly reason: JweErrorReason;
  constructor(reason: JweErrorReason, message: string) {
    super(message);
    this.name = 'ShamCashJweError';
    this.reason = reason;
  }
}

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

type EpayConfig = { baseUrl: string; agentKey: string; key: Buffer };

/** Decode a Base64 (or Base64url) string strictly; returns null on any garbage. */
function decodeBase64Strict(input: string): Buffer | null {
  const s = input.replace(/\s+/g, '').replace(/-/g, '+').replace(/_/g, '/');
  if (!s || !/^[A-Za-z0-9+/]+={0,2}$/.test(s)) return null;
  const buf = Buffer.from(s, 'base64');
  // Round-trip check so characters Node silently skips can't sneak through.
  if (buf.toString('base64').replace(/=+$/, '') !== s.replace(/=+$/, '')) return null;
  return buf;
}

function isLocalHost(hostname: string) {
  return hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '[::1]' || hostname === '::1';
}

function readConfig(): { config: EpayConfig; problem: null } | { config: null; problem: string } {
  const rawBase = (process.env.SHAMCASH_BASE_URL || '').trim().replace(/\/+$/, '');
  const agentKey = (process.env.SHAMCASH_AGENT_KEY || '').trim();
  const secret = (process.env.SHAMCASH_SECRET_KEY || '').trim();

  if (!rawBase || !agentKey || !secret) {
    const missing = [
      !rawBase && 'SHAMCASH_BASE_URL',
      !agentKey && 'SHAMCASH_AGENT_KEY',
      !secret && 'SHAMCASH_SECRET_KEY',
    ].filter(Boolean);
    return { config: null, problem: `Missing server environment variable(s): ${missing.join(', ')}.` };
  }

  let url: URL;
  try {
    url = new URL(rawBase);
  } catch {
    return { config: null, problem: 'SHAMCASH_BASE_URL is not a valid URL.' };
  }
  const allowHttp = isLocalHost(url.hostname) && process.env.NODE_ENV !== 'production';
  if (url.protocol !== 'https:' && !(allowHttp && url.protocol === 'http:')) {
    return { config: null, problem: 'SHAMCASH_BASE_URL must use https://.' };
  }

  const key = decodeBase64Strict(secret);
  if (!key || key.length !== 32) {
    return { config: null, problem: 'SHAMCASH_SECRET_KEY must be the Base64 encoding of exactly 32 bytes (the AES-256 key ShamCash issued).' };
  }

  return { config: { baseUrl: rawBase, agentKey, key }, problem: null };
}

/** True when base URL, agent key and a valid 32-byte secret key are all present. */
export function isShamCashEpayConfigured(): boolean {
  return readConfig().config !== null;
}

/** Human-readable reason the integration is not configured (never contains secrets), or null. */
export function shamCashEpayConfigProblem(): string | null {
  return readConfig().problem;
}

/** Host of the configured base URL (e.g. "dev.shamlogix.tech"), for admin diagnostics. */
export function shamCashEpayHost(): string | null {
  const { config } = readConfig();
  if (!config) return null;
  try {
    return new URL(config.baseUrl).host;
  } catch {
    return null;
  }
}

function requireConfig(): EpayConfig {
  const { config, problem } = readConfig();
  if (!config) throw new ShamCashEpayError(0, `ShamCash e-pay is not configured: ${problem}`, { kind: 'not_configured' });
  return config;
}

// ---------------------------------------------------------------------------
// Currency / amounts
// ---------------------------------------------------------------------------

export type ShamCashCurrencyId = 1 | 2;

/** USD → 1, SYP → 2; anything else is not supported by ShamCash e-pay. */
export function shamCashCurrencyId(currency: string | null | undefined): ShamCashCurrencyId | null {
  const c = (currency || '').trim().toUpperCase();
  if (c === 'USD') return 1;
  if (c === 'SYP') return 2;
  return null;
}

/** Round to 2 decimals (DECIMAL(18,2)). */
export function roundAmount(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

/** True when `n` has at most 2 decimal digits. */
export function hasAtMostTwoDecimals(n: number): boolean {
  return Number.isFinite(n) && Math.abs(n * 100 - Math.round(n * 100)) < 1e-6;
}

// ---------------------------------------------------------------------------
// Direct JWE (alg "dir", enc "A256GCM") — doc §5
// ---------------------------------------------------------------------------

type CryptoOpts = { key?: Buffer; nowSec?: number };

const nowSeconds = () => Math.floor(Date.now() / 1000);

/**
 * Build `encData`: the JSON of `payload` plus `iat` (now) and `exp` (now + 300 s),
 * encrypted with AES-256-GCM, AAD = ASCII of the encoded header, random 12-byte
 * IV, 16-byte tag, empty encrypted-key segment:
 *   {header}..{iv}.{ciphertext}.{tag}
 */
export function encryptPayload(payload: Record<string, unknown>, opts: CryptoOpts = {}): string {
  const key = opts.key ?? requireConfig().key;
  if (key.length !== 32) throw new Error('AES-256 key must be 32 bytes');
  const iat = opts.nowSec ?? nowSeconds();
  const plaintext = Buffer.from(JSON.stringify({ ...payload, iat, exp: iat + TOKEN_TTL_SEC }), 'utf8');

  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', key, iv, { authTagLength: 16 });
  cipher.setAAD(Buffer.from(JWE_HEADER_B64, 'ascii'));
  const ciphertext = Buffer.concat([cipher.update(plaintext), cipher.final()]);
  const tag = cipher.getAuthTag();

  return [JWE_HEADER_B64, '', iv.toString('base64url'), ciphertext.toString('base64url'), tag.toString('base64url')].join('.');
}

const B64URL_RE = /^[A-Za-z0-9_-]*$/;

/**
 * Validate and decrypt a Direct JWE from ShamCash (e.g. the webhook's encData).
 * Throws ShamCashJweError when the token is malformed, uses another algorithm,
 * fails authentication (wrong key / tampered), is expired (exp < now − 60 s) or
 * claims to be issued in the future (iat > now + 300 s).
 */
export function decryptPayload<T extends Record<string, unknown> = Record<string, unknown>>(
  token: string,
  opts: CryptoOpts = {}
): T & { iat: number; exp: number } {
  if (typeof token !== 'string' || !token || token.length > MAX_TOKEN_LENGTH) {
    throw new ShamCashJweError('malformed', 'encData is missing or too large');
  }
  const parts = token.trim().split('.');
  if (parts.length !== 5) throw new ShamCashJweError('malformed', 'encData is not a compact JWE');
  const [headerB64, encryptedKey, ivB64, ctB64, tagB64] = parts;
  if (encryptedKey !== '') throw new ShamCashJweError('unsupported_header', 'Direct JWE must have an empty encrypted-key segment');
  if (![headerB64, ivB64, ctB64, tagB64].every((p) => B64URL_RE.test(p)) || !headerB64 || !ivB64 || !tagB64) {
    throw new ShamCashJweError('malformed', 'encData contains invalid base64url segments');
  }

  let header: any;
  try {
    header = JSON.parse(Buffer.from(headerB64, 'base64url').toString('utf8'));
  } catch {
    throw new ShamCashJweError('malformed', 'JWE header is not valid JSON');
  }
  if (!header || typeof header !== 'object' || header.alg !== 'dir' || header.enc !== 'A256GCM') {
    throw new ShamCashJweError('unsupported_header', 'JWE header must be alg "dir" / enc "A256GCM"');
  }
  if (header.zip !== undefined || header.crit !== undefined) {
    throw new ShamCashJweError('unsupported_header', 'JWE header uses unsupported "zip"/"crit" parameters');
  }

  const iv = Buffer.from(ivB64, 'base64url');
  const tag = Buffer.from(tagB64, 'base64url');
  const ciphertext = Buffer.from(ctB64, 'base64url');
  if (iv.length !== 12 || tag.length !== 16) throw new ShamCashJweError('malformed', 'JWE IV must be 12 bytes and tag 16 bytes');

  const key = opts.key ?? requireConfig().key;
  let plaintext: Buffer;
  try {
    const decipher = createDecipheriv('aes-256-gcm', key, iv, { authTagLength: 16 });
    decipher.setAAD(Buffer.from(headerB64, 'ascii'));
    decipher.setAuthTag(tag);
    plaintext = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
  } catch {
    throw new ShamCashJweError('auth_failed', 'JWE authentication failed (wrong key or tampered token)');
  }

  let payload: any;
  try {
    payload = JSON.parse(plaintext.toString('utf8'));
  } catch {
    throw new ShamCashJweError('bad_payload', 'Decrypted payload is not JSON');
  }
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    throw new ShamCashJweError('bad_payload', 'Decrypted payload is not a JSON object');
  }

  const now = opts.nowSec ?? nowSeconds();
  const exp = Number(payload.exp);
  const iat = Number(payload.iat);
  if (payload.exp === null || payload.exp === undefined || !Number.isFinite(exp)) {
    throw new ShamCashJweError('bad_payload', 'Payload has no valid "exp" claim');
  }
  if (payload.iat === null || payload.iat === undefined || !Number.isFinite(iat)) {
    throw new ShamCashJweError('bad_payload', 'Payload has no valid "iat" claim');
  }
  if (exp < now - EXP_LEEWAY_SEC) throw new ShamCashJweError('expired', 'Token has expired');
  if (iat > now + IAT_FUTURE_LEEWAY_SEC) throw new ShamCashJweError('not_yet_valid', 'Token "iat" is in the future');

  return { ...payload, iat, exp };
}

// ---------------------------------------------------------------------------
// HTTP
// ---------------------------------------------------------------------------

/** tranIds are LONGs — keep big ones as strings so JSON.parse can't round them. */
function parseJsonPreservingLongIds(text: string): any {
  return JSON.parse(text.replace(/("(?:tranId|lastReturnedTranId)"\s*:\s*)(\d{16,})/g, '$1"$2"'));
}

async function call<T>(endpoint: 'createBill' | 'getBillInfo' | 'refundBill' | 'getTransactions', params: Record<string, unknown>): Promise<T> {
  const config = requireConfig();
  const encData = encryptPayload(params, { key: config.key });

  let res: Response;
  try {
    res = await fetch(`${config.baseUrl}/api/ElectronicPayment/${endpoint}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ encData, agentKey: config.agentKey }),
      cache: 'no-store',
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
  } catch (err: any) {
    const reason = err?.name === 'TimeoutError' ? 'timed out' : err?.cause?.code || err?.name || 'network error';
    throw new ShamCashEpayError(0, `Could not reach ShamCash (${endpoint}: ${reason}).`, { kind: 'network' });
  }

  const text = await res.text().catch(() => '');
  let body: any = null;
  try {
    body = text ? parseJsonPreservingLongIds(text) : null;
  } catch {
    body = null;
  }

  if (!res.ok) {
    const result = Number(body?.result) || 0;
    const message = typeof body?.message === 'string' && body.message ? body.message : `ShamCash returned HTTP ${res.status} for ${endpoint}.`;
    throw new ShamCashEpayError(result, message, { kind: 'http', httpStatus: res.status });
  }
  if (!body || typeof body !== 'object' || typeof body.result !== 'number') {
    throw new ShamCashEpayError(0, `ShamCash returned an unexpected response for ${endpoint}.`, { kind: 'bad_response', httpStatus: res.status });
  }
  if (body.result !== SHAMCASH_RESULT.SUCCESS || body.succeeded !== true) {
    throw new ShamCashEpayError(body.result, String(body.message || `ShamCash error ${body.result}`), { kind: 'api', httpStatus: res.status });
  }
  return (body.data ?? null) as T;
}

// ---------------------------------------------------------------------------
// Endpoints
// ---------------------------------------------------------------------------

export type ShamCashRefund = {
  tranId: number | string;
  amount: number;
  createdDate: string;
  createdTime: string;
  rem?: string | null;
};

export type ShamCashBill = {
  statusId: number;
  statusName: string;
  billNo: string;
  amount: number;
  currencyId: number;
  createdDate: string;
  createdTime: string;
  tranId: number | string | null;
  paymentUrl: string;
  rem?: string | null;
  refunds: ShamCashRefund[];
};

export type ShamCashTransaction = {
  billNo: string;
  amount: number;
  currencyId: number;
  createdDate: string;
  createdTime: string;
  tranId: number | string;
  tranTypeId: 1 | 2 | number;
  tranType: string;
};

export type ShamCashTransactionsPage = {
  list: ShamCashTransaction[];
  hasMore: boolean;
  lastReturnedTranId: number | string | null;
};

function invalid(message: string): never {
  throw new ShamCashEpayError(SHAMCASH_RESULT.CUSTOM_VALIDATION, message, { kind: 'invalid_request' });
}

function checkBillNo(billNo: string) {
  if (typeof billNo !== 'string' || !billNo.trim() || billNo.length > 100) invalid('billNo is required (max 100 characters).');
}

function checkUrl(name: string, value: string) {
  if (typeof value !== 'string' || value.length > 500) invalid(`${name} must be at most 500 characters.`);
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    invalid(`${name} must be an absolute URL.`);
  }
  const allowHttp = isLocalHost(url.hostname) && process.env.NODE_ENV !== 'production';
  if (url.protocol !== 'https:' && !(allowHttp && url.protocol === 'http:')) invalid(`${name} must use https://.`);
}

function checkPositiveAmount(amount: number): number {
  if (!Number.isFinite(amount) || !hasAtMostTwoDecimals(amount)) invalid('amount must have at most 2 decimals.');
  const rounded = roundAmount(amount);
  if (rounded < 0.01) invalid('amount must be at least 0.01.');
  return rounded;
}

function normalizeBill(data: any): ShamCashBill {
  if (!data || typeof data !== 'object') {
    throw new ShamCashEpayError(0, 'ShamCash returned no bill data.', { kind: 'bad_response' });
  }
  return {
    ...data,
    statusId: Number(data.statusId),
    amount: Number(data.amount),
    currencyId: Number(data.currencyId),
    tranId: data.tranId === undefined || data.tranId === '' ? null : data.tranId,
    paymentUrl: typeof data.paymentUrl === 'string' ? data.paymentUrl : '',
    refunds: Array.isArray(data.refunds) ? data.refunds : [],
  };
}

/** createBill — doc §6.1. Always starts as statusId 1 / pending with a paymentUrl. */
export async function createBill(params: {
  billNo: string;
  amount: number;
  currencyId: ShamCashCurrencyId;
  callbackUrl: string;
  redirectUrl: string;
  note?: string;
}): Promise<ShamCashBill> {
  checkBillNo(params.billNo);
  const amount = checkPositiveAmount(params.amount);
  if (params.currencyId !== 1 && params.currencyId !== 2) invalid('currencyId must be 1 (USD) or 2 (SYP).');
  checkUrl('callbackUrl', params.callbackUrl);
  checkUrl('redirectUrl', params.redirectUrl);
  const note = params.note?.trim().slice(0, 250);

  const data = await call<any>('createBill', {
    billNo: params.billNo,
    amount,
    currencyId: params.currencyId,
    callbackUrl: params.callbackUrl,
    redirectUrl: params.redirectUrl,
    ...(note ? { note } : {}),
  });
  return normalizeBill(data);
}

/**
 * getBillInfo — doc §6.2. ShamCash asks integrators NOT to poll this: use it
 * once, ≥ 10 minutes after creation, only when no webhook arrived.
 */
export async function getBillInfo(billNo: string): Promise<ShamCashBill> {
  checkBillNo(billNo);
  return normalizeBill(await call<any>('getBillInfo', { billNo }));
}

/**
 * refundBill — doc §6.3. Success-only idempotency: when a refund fails or
 * times out, retry with the SAME idempotencyKey.
 */
export async function refundBill(params: {
  billNo: string;
  amount: number;
  idempotencyKey: string;
  note?: string;
}): Promise<{ tranId: string }> {
  checkBillNo(params.billNo);
  const amount = checkPositiveAmount(params.amount);
  const key = typeof params.idempotencyKey === 'string' ? params.idempotencyKey : '';
  if (key.length < 10 || key.length > 100) invalid('idempotencyKey must be 10–100 characters.');
  const note = params.note?.trim().slice(0, 250);

  const data = await call<any>('refundBill', {
    billNo: params.billNo,
    amount,
    idempotencyKey: key,
    ...(note ? { note } : {}),
  });
  if (data?.tranId === undefined || data?.tranId === null || data?.tranId === '') {
    throw new ShamCashEpayError(0, 'ShamCash accepted the refund but returned no tranId.', { kind: 'bad_response' });
  }
  return { tranId: String(data.tranId) };
}

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

/** getTransactions — doc §6.4. Cursor pagination on afterTranId. */
export async function getTransactions(params: {
  fromDate?: string;
  toDate?: string;
  afterTranId?: number | string;
  limit?: number;
} = {}): Promise<ShamCashTransactionsPage> {
  if (params.fromDate !== undefined && !DATE_RE.test(params.fromDate)) invalid('fromDate must be yyyy-MM-dd.');
  if (params.toDate !== undefined && !DATE_RE.test(params.toDate)) invalid('toDate must be yyyy-MM-dd.');
  const after = String(params.afterTranId ?? 0);
  if (!/^\d{1,30}$/.test(after)) invalid('afterTranId must contain digits only.');
  const limit = Math.min(2500, Math.max(10, Math.floor(Number(params.limit ?? 500)) || 500));

  const data = await call<any>('getTransactions', {
    ...(params.fromDate ? { fromDate: params.fromDate } : {}),
    ...(params.toDate ? { toDate: params.toDate } : {}),
    // Send as a number when it is safely representable (the doc's examples do).
    afterTranId: Number.isSafeInteger(Number(after)) ? Number(after) : after,
    limit,
  });
  return {
    list: Array.isArray(data?.list) ? data.list : [],
    hasMore: data?.hasMore === true,
    lastReturnedTranId: data?.lastReturnedTranId ?? null,
  };
}

/** Admin-facing explanation for a ShamCash result code (never shown to customers verbatim). */
export function describeShamCashResult(result: number): string | null {
  switch (result) {
    case SHAMCASH_RESULT.GENERAL_ERROR: return 'ShamCash internal error — try again later.';
    case SHAMCASH_RESULT.BALANCE_NOT_ENOUGH: return 'Your ShamCash business balance is too low.';
    case SHAMCASH_RESULT.RECEIVER_BLOCKED: return "The customer's ShamCash account is blocked from receiving funds.";
    case SHAMCASH_RESULT.CUSTOM_VALIDATION: return 'ShamCash rejected the request data.';
    case SHAMCASH_RESULT.AGENT_KEY_INVALID: return 'SHAMCASH_AGENT_KEY is wrong.';
    case SHAMCASH_RESULT.AGENT_NOT_ACTIVE: return 'Your ShamCash agent is not active — contact ShamCash support.';
    case SHAMCASH_RESULT.BILL_NOT_FOUND: return 'Bill not found at ShamCash.';
    case SHAMCASH_RESULT.BILL_NO_EXISTS: return 'This bill number was already used.';
    case SHAMCASH_RESULT.ENC_DATA_INVALID: return 'ShamCash could not decrypt the request — SHAMCASH_SECRET_KEY is probably wrong (or the server clock is off).';
    case SHAMCASH_RESULT.ACCOUNT_BLOCKED: return 'Your ShamCash account is blocked — contact ShamCash support.';
    case SHAMCASH_RESULT.ORIGIN_BILL_NOT_PAID: return 'The bill is not paid (or not refundable).';
    case SHAMCASH_RESULT.REFUND_EXCEEDS_REMAINING: return 'The refund is larger than what is left on the bill.';
    default: return null;
  }
}
