import { prisma } from '@/lib/db';
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/options';
import { rateLimit } from '@/lib/rate-limit';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

/** The admin list shows the newest subscribers. */
const MAX_LISTED = 5000;

const subscribeSchema = z.object({
  email: z.string().trim().max(254).email(),
  // Honeypot: a hidden field real visitors never fill in.
  website: z.string().max(500).optional(),
});

function mapSub(sub: any) {
  return {
    id: sub.id,
    email: sub.email,
    subscribedAt: sub.subscribedAt,
  };
}

export async function GET() {
  const session = await getServerSession(authOptions);
  const user = session?.user;
  if (!user || user.role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const subs = await prisma.newsletterSubscription.findMany({
      orderBy: { subscribedAt: 'desc' },
      take: MAX_LISTED,
    });
    return NextResponse.json({ subscriptions: subs.map(mapSub), truncated: subs.length === MAX_LISTED });
  } catch (err) {
    console.error('newsletter GET', err);
    return NextResponse.json({ error: 'Failed to load subscribers' }, { status: 500 });
  }
}

/**
 * POST /api/newsletter { email, website? }
 *
 * Always answers the same way for a valid email — new, already subscribed or
 * honeypot — so the endpoint can't be used to find out who is subscribed.
 * (`subscription.email` is only echoed back for the existing footer form.)
 */
export async function POST(req: Request) {
  const limited = rateLimit(req, 'newsletter', { windowMs: 10 * 60 * 1000, max: 30 });
  if (!limited.ok) {
    return NextResponse.json({ error: 'Too many requests. Please try again later.' }, { status: 429 });
  }
  const body = await req.json().catch(() => null);
  const parsed = subscribeSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Please enter a valid email address.' }, { status: 400 });
  }
  const email = parsed.data.email.toLowerCase();
  const generic = NextResponse.json({ ok: true, subscription: { email } });

  if (parsed.data.website && parsed.data.website.trim()) return generic;

  try {
    await prisma.newsletterSubscription.create({ data: { email } });
  } catch (err: any) {
    // Already subscribed (unique email) → same answer as a new subscription.
    if (err?.code !== 'P2002') {
      console.error('newsletter POST', err);
      return NextResponse.json({ error: 'Could not subscribe right now. Please try again later.' }, { status: 500 });
    }
  }
  return generic;
}
