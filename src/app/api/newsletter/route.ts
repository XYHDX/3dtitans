import { prisma } from '@/lib/db';
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/options';
import { rateLimit } from '@/lib/rate-limit';

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

  const subs = await prisma.newsletterSubscription.findMany({
    orderBy: { subscribedAt: 'desc' },
  });
  return NextResponse.json({ subscriptions: subs.map(mapSub) });
}

export async function POST(req: Request) {
  const limited = rateLimit(req, 'newsletter', { windowMs: 10 * 60 * 1000, max: 30 });
  if (!limited.ok) {
    return NextResponse.json({ error: 'Too many requests. Please try again later.' }, { status: 429 });
  }
  const body = await req.json();
  const email = (body.email || '').toLowerCase().trim();
  if (!email) return NextResponse.json({ error: 'Email is required' }, { status: 400 });

  const existing = await prisma.newsletterSubscription.findUnique({ where: { email } });
  if (existing) return NextResponse.json({ subscription: mapSub(existing) });

  const sub = await prisma.newsletterSubscription.create({ data: { email } });
  return NextResponse.json({ subscription: mapSub(sub) });
}
