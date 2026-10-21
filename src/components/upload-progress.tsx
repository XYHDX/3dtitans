'use client';

import { cn } from '@/lib/utils';

/**
 * Pixel-style progress bar for file uploads. Fills from the inline start, so
 * it runs right-to-left in Arabic.
 */
export function UploadProgress({ value, label, className }: { value: number; label: string; className?: string }) {
  const pct = Math.max(0, Math.min(100, Math.round(value)));
  return (
    <div className={cn('space-y-1', className)}>
      <div className="flex items-center justify-between gap-2 text-xs">
        <span>{label}</span>
        <span className="font-headline text-[10px] tabular-nums" aria-hidden="true">{pct}%</span>
      </div>
      <div
        role="progressbar"
        aria-label={label}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={pct}
        className="h-4 w-full border-[3px] border-foreground bg-background"
      >
        <div className="h-full bg-primary transition-[width] duration-150" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}
