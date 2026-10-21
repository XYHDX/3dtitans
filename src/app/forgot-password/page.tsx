'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import Link from 'next/link';
import { useTranslation } from '@/components/language-provider';
import { AUTH_LINK_CLASS } from '@/components/google-sign-in-button';

export default function ForgotPasswordPage() {
    const [email, setEmail] = useState('');
    const [loading, setLoading] = useState(false);
    const [submitted, setSubmitted] = useState(false);
    const [formError, setFormError] = useState<[string, string] | null>(null);
    const { t } = useTranslation();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setFormError(null);

        try {
            const res = await fetch('/api/auth/forgot-password', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email }),
            });

            if (!res.ok) {
                const data = await res.json().catch(() => null);
                console.warn('Forgot password failed:', res.status, data?.error);
                setFormError(
                    res.status === 429
                        ? ['authCommon.errorTooMany', 'Too many attempts. Please wait a few minutes and try again.']
                        : ['forgotPw.errorGeneric', "We couldn't send the reset email right now. Please try again in a few minutes."]
                );
                return;
            }

            setSubmitted(true);
        } catch (error) {
            console.error('Forgot password failed', error);
            setFormError(['forgotPw.errorGeneric', "We couldn't send the reset email right now. Please try again in a few minutes."]);
        } finally {
            setLoading(false);
        }
    };

    if (submitted) {
        return (
            <div className="container mx-auto flex items-center justify-center min-h-[80vh] py-12 px-4 sm:px-6 lg:px-8">
                <Card className="w-full max-w-md">
                    <CardHeader className="text-center">
                        <CardTitle className="text-3xl font-headline">
                            <h1>{t('forgotPw.sentTitle', 'Check your email')}</h1>
                        </CardTitle>
                        <CardDescription role="status">
                            {t('forgotPw.sentDesc', 'If an account exists for {email}, we have sent it a password reset link.', { email })}
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="flex flex-col gap-4">
                        <div className="text-sm text-center text-muted-foreground">
                            {t('forgotPw.sentHelp', "Didn't receive it? Check your spam folder or try again in a few minutes.")}
                        </div>
                        <Button asChild className="w-full">
                            <Link href="/login">{t('forgotPw.backToLogin', 'Back to login')}</Link>
                        </Button>
                    </CardContent>
                </Card>
            </div>
        );
    }

    return (
        <div className="container mx-auto flex items-center justify-center min-h-[80vh] py-12 px-4 sm:px-6 lg:px-8">
            <Card className="w-full max-w-md">
                <CardHeader className="text-center">
                    <CardTitle className="text-3xl font-headline">
                        <h1>{t('forgotPw.title', 'Forgot password')}</h1>
                    </CardTitle>
                    <CardDescription>{t('forgotPw.subtitle', 'Enter your email and we will send you a link to reset your password.')}</CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSubmit} className="grid gap-4">
                        {formError && (
                            <p role="alert" className="border-[2px] border-destructive p-3 text-sm text-destructive">
                                {t(formError[0], formError[1])}
                            </p>
                        )}
                        <div className="grid gap-2">
                            <Label htmlFor="email">{t('authCommon.email', 'Email')}</Label>
                            <Input
                                id="email"
                                type="email"
                                autoComplete="email"
                                placeholder="you@example.com"
                                dir="ltr"
                                required
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                disabled={loading}
                            />
                        </div>
                        <Button type="submit" className="w-full" disabled={loading}>
                            {loading ? t('forgotPw.submitting', 'Sending...') : t('forgotPw.submit', 'Send reset link')}
                        </Button>
                        <div className="text-center text-sm">
                            <Link href="/login" className={AUTH_LINK_CLASS}>
                                {t('forgotPw.backToLogin', 'Back to login')}
                            </Link>
                        </div>
                    </form>
                </CardContent>
            </Card>
        </div>
    );
}
