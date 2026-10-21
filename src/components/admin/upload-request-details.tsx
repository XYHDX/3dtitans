'use client';

import { useCallback } from 'react';
import type { Upload } from '@/lib/types';
import { useTranslation } from '@/components/language-provider';

/** Short reference shown to the customer after sending a print request. */
export function uploadReference(id: string): string {
  return `PR-${String(id || '').slice(-6).toUpperCase()}`;
}

/** Locale-aware date for upload lists ("N/A" when missing). */
export function useFormatUploadDate() {
  const { t, locale } = useTranslation();
  return useCallback(
    (value: unknown) => {
      if (!value) return t('uploads.common.na', 'N/A');
      const raw =
        typeof value === 'object' && value !== null && 'toDate' in value
          ? (value as any).toDate()
          : new Date(value as any);
      const d = raw instanceof Date ? raw : new Date(raw);
      return isNaN(d.getTime())
        ? t('uploads.common.na', 'N/A')
        : d.toLocaleDateString(locale === 'ar' ? 'ar-SY' : 'en-US', { dateStyle: 'medium' });
    },
    [t, locale]
  );
}

/**
 * Reference, model name, file name and the customer's notes for a print
 * request. Material, colour, size, quantity and deadline are stored inside
 * `notes` (one "Label: value" per line) by the /upload form.
 */
export function UploadRequestDetails({ upload }: { upload: Upload }) {
  const { t } = useTranslation();
  return (
    <div className="space-y-1">
      <div className="flex flex-wrap items-baseline gap-x-2">
        <span className="font-headline text-[10px]" dir="ltr">
          {uploadReference(upload.id)}
        </span>
        <span className="font-medium break-words">{upload.modelName}</span>
      </div>
      <div className="text-xs text-muted-foreground break-all" dir="ltr">
        {upload.fileName}
      </div>
      {upload.notes ? (
        <details className="text-xs">
          <summary className="cursor-pointer underline decoration-primary decoration-2 underline-offset-4">
            {t('uploads.admin.details', 'Details')}
          </summary>
          <p className="mt-1 whitespace-pre-wrap break-words" dir="auto">
            {upload.notes}
          </p>
        </details>
      ) : null}
    </div>
  );
}
