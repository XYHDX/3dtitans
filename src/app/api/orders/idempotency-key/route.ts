import { authOptions } from '@/lib/auth/options';
import { getServerSession } from 'next-auth';
import { NextResponse } from 'next/server';
import { randomUUID } from 'crypto';

// Force dynamic — keys must be fresh on every request, never cached
export const dynamic = 'force-dynamic';
export const revalidate = 0;

/**
 * GET /api/orders/idempotency-key
 *
 * Returns a fresh cryptographically-random UUID that the client sends with
 * the next /api/orders POST. The POST handler uses it to detect duplicate
 * submissions (double-click, network retry, browser back/forward) and
 * return the existing order instead of creating another one.
 *
 * Auth-gated so anonymous traffic can't spam keys, but the key itself is
 * not tied to a user identity — uniqueness comes from UUID randomness.
 */
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: 'Login required' }, { status: 401 });
  }
  return NextResponse.json(
    { idempotencyKey: randomUUID() },
    { headers: { 'Cache-Control': 'no-store, max-age=0, must-revalidate' } }
  );
}
