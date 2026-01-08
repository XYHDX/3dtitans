import { prisma } from '@/lib/db';
import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { Resend } from 'resend';

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

export async function POST(req: Request) {
    try {
        const { email } = await req.json();

        if (!email) {
            return NextResponse.json({ error: 'Email is required' }, { status: 400 });
        }

        const user = await prisma.user.findUnique({ where: { email } });
        if (!user) {
            // Return ok even if user doesn't exist to prevent email enumeration
            return NextResponse.json({ message: 'If an account exists, an email has been sent.' });
        }

        // Generate token
        const token = crypto.randomBytes(32).toString('hex');
        const expires = new Date(Date.now() + 3600 * 1000); // 1 hour

        await prisma.passwordResetToken.create({
            data: {
                email,
                token,
                expires,
            },
        });

        const resetUrl = `${process.env.NEXT_PUBLIC_APP_URL}/reset-password?token=${token}`;

        if (resend) {
            await resend.emails.send({
                from: '3D Titans <noreply@3dtitans.org>',
                to: email,
                subject: 'Reset your password',
                html: `
            <h1>Reset your password</h1>
            <p>Click the link below to reset your password:</p>
            <a href="${resetUrl}">${resetUrl}</a>
            <p>If you didn't request this, please ignore this email.</p>
        `,
            });
        } else {
            console.warn('RESEND_API_KEY not set. Password reset link:', resetUrl);
        }

        return NextResponse.json({ message: 'Email sent' });
    } catch (error: any) {
        console.error('Forgot password error:', error);
        return NextResponse.json({ error: error.message || 'Failed to send reset email' }, { status: 500 });
    }
}
