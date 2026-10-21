import { authOptions } from '@/lib/auth/options';
import { getPaymentSettings } from '@/lib/payments/settings';
import {
  ShamCashEpayError,
  describeShamCashResult,
  getTransactions,
  shamCashCurrencyId,
  shamCashEpayConfigProblem,
  shamCashEpayHost,
} from '@/lib/payments/shamcash-epay';
import { getServerSession } from 'next-auth';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * GET /api/admin/shamcash/status — admin-only "Test connection" for ShamCash e-pay.
 *
 * Sends a harmless getTransactions({ limit: 10 }) — it proves the base URL,
 * agent key and AES secret key all work. Never returns the keys themselves.
 */
export async function GET() {
  const session = await getServerSession(authOptions);
  if (session?.user?.role !== 'admin') {
    return NextResponse.json({ error: 'Admin only' }, { status: 403 });
  }

  let currency = '';
  let enabled = false;
  try {
    const settings = await getPaymentSettings();
    currency = settings.currency;
    enabled = settings.raw['payment.shamCashEpayEnabled'] === 'true';
  } catch {
    // settings are informative only here
  }
  const currencySupported = shamCashCurrencyId(currency) !== null;

  const problem = shamCashEpayConfigProblem();
  if (problem) {
    return NextResponse.json({
      configured: false,
      ok: false,
      enabled,
      currency,
      currencySupported,
      message: `${problem} Set it in the server environment (Vercel → Settings → Environment Variables), then redeploy.`,
    });
  }

  const host = shamCashEpayHost();
  try {
    const page = await getTransactions({ limit: 10 });
    return NextResponse.json({
      configured: true,
      ok: true,
      enabled,
      currency,
      currencySupported,
      host,
      recentTransactions: page.list.length,
      message: `Connected to ${host}. ${page.list.length} recent transaction(s) visible.`,
    });
  } catch (err) {
    const e = err instanceof ShamCashEpayError ? err : null;
    const hint = e ? describeShamCashResult(e.result) : null;
    return NextResponse.json({
      configured: true,
      ok: false,
      enabled,
      currency,
      currencySupported,
      host,
      result: e?.result || null,
      message: hint ? `${hint} (${e?.message})` : e?.message || 'Unexpected error while contacting ShamCash.',
    });
  }
}
