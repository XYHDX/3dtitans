import { prisma } from '@/lib/db';
import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';

export async function POST(req: Request) {
    try {
        const { token, password } = await req.json();

        if (!token || !password) {
            return NextResponse.json({ error: 'Token and password are required' }, { status: 400 });
        }

        const existingToken = await prisma.passwordResetToken.findUnique({
            where: { token },
        });

        if (!existingToken) {
            return NextResponse.json({ error: 'Invalid token' }, { status: 400 });
        }

        if (new Date() > existingToken.expires) {
            await prisma.passwordResetToken.delete({ where: { token } });
            return NextResponse.json({ error: 'Token expired' }, { status: 400 });
        }

        const passwordHash = await bcrypt.hash(password, 10);

        // Update user password
        await prisma.user.update({
            where: { email: existingToken.email },
            data: { passwordHash },
        });

        // Delete token and potentially all other tokens for this email
        await prisma.passwordResetToken.deleteMany({
            where: { email: existingToken.email },
        });

        return NextResponse.json({ message: 'Password reset successfully' });
    } catch (error) {
        console.error('Reset password error:', error);
        return NextResponse.json({ error: 'Failed to reset password' }, { status: 500 });
    }
}
