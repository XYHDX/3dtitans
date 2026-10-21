import { prisma } from '@/lib/db';
import bcrypt from 'bcryptjs';
import { NextResponse } from 'next/server';
import { rateLimit } from '@/lib/rate-limit';
import { validatePassword } from '@/lib/password';

/**
 * POST /api/auth/signup  body: { email, password, name?, phoneNumber? }
 *
 * Creates a NEW customer account. Every account starts with role 'user' —
 * roles are only ever changed by an admin. An email that is already
 * registered is rejected: signup must never overwrite an existing account's
 * password (that would let anyone take over any account, including admins).
 */
export async function POST(req: Request) {
  try {
    const limited = rateLimit(req, 'signup', { windowMs: 10 * 60 * 1000, max: 60 });
    if (!limited.ok) {
      return NextResponse.json({ error: 'Too many signup attempts. Please try again later.' }, { status: 429 });
    }

    const body = await req.json().catch(() => ({}));
    const email = String(body.email || '').toLowerCase().trim();
    const password: string = typeof body.password === 'string' ? body.password : '';
    const name = String(body.name || body.displayName || '').trim().slice(0, 100);
    // Optional phone: Arabic-Indic / Persian digits (٠٩٣… / ۰۹۳…) become 093…
    const phoneNumber = typeof body.phoneNumber === 'string'
      ? body.phoneNumber.trim().replace(/[\u0660-\u0669\u06F0-\u06F9]/g, (d: string) => String(d.charCodeAt(0) & 0xf))
      : '';

    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password are required' }, { status: 400 });
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254) {
      return NextResponse.json({ error: 'Please enter a valid email address.' }, { status: 400 });
    }
    const passwordError = validatePassword(password);
    if (passwordError) {
      return NextResponse.json({ error: passwordError }, { status: 400 });
    }
    if (phoneNumber && (!/^\+?[0-9 ]+$/.test(phoneNumber) || phoneNumber.length < 7 || phoneNumber.length > 20)) {
      return NextResponse.json({ error: 'Please enter a valid phone number.', code: 'invalid_phone' }, { status: 400 });
    }

    const existing = await prisma.user.findUnique({ where: { email }, select: { id: true } });
    if (existing) {
      return NextResponse.json(
        { error: 'An account with this email already exists. Log in, or use "Forgot password".' },
        { status: 409 }
      );
    }

    const passwordHash = await bcrypt.hash(password, 10);
    try {
      const user = await prisma.user.create({
        data: {
          email,
          name: name || email.split('@')[0],
          passwordHash,
          role: 'user',
          phoneNumber: phoneNumber || null,
        },
      });
      return NextResponse.json({
        user: { id: user.id, email: user.email, name: user.name, role: user.role },
      });
    } catch (error: any) {
      // Two simultaneous signups for the same email — the unique index wins.
      if (error?.code === 'P2002') {
        return NextResponse.json({ error: 'An account with this email already exists.' }, { status: 409 });
      }
      throw error;
    }
  } catch (error) {
    console.error('Signup error', error);
    return NextResponse.json({ error: 'Unable to sign up right now' }, { status: 500 });
  }
}
