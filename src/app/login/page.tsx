'use client';

import { Suspense, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import Link from 'next/link';
import { safeNextPath, useLogin } from '@/hooks/use-session';
import { useTranslation } from '@/components/language-provider';
import { AUTH_LINK_CLASS, GoogleSignInButton } from '@/components/google-sign-in-button';

/** NextAuth sends `?error=<code>` back to the sign-in page; show a friendly message instead. */
function authErrorKey(code: string | null): [string, string] | null {
  if (!code) return null;
  switch (code) {
    case 'CredentialsSignin':
      return ['login.errorInvalid', 'Wrong email or password. Please try again.'];
    case 'OAuthAccountNotLinked':
      return ['login.errorNotLinked', 'This email is already registered with a password. Log in with your email and password instead.'];
    case 'SessionRequired':
      return ['login.errorSessionRequired', 'Please log in to continue.'];
    case 'AccessDenied':
      return ['login.errorAccessDenied', 'Sign-in was cancelled or is not allowed for this account.'];
    case 'OAuthSignin':
    case 'OAuthCallback':
    case 'OAuthCreateAccount':
    case 'Callback':
      return ['login.errorGoogle', "Google sign-in didn't work. Please try again, or log in with your email and password."];
    default:
      return ['login.errorGeneric', 'Sign-in failed. Please try again.'];
  }
}

function LoginForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const { login } = useLogin();
  const { t } = useTranslation();

  // Where to go after login: ?next= (our middleware / cart) or NextAuth's ?callbackUrl=.
  const next = safeNextPath(searchParams.get('next') || searchParams.get('callbackUrl'));
  const nextQuery = next !== '/' ? `?next=${encodeURIComponent(next)}` : '';
  // Keep the key (not the text) so the message follows a language switch.
  const [formError, setFormError] = useState<[string, string] | null>(() => authErrorKey(searchParams.get('error')));

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setFormError(null);

    try {
      const result = await login(email, password);
      if (!result.ok) {
        setFormError(['login.errorInvalid', 'Wrong email or password. Please try again.']);
        return;
      }
      toast({ title: t('login.toastSuccessTitle', 'Logged in'), description: t('login.toastSuccessDesc', 'Welcome back!') });
      router.replace(next);
    } catch (error) {
      console.error('Login failed', error);
      setFormError(['login.errorGeneric', 'Sign-in failed. Please try again.']);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto flex items-center justify-center min-h-[80vh] py-12 px-4 sm:px-6 lg:px-8">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-3xl font-headline">
            <h1>{t('login.title', 'Welcome back')}</h1>
          </CardTitle>
          <CardDescription>{t('login.subtitle', 'Sign in to your 3D Titans account')}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4">
            {formError && (
              <p role="alert" className="border-[2px] border-destructive p-3 text-sm text-destructive">
                {t(formError[0], formError[1])}
              </p>
            )}
            <form onSubmit={handleLogin} className="grid gap-4">
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
                <Label htmlFor="password">{t('authCommon.password', 'Password')}</Label>
                <Input
                  id="password"
                  type="password"
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={loading}
                />
              </div>
              <div className="flex justify-end text-sm">
                <Link href="/forgot-password" className={AUTH_LINK_CLASS}>
                  {t('login.forgot', 'Forgot password?')}
                </Link>
              </div>
              <Button type="submit" className="w-full mt-2" disabled={loading}>
                {loading ? t('login.submitting', 'Logging in...') : t('login.submit', 'Log in')}
              </Button>
            </form>
            <div className="mt-6 text-center text-sm">
              <p className="text-muted-foreground">
                {t('login.noAccount', "Don't have an account?")}{' '}
                <Link href={`/signup${nextQuery}`} className={AUTH_LINK_CLASS}>
                  {t('login.signupLink', 'Sign up')}
                </Link>
              </p>
            </div>
          </div>
          <GoogleSignInButton callbackUrl={next} label={t('login.google', 'Sign in with Google')} />
        </CardContent>
      </Card>
    </div>
  );
}

export default function LoginPage() {
  // useSearchParams needs a Suspense boundary in the App Router.
  return (
    <Suspense fallback={<div className="min-h-[80vh]" />}>
      <LoginForm />
    </Suspense>
  );
}
