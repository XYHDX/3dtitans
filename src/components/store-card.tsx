'use client';

import type { Store } from '@/lib/types';
import { Card, CardContent, CardFooter, CardHeader } from './ui/card';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import Image from 'next/image';
import Link from 'next/link';
import { Button } from './ui/button';
import { ArrowRight, ExternalLink } from 'lucide-react';
import { useTranslation } from './language-provider';
import { cn } from '@/lib/utils';

type StoreCardProps = {
  store: Store;
  className?: string;
};

function getInitials(name: string) {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .substring(0, 2)
    .toUpperCase();
}

export function StoreCard({ store, className }: StoreCardProps) {
  const { t } = useTranslation();
  const productCount = store.productsCount ?? 0;
  const websiteHref =
    store.websiteUrl && !/^https?:\/\//i.test(store.websiteUrl)
      ? `https://${store.websiteUrl}`
      : store.websiteUrl;

  return (
    <Card className={cn('overflow-hidden h-full flex flex-col border-muted/80', className)}>
      <div className="relative h-28 bg-muted">
        {store.coverUrl && (
          <Image
            src={store.coverUrl}
            alt=""
            fill
            className="object-cover"
            sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 33vw"
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-background/90 to-transparent" />
      </div>
      <CardHeader className="pb-3">
        <div className="flex items-center gap-3 min-w-0">
          <Avatar className="h-12 w-12 ring-2 ring-background -mt-8 bg-background shrink-0">
            <AvatarImage src={store.avatarUrl || undefined} alt="" />
            <AvatarFallback>{getInitials(store.name)}</AvatarFallback>
          </Avatar>
          <Link
            href={`/stores/${store.slug}`}
            className="min-w-0 text-lg font-semibold [overflow-wrap:anywhere] hover:underline hover:decoration-primary hover:decoration-2 hover:underline-offset-4"
          >
            {store.name}
          </Link>
        </div>
      </CardHeader>
      <CardContent className="flex-1 flex flex-col gap-2">
        <p className="text-sm text-muted-foreground line-clamp-3">
          {store.bio || t('stores.noBio')}
        </p>
        <div className="text-sm font-medium">{t('stores.productsCount', '', { count: productCount })}</div>
        {websiteHref && (
          <Link
            href={websiteHref}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-sm text-foreground underline decoration-primary decoration-2 underline-offset-4 dark:text-primary min-w-0"
          >
            <ExternalLink className="h-4 w-4 shrink-0" aria-hidden="true" />
            <span className="truncate">{store.websiteUrl?.replace(/^https?:\/\//, '')}</span>
          </Link>
        )}
      </CardContent>
      <CardFooter className="flex items-center justify-end gap-2">
        <Button asChild variant="ghost" size="sm">
          <Link
            href={`/stores/${store.slug}`}
            className="inline-flex items-center gap-1"
            aria-label={t('catalog.store.viewNamed', 'View store: {name}', { name: store.name })}
          >
            {t('stores.viewStore')}
            <ArrowRight className="h-4 w-4 rtl:rotate-180" aria-hidden="true" />
          </Link>
        </Button>
      </CardFooter>
    </Card>
  );
}
