import { prisma } from '@/lib/db';
import { NextResponse } from 'next/server';

/**
 * GET /api/payments/settings — public payment configuration.
 *
 * Returns which methods are enabled and the customer-facing details
 * (bank/wallet numbers). Admin-only fields (Stripe secrets etc.) live
 * in env vars and are never sent.
 */
export async function GET() {
  try {
    const rows = await prisma.siteSetting.findMany({
      where: { key: { startsWith: 'payment.' } },
    });
    const map: Record<string, string> = {};
    rows.forEach((r) => (map[r.key] = r.value));
    return NextResponse.json({ settings: map });
  } catch (err) {
    console.error('payments/settings GET', err);
    return NextResponse.json({ settings: {}, error: 'Failed to load settings' }, { status: 500 });
  }
}
