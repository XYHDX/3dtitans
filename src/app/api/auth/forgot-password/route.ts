import { prisma } from '@/lib/db';
import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { rateLimit, rateLimitByKey } from '@/lib/rate-limit';
import { sendEmail, escapeHtml } from '@/lib/email';

const GENERIC_OK = { message: 'If an account exists, an email has been sent.' };

export async function POST(req: Request) {
    try {
        if (!rateLimit(req, 'forgot-password', { windowMs: 15 * 60 * 1000, max: 10 }).ok) {
            return NextResponse.json({ error: 'Too many requests. Please try again later.' }, { status: 429 });
        }

        const body = await req.json().catch(() => ({}));
        const email = String(body?.email || '').toLowerCase().trim();
        if (!email) {
            return NextResponse.json({ error: 'Email is required' }, { status: 400 });
        }
        // Per-address cap so nobody can flood one inbox with reset emails.
        if (!rateLimitByKey(`forgot-password:${email}`, { windowMs: 60 * 60 * 1000, max: 3 }).ok) {
            return NextResponse.json(GENERIC_OK);
        }

        const user = await prisma.user.findUnique({ where: { email } });
        if (!user) {
            // Same response whether or not the account exists (no email enumeration).
            return NextResponse.json(GENERIC_OK);
        }

        // Only a SHA-256 hash of the token is stored, so a database leak does
        // not hand out working reset links.
        const token = crypto.randomBytes(32).toString('hex');
        const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
        const expires = new Date(Date.now() + 3600 * 1000); // 1 hour

        await prisma.passwordResetToken.create({
            data: { email, token: tokenHash, expires },
        });

        const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://3dtitans.org';
        const resetUrl = `${appUrl}/reset-password?token=${token}`;

        const sent = await sendEmail({
            to: email,
            subject: 'Reset your password',
            html: `
            <h1>Reset your password</h1>
            <p>Click the link below to reset your password. It expires in 1 hour.</p>
            <a href="${escapeHtml(resetUrl)}">${escapeHtml(resetUrl)}</a>
            <p>If you didn't request this, please ignore this email.</p>`,
        });
        if (!sent && process.env.NODE_ENV !== 'production') {
            console.warn('Email not configured. Password reset link:', resetUrl);
        }

        return NextResponse.json(GENERIC_OK);
    } catch (error: any) {
        console.error('Forgot password error:', error);
        return NextResponse.json({ error: 'Failed to send reset email' }, { status: 500 });
    }
}
