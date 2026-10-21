import { prisma } from '@/lib/db';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

/**
 * GET /api/health — for an external uptime monitor.
 * 200 when the app can reach the database within 2 seconds, 503 otherwise.
 * Reveals nothing beyond up/down and latency.
 */
export async function GET() {
  const started = Date.now();
  try {
    await Promise.race([
      prisma.$queryRaw`SELECT 1`,
      new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 2000)),
    ]);
    return NextResponse.json(
      { ok: true, db: 'up', latencyMs: Date.now() - started },
      { headers: { 'Cache-Control': 'no-store' } }
    );
  } catch {
    return NextResponse.json(
      { ok: false, db: 'down', latencyMs: Date.now() - started },
      { status: 503, headers: { 'Cache-Control': 'no-store' } }
    );
  }
}
