'use client';

import { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import Link from 'next/link';
import { useTranslation } from '@/components/language-provider';
import { AUTH_LINK_CLASS } from '@/components/google-sign-in-button';
import { validatePassword } from '@/lib/password';

const WEAK: [string, string] = ['resetPw.errorWeak', 'Password must be at least 8 characters and include a letter and a number.'];

function ResetPasswordForm() {
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [formError, setFormError] = useState<[string, string] | null>(null);
    const router = useRouter();
    const searchParams = useSearchParams();
    const { toast } = useToast();
    const { t } = useTranslation();

    const token = searchParams.get('token');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setFormError(null);

        if (!token) {
            setFormError(['resetPw.errorLink', 'This reset link is invalid or has expired. Please request a new one.']);
            return;
        }

        if (password !== confirmPassword) {
            setFormError(['resetPw.errorMismatch', 'Passwords do not match.']);
            return;
        }

        if (validatePassword(password)) {
            setFormError(WEAK);
            return;
        }

        setLoading(true);

        try {
            const res = await fetch('/api/auth/reset-password', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ token, password }),
            });

            if (!res.ok) {
                const data = await res.json().catch(() => null);
                console.warn('Reset password failed:', res.status, data?.error);
                const raw = String(data?.error || '').toLowerCase();
                setFormError(
                    res.status === 429
                        ? ['authCommon.errorTooMany', 'Too many attempts. Please wait a few minutes and try again.']
                        : res.status === 400 && raw.includes('password')
                        ? WEAK
                        : res.status === 400
                        ? ['resetPw.errorLink', 'This reset link is invalid or has expired. Please request a new one.']
                        : ['resetPw.errorGeneric', "We couldn't reset your password right now. Please try again."]
                );
                return;
            }

            toast({
                title: t('resetPw.toastSuccessTitle', 'Password changed'),
                description: t('resetPw.toastSuccessDesc', 'Your password has been reset. Please log in.'),
            });
            router.push('/login');
        } catch (error) {
            console.error('Reset password failed', error);
            setFormError(['resetPw.errorGeneric', "We couldn't reset your password right now. Please try again."]);
        } finally {
            setLoading(false);
        }
    };

    if (!token) {
        return (
            <div className="text-center">
                <p className="text-destructive font-medium mb-4">{t('resetPw.missingToken', 'This reset link is invalid or incomplete.')}</p>
                <Link href="/forgot-password" className={AUTH_LINK_CLASS}>
                    {t('resetPw.requestNew', 'Request a new link')}
                </Link>
            </div>
        );
    }

    return (
        <form onSubmit={handleSubmit} className="grid gap-4">
            {formError && (
                <p role="alert" className="border-[2px] border-destructive p-3 text-sm text-destructive">
                    {t(formError[0], formError[1])}
                    {formError[0] === 'resetPw.errorLink' && (
                        <>
                            {' '}
                            <Link href="/forgot-password" className={AUTH_LINK_CLASS}>
                                {t('resetPw.requestNew', 'Request a new link')}
                            </Link>
                        </>
                    )}
                </p>
            )}
            <div className="grid gap-2">
                <Label htmlFor="password">{t('resetPw.newPassword', 'New password')}</Label>
                <Input
                    id="password"
                    type="password"
                    autoComplete="new-password"
                    aria-describedby="password-help"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={loading}
                />
                <p id="password-help" className="text-xs text-muted-foreground">
                    {t('resetPw.rules', 'At least 8 characters, with at least one letter and one number.')}
                </p>
            </div>
            <div className="grid gap-2">
                <Label htmlFor="confirmPassword">{t('resetPw.confirmPassword', 'Confirm password')}</Label>
                <Input
                    id="confirmPassword"
                    type="password"
                    autoComplete="new-password"
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    disabled={loading}
                />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
                {loading ? t('resetPw.submitting', 'Resetting...') : t('resetPw.submit', 'Reset password')}
            </Button>
        </form>
    );
}

function ResetPasswordCard() {
    const { t } = useTranslation();
    return (
        <div className="container mx-auto flex items-center justify-center min-h-[80vh] py-12 px-4 sm:px-6 lg:px-8">
            <Card className="w-full max-w-md">
                <CardHeader className="text-center">
                    <CardTitle className="text-3xl font-headline">
                        <h1>{t('resetPw.title', 'Reset password')}</h1>
                    </CardTitle>
                    <CardDescription>{t('resetPw.subtitle', 'Enter your new password below.')}</CardDescription>
                </CardHeader>
                <CardContent>
                    <Suspense fallback={<div className="h-40" aria-busy="true" />}>
                        <ResetPasswordForm />
                    </Suspense>
                </CardContent>
            </Card>
        </div>
    );
}

export default function ResetPasswordPage() {
    return <ResetPasswordCard />;
}
