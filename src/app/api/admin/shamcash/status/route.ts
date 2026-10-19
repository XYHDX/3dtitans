import { authOptions } from '@/lib/auth/options';
import { isShamCashApiConfigured, listShamCashAccounts, ShamCashError } from '@/lib/payments/shamcash';
import { getServerSession } from 'next-auth';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

/**
 * GET /api/admin/shamcash/status — admin-only "Test connection".
 * Calls GET /accounts on the Sham Cash API and reports whether the keys work
 * and the subscription is active. Never returns the keys themselves.
 */
export async function GET() {
  const session = await getServerSession(authOptions);
  if (session?.user?.role !== 'admin') {
    return NextResponse.json({ error: 'Admin only' }, { status: 403 });
  }
  if (!isShamCashApiConfigured()) {
    return NextResponse.json({
      configured: false,
      ok: false,
      message: 'Set SHAMCASH_BASE_URL and SHAMCASH_SECRET_KEY in the server environment, then redeploy.',
    });
  }
  try {
    const accounts = await listShamCashAccounts();
    return NextResponse.json({
      configured: true,
      ok: accounts.some((a) => a.status === 'active'),
      accounts: accounts.map((a) => ({
        id: a.id,
        name: a.name || '',
        address: a.address || null,
        status: a.status,
        subscriptionExpiresAt: a.subscription_expires_at || null,
      })),
      message: accounts.length ? undefined : 'Connected, but no Sham Cash wallet is linked to this API account.',
    });
  } catch (err) {
    const e = err instanceof ShamCashError ? err : new ShamCashError('UNKNOWN', String(err));
    return NextResponse.json({ configured: true, ok: false, code: e.code, message: e.message });
  }
}
