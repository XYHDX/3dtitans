import { prisma } from '@/lib/db';
import {
  BILL_STATUS,
  ShamCashJweError,
  decryptPayload,
  isShamCashEpayConfigured,
} from '@/lib/payments/shamcash-epay';
import { applyBillStatus } from '@/lib/payments/shamcash-epay-service';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const MAX_BODY_BYTES = 100_000;

/**
 * POST /api/payments/shamcash/webhook   (ShamCash → us, no session)
 *
 * Body: { "encData": "<Direct JWE>" }. Decrypted payload:
 *   { billNo, tranId, statusId (4 = paid, 3 = expired), iat, exp }
 *
 * The JWE is authenticated with our AES key (AES-GCM tag) and its exp is
 * enforced, so only ShamCash can produce a valid call. Processing is
 * idempotent (ShamCash retries); we must answer 200 within 10 seconds.
 */
export async function POST(req: Request) {
  const text = await req.text().catch(() => '');
  if (!text || text.length > MAX_BODY_BYTES) {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 });
  }
  let encData: unknown;
  try {
    encData = JSON.parse(text)?.encData;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }
  if (typeof encData !== 'string' || !encData) {
    return NextResponse.json({ error: 'encData required' }, { status: 400 });
  }

  if (!isShamCashEpayConfigured()) {
    // 503 so ShamCash retries once the env vars are fixed.
    console.error('[shamcash] webhook: received a call but ShamCash e-pay is not configured on this server');
    return NextResponse.json({ error: 'Not configured' }, { status: 503 });
  }

  let payload: Record<string, unknown>;
  try {
    payload = decryptPayload(encData);
  } catch (err) {
    if (err instanceof ShamCashJweError) {
      const unauthorized = err.reason === 'auth_failed' || err.reason === 'expired' || err.reason === 'not_yet_valid';
      console.warn(`[shamcash] webhook rejected: ${err.reason} — ${err.message}`);
      return NextResponse.json({ error: unauthorized ? 'Unauthorized' : 'Malformed encData' }, { status: unauthorized ? 401 : 400 });
    }
    console.error('[shamcash] webhook: unexpected decrypt error', err instanceof Error ? err.message : err);
    return NextResponse.json({ error: 'Malformed encData' }, { status: 400 });
  }

  const billNo = typeof payload.billNo === 'string' ? payload.billNo.trim() : '';
  const statusId = Number(payload.statusId);
  if (!billNo || billNo.length > 100 || !Number.isInteger(statusId)) {
    console.warn('[shamcash] webhook: authenticated payload without a valid billNo/statusId');
    return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
  }

  try {
    const attempt = await prisma.paymentAttempt.findUnique({ where: { billNo } });
    if (!attempt) {
      console.warn(`[shamcash] webhook: unknown billNo ${billNo} (statusId ${statusId}) — ignored`);
      return NextResponse.json({ ok: true, ignored: true });
    }
    if (statusId !== BILL_STATUS.PAID && statusId !== BILL_STATUS.EXPIRED) {
      console.warn(`[shamcash] webhook: bill ${billNo} sent statusId ${statusId} — ignored`);
      return NextResponse.json({ ok: true, ignored: true });
    }

    const { outcome } = await applyBillStatus(attempt, { statusId, tranId: payload.tranId }, 'webhook');
    console.info(`[shamcash] webhook: bill ${billNo} statusId ${statusId} → ${outcome}`);
    return NextResponse.json({ ok: true });
  } catch (err) {
    // 500 → ShamCash retries later; applyBillStatus is idempotent.
    console.error(`[shamcash] webhook: processing bill ${billNo} failed`, err);
    return NextResponse.json({ error: 'Processing failed' }, { status: 500 });
  }
}
