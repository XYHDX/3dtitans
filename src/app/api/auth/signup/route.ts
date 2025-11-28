import { prisma } from '@/lib/db';
import bcrypt from 'bcryptjs';
import { NextResponse } from 'next/server';
import { rateLimit } from '@/lib/rate-limit';

export async function POST(req: Request) {
  try {
    const limited = rateLimit(req, 'signup', { windowMs: 10 * 60 * 1000, max: 10 });
    if (!limited.ok) {
      return NextResponse.json({ error: 'Too many signup attempts. Please try again later.' }, { status: 429 });
    }

    const body = await req.json();
    const email = (body.email || '').toLowerCase().trim();
    const password: string = body.password || '';
    const name: string = body.name || body.displayName || '';
    const seededRoles: Record<string, 'admin' | 'store-owner' | 'user'> = {
      'admin@3dtitans.com': 'admin',
      'owner@3dtitans.com': 'store-owner',
      'yahyademeriah@gmail.com': 'admin',
      'aboude.murad@gmail.com': 'store-owner',
    };

    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password are required' }, { status: 400 });
    }
    const hasMinLength = password.length >= 8;
    const hasLetter = /[A-Za-z]/.test(password);
    const hasNumber = /\d/.test(password);
    if (!hasMinLength || !hasLetter || !hasNumber) {
      return NextResponse.json(
        { error: 'Password must be at least 8 characters and include a letter and a number.' },
        { status: 400 }
      );
    }

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return NextResponse.json({ error: 'Email already registered' }, { status: 409 });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
      data: {
        email,
        name: name || email.split('@')[0],
        passwordHash,
        role: seededRoles[email] || 'user',
      },
    });

    return NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
    });
  } catch (error) {
    console.error('Signup error', error);
    return NextResponse.json({ error: 'Unable to sign up right now' }, { status: 500 });
  }
}
