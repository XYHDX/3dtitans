import { prisma } from '@/lib/db';
import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { rateLimit } from '@/lib/rate-limit';
import { validatePassword } from '@/lib/password';

export async function POST(req: Request) {
    try {
        if (!rateLimit(req, 'reset-password', { windowMs: 15 * 60 * 1000, max: 20 }).ok) {
            return NextResponse.json({ error: 'Too many attempts. Please try again later.' }, { status: 429 });
        }

        const { token, password } = await req.json().catch(() => ({}));

        if (!token || typeof token !== 'string' || !password) {
            return NextResponse.json({ error: 'Token and password are required' }, { status: 400 });
        }
        const passwordError = validatePassword(password);
        if (passwordError) {
            return NextResponse.json({ error: passwordError }, { status: 400 });
        }

        // Tokens are stored hashed (see forgot-password).
        const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
        const existingToken = await prisma.passwordResetToken.findUnique({
            where: { token: tokenHash },
        });

        if (!existingToken) {
            return NextResponse.json({ error: 'Invalid or expired link' }, { status: 400 });
        }

        if (new Date() > existingToken.expires) {
            await prisma.passwordResetToken.delete({ where: { token: tokenHash } });
            return NextResponse.json({ error: 'Invalid or expired link' }, { status: 400 });
        }

        const passwordHash = await bcrypt.hash(password, 10);

        await prisma.$transaction([
            prisma.user.update({
                where: { email: existingToken.email },
                data: { passwordHash },
            }),
            // Burn every outstanding token for this email.
            prisma.passwordResetToken.deleteMany({
                where: { email: existingToken.email },
            }),
        ]);

        return NextResponse.json({ message: 'Password reset successfully' });
    } catch (error) {
        console.error('Reset password error:', error);
        return NextResponse.json({ error: 'Failed to reset password' }, { status: 500 });
    }
}
