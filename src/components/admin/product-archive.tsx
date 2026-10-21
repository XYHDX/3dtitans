'use client';

import { useState } from 'react';
import { RotateCcw } from 'lucide-react';
import type { Product } from '@/lib/types';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { useTranslation } from '@/components/language-provider';
import { cn } from '@/lib/utils';

/**
 * "Deleting" a product archives it: it leaves the shop but orders keep it.
 * Dashboard lists (/api/products?scope=manage) include archived products,
 * flagged with `archived` (list) or `archivedAt` (single-product responses).
 */
export function isArchivedProduct(product: Product): boolean {
  const p = product as Product & { archived?: boolean; archivedAt?: string | Date | null };
  return !!(p.archived || p.archivedAt);
}

/** Active products first, archived ones after (order otherwise unchanged). */
export function activeFirst(products: Product[]): Product[] {
  return [...products.filter((p) => !isArchivedProduct(p)), ...products.filter(isArchivedProduct)];
}

export function ArchivedBadge({ className }: { className?: string }) {
  const { t } = useTranslation();
  return (
    <Badge variant="outline" className={cn('whitespace-nowrap', className)}>
      {t('uploads.archive.badge', 'Archived')}
    </Badge>
  );
}

/** Puts an archived product back in the shop (PATCH { archived: false }). */
export function RestoreProductButton({
  product,
  onRestored,
}: {
  product: Product;
  onRestored?: () => void | Promise<void>;
}) {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [busy, setBusy] = useState(false);

  const restore = async () => {
    setBusy(true);
    try {
      const res = await fetch(`/api/products/${encodeURIComponent(product.id)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ archived: false }),
      }).catch(() => null);
      if (!res?.ok) {
        toast({
          variant: 'destructive',
          title: t('uploads.archive.restoreFailedTitle', 'Restore failed'),
          description: t('uploads.archive.restoreFailedDesc', 'Could not restore the product. Please try again.'),
        });
        return;
      }
      toast({
        title: t('uploads.archive.restoredTitle', 'Product restored'),
        description: t('uploads.archive.restoredDesc', '{name} is back in the shop.', { name: product.name }),
      });
      await onRestored?.();
    } finally {
      setBusy(false);
    }
  };

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      onClick={restore}
      disabled={busy}
      aria-label={t('uploads.archive.restoreAria', 'Restore {name}', { name: product.name })}
      title={t('uploads.archive.restore', 'Restore')}
    >
      <RotateCcw className="h-4 w-4" />
    </Button>
  );
}
