'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { useTranslation } from '@/components/language-provider';

export default function NotFound() {
  const { t } = useTranslation();
  return (
    <div className="flex flex-col items-center justify-center min-h-[70vh] text-center px-4 py-16">
      <p
        aria-hidden
        className="font-headline text-7xl md:text-9xl text-foreground [text-shadow:6px_6px_0_hsl(var(--accent))]"
      >
        404
      </p>
      <h1 className="font-headline text-2xl md:text-3xl mt-6 mb-3">{t('notFound.title')}</h1>
      <p className="text-muted-foreground mb-8 max-w-md mx-auto">{t('notFound.desc')}</p>
      <div className="flex flex-col sm:flex-row gap-4">
        <Button asChild>
          <Link href="/products">{t('notFound.products')}</Link>
        </Button>
        <Button variant="outline" asChild>
          <Link href="/">{t('notFound.home')}</Link>
        </Button>
        <Button variant="outline" asChild>
          <Link href="/support">{t('notFound.support')}</Link>
        </Button>
      </div>
    </div>
  );
}
