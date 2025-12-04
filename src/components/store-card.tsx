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

  return (
    <Card className={cn('overflow-hidden h-full flex flex-col border-muted/80', className)}>
      <div className="relative h-28 bg-muted">
        {store.coverUrl && (
          <Image
            src={store.coverUrl}
            alt={store.name}
            fill
            className="object-cover"
            sizes="100vw"
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-background/90 to-transparent" />
      </div>
      <CardHeader className="pb-3">
        <div className="flex items-center gap-3">
          <Avatar className="h-12 w-12 ring-2 ring-background -mt-8 bg-background">
            <AvatarImage src={store.avatarUrl || undefined} alt={store.name} />
            <AvatarFallback>{getInitials(store.name)}</AvatarFallback>
          </Avatar>
          <div className="flex flex-col">
            <Link href={`/stores/${store.slug}`} className="text-lg font-semibold hover:text-primary">
              {store.name}
            </Link>
            <span className="text-xs text-muted-foreground">/{store.slug}</span>
          </div>
        </div>
      </CardHeader>
      <CardContent className="flex-1 flex flex-col gap-2">
        <p className="text-sm text-muted-foreground line-clamp-3">
          {store.bio || t('stores.noBio')}
        </p>
        <div className="text-sm font-medium">{t('stores.productsCount', '', { count: productCount })}</div>
        {store.websiteUrl && (
          <Link
            href={store.websiteUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
          >
            <ExternalLink className="h-4 w-4" />
            {store.websiteUrl.replace(/^https?:\/\//, '')}
          </Link>
        )}
      </CardContent>
      <CardFooter className="flex items-center justify-between gap-2">
        <div className="text-xs text-muted-foreground">
          {store.isPublished ? t('stores.published') : t('stores.draft')}
        </div>
        <Button asChild variant="ghost" size="sm">
          <Link href={`/stores/${store.slug}`} className="inline-flex items-center gap-1">
            {t('stores.viewStore')}
            <ArrowRight className="h-4 w-4" />
          </Link>
        </Button>
      </CardFooter>
    </Card>
  );
}
