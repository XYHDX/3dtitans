'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { useTranslation } from '@/components/language-provider';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const { t } = useTranslation();

  useEffect(() => {
    // Shows up in the browser console and in Vercel's runtime logs (server errors).
    console.error(error);
  }, [error]);

  return (
    <div className="flex flex-col items-center justify-center min-h-[70vh] text-center px-4 py-16">
      <div className="inline-flex gap-2 mb-8" aria-hidden>
        <div className="w-6 h-6 border-[3px] border-foreground bg-destructive" />
        <div className="w-6 h-6 border-[3px] border-foreground bg-accent" />
        <div className="w-6 h-6 border-[3px] border-foreground bg-destructive" />
      </div>
      <h1 className="font-headline text-2xl md:text-4xl mb-4">{t('error.title')}</h1>
      <p className="text-muted-foreground mb-6 max-w-md mx-auto">{t('error.desc')}</p>
      {error.digest && (
        <p className="text-xs text-muted-foreground mb-6">
          {t('error.reference')} <code dir="ltr" className="font-mono">{error.digest}</code>
        </p>
      )}
      <div className="flex flex-col sm:flex-row gap-4">
        <Button onClick={() => reset()}>{t('error.retry')}</Button>
        <Button variant="outline" asChild>
          <Link href="/">{t('error.home')}</Link>
        </Button>
        <Button variant="outline" asChild>
          <Link href="/support">{t('error.support')}</Link>
        </Button>
      </div>
    </div>
  );
}
