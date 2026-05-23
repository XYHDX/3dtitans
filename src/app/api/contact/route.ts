import { prisma } from '@/lib/db';
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/options';
import { rateLimit } from '@/lib/rate-limit';

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

  const submissions = await prisma.contactSubmission.findMany({
    orderBy: { createdAt: 'desc' },
  });
  return NextResponse.json({ submissions: submissions.map(mapSubmission) });
}

export async function POST(req: Request) {
  const limited = rateLimit(req, 'contact', { windowMs: 10 * 60 * 1000, max: 20 });
  if (!limited.ok) {
    return NextResponse.json({ error: 'Too many requests. Please try again later.' }, { status: 429 });
  }
  const body = await req.json();
  const { name, email, subject, message } = body;
  if (!name || !email || !subject || !message) {
    return NextResponse.json({ error: 'All fields are required' }, { status: 400 });
  }

  const submission = await prisma.contactSubmission.create({
    data: { name, email, subject, message },
  });

  return NextResponse.json({ submission: mapSubmission(submission) });
}
