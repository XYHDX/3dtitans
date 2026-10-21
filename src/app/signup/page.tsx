'use client';

import { Suspense, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Check, Circle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import Link from 'next/link';
import { safeNextPath, useLogin, type AuthErrorCode } from '@/hooks/use-session';
import { useTranslation } from '@/components/language-provider';
import { AUTH_LINK_CLASS, GoogleSignInButton } from '@/components/google-sign-in-button';
import { validatePassword } from '@/lib/password';
import { track } from '@/lib/analytics';
import { cn } from '@/lib/utils';

/**
 * Password rules shown live under the field. Mirrors src/lib/password.ts
 * (validatePassword), which the signup API enforces — keep them in sync.
 */
const PASSWORD_RULES: Array<{ key: string; fallback: string; test: (p: string) => boolean }> = [
  { key: 'signup.ruleLength', fallback: 'At least 8 characters', test: (p) => p.length >= 8 && p.length <= 200 },
  { key: 'signup.ruleLetter', fallback: 'At least one letter', test: (p) => /[A-Za-z]/.test(p) },
  { key: 'signup.ruleNumber', fallback: 'At least one number', test: (p) => /\d/.test(p) },
];

const ERROR_MESSAGES: Record<AuthErrorCode, [string, string]> = {
  exists: ['signup.errorExists', 'An account with this email already exists. Log in, or use "Forgot password".'],
  weak_password: ['signup.errorWeak', 'Please choose a password that meets all the rules below.'],
  invalid_email: ['signup.errorEmail', 'Please enter a valid email address.'],
  invalid_phone: ['signup.errorPhone', 'Please enter a valid phone number, or leave it empty.'],
  too_many: ['authCommon.errorTooMany', 'Too many attempts. Please wait a few minutes and try again.'],
  invalid: ['signup.errorGeneric', "We couldn't create your account. Please try again."],
  unknown: ['signup.errorGeneric', "We couldn't create your account. Please try again."],
};

/** Arabic-Indic / Persian digits → ASCII, so "٠٩٣…" is accepted like "093…". */
const toAsciiDigits = (s: string) => s.replace(/[\u0660-\u0669\u06F0-\u06F9]/g, (d) => String(d.charCodeAt(0) & 0xf));

function SignUpForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [formError, setFormError] = useState<[string, string] | null>(null);
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const { signup } = useLogin();
  const { t } = useTranslation();

  const next = safeNextPath(searchParams.get('next'));
  const nextQuery = next !== '/' ? `?next=${encodeURIComponent(next)}` : '';

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    if (validatePassword(password)) {
      setFormError(ERROR_MESSAGES.weak_password);
      return;
    }
    const phoneNumber = toAsciiDigits(phone.trim());
    if (phoneNumber && !/^\+?[0-9\s\-()]{7,30}$/.test(phoneNumber)) {
      setFormError(ERROR_MESSAGES.invalid_phone);
      return;
    }
    setLoading(true);

    try {
      const result = await signup({
        email,
        password,
        displayName,
        phoneNumber: phoneNumber || undefined,
      });
      if (result.created) track('sign_up', { method: 'email' });
      if (result.ok) {
        toast({
          title: t('signup.toastSuccessTitle', 'Account created!'),
          description: t('signup.toastSuccessDesc', 'Welcome to 3D Titans.'),
        });
        router.replace(next);
      } else if (result.created) {
        // Account exists now but the automatic login didn't go through.
        toast({ title: t('signup.toastCreatedLoginTitle', 'Account created'), description: t('signup.toastCreatedLoginDesc', 'Please log in to continue.') });
        router.replace(`/login${nextQuery}`);
      } else {
        setFormError(ERROR_MESSAGES[result.code || 'unknown']);
      }
    } catch (error) {
      console.error('Signup failed', error);
      setFormError(ERROR_MESSAGES.unknown);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto flex items-center justify-center min-h-[80vh] py-12 px-4 sm:px-6 lg:px-8">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-3xl font-headline">
            <h1>{t('signup.title', 'Create an account')}</h1>
          </CardTitle>
          <CardDescription>{t('signup.subtitle', 'Order 3D prints and track your orders in one place.')}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4">
            {formError && (
              <p role="alert" className="border-[2px] border-destructive p-3 text-sm text-destructive">
                {t(formError[0], formError[1])}
              </p>
            )}
            <form onSubmit={handleSignUp} className="grid gap-4">
              <div className="grid gap-2">
                <Label htmlFor="display-name">{t('signup.name', 'Your name')}</Label>
                <Input
                  id="display-name"
                  type="text"
                  autoComplete="name"
                  required
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  disabled={loading}
                />
              </div>
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
              <div className="grid gap-2">
                <Label htmlFor="phone">
                  {t('signup.phone', 'Phone / WhatsApp')}{' '}
                  <span className="text-muted-foreground font-normal">{t('authCommon.optional', '(optional)')}</span>
                </Label>
                <Input
                  id="phone"
                  type="tel"
                  inputMode="tel"
                  autoComplete="tel"
                  placeholder="09XX XXX XXX"
                  dir="ltr"
                  aria-describedby="phone-help"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  disabled={loading}
                />
                <p id="phone-help" className="text-xs text-muted-foreground">
                  {t('signup.phoneHelp', 'We use it only to arrange delivery of your orders.')}
                </p>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="password">{t('authCommon.password', 'Password')}</Label>
                <Input
                  id="password"
                  type="password"
                  autoComplete="new-password"
                  aria-describedby="password-rules"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={loading}
                />
                <ul id="password-rules" className="grid gap-1 text-xs" aria-live="polite">
                  {PASSWORD_RULES.map((rule) => {
                    const met = rule.test(password);
                    return (
                      <li key={rule.key} className={cn('flex items-center gap-2', met ? 'text-foreground' : 'text-muted-foreground')}>
                        {met ? (
                          <Check className="h-3.5 w-3.5 text-[hsl(var(--pixel-green))]" aria-hidden="true" />
                        ) : (
                          <Circle className="h-3 w-3" aria-hidden="true" />
                        )}
                        <span>{t(rule.key, rule.fallback)}</span>
                        <span className="sr-only">{met ? t('signup.ruleMet', '(done)') : t('signup.ruleNotMet', '(not yet)')}</span>
                      </li>
                    );
                  })}
                </ul>
              </div>
              <Button type="submit" className="w-full mt-2" disabled={loading}>
                {loading ? t('signup.submitting', 'Creating account...') : t('signup.submit', 'Sign up')}
              </Button>
            </form>
            <div className="mt-6 text-center text-sm">
              <p className="text-muted-foreground">
                {t('signup.haveAccount', 'Already have an account?')}{' '}
                <Link href={`/login${nextQuery}`} className={AUTH_LINK_CLASS}>
                  {t('signup.loginLink', 'Log in')}
                </Link>
              </p>
            </div>
          </div>
          <GoogleSignInButton callbackUrl={next} label={t('signup.google', 'Sign up with Google')} />
        </CardContent>
      </Card>
    </div>
  );
}

export default function SignUpPage() {
  // useSearchParams needs a Suspense boundary in the App Router.
  return (
    <Suspense fallback={<div className="min-h-[80vh]" />}>
      <SignUpForm />
    </Suspense>
  );
}
