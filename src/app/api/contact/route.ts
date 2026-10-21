import { prisma } from '@/lib/db';
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/options';
import { rateLimit } from '@/lib/rate-limit';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

/** The admin inbox shows the newest messages. */
const MAX_LISTED = 500;

const contactSchema = z.object({
  name: z.string().trim().min(1).max(100),
  email: z.string().trim().max(254).email(),
  subject: z.string().trim().min(1).max(200),
  message: z.string().trim().min(1).max(5000),
  // Honeypot: a hidden field real visitors never fill in.
  website: z.string().max(500).optional(),
});

function mapSubmission(submission: any) {
  return {
    id: submission.id,
    name: submission.name,
    email: submission.email,
    subject: submission.subject,
    message: submission.message,
    createdAt: submission.createdAt,
  };
}

export async function GET() {
  const session = await getServerSession(authOptions);
  const user = session?.user;
  if (!user || user.role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const submissions = await prisma.contactSubmission.findMany({
      orderBy: { createdAt: 'desc' },
      take: MAX_LISTED,
    });
    return NextResponse.json({ submissions: submissions.map(mapSubmission), truncated: submissions.length === MAX_LISTED });
  } catch (err) {
    console.error('contact GET', err);
    return NextResponse.json({ error: 'Failed to load messages' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const limited = rateLimit(req, 'contact', { windowMs: 10 * 60 * 1000, max: 20 });
  if (!limited.ok) {
    return NextResponse.json({ error: 'Too many requests. Please try again later.' }, { status: 429 });
  }
  try {
    const body = await req.json().catch(() => null);
    const parsed = contactSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Please fill in every field (name up to 100 characters, a valid email, subject up to 200, message up to 5000).' },
        { status: 400 }
      );
    }
    const { name, email, subject, message, website } = parsed.data;

    // A bot filled the honeypot: pretend it worked, store nothing.
    if (website && website.trim()) {
      return NextResponse.json({ ok: true, submission: { id: '', name, email, subject, message, createdAt: new Date() } });
    }

    const submission = await prisma.contactSubmission.create({
      data: { name, email: email.toLowerCase(), subject, message },
    });

    return NextResponse.json({ ok: true, submission: mapSubmission(submission) });
  } catch (err) {
    console.error('contact POST', err);
    return NextResponse.json({ error: 'Could not send your message. Please try again later.' }, { status: 500 });
  }
}
