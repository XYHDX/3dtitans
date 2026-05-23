import Image from 'next/image';
import type { HTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

type LogoVariant = 'lockup' | 'cube' | 'wordmark';
type LogoTone = 'light' | 'dark';

type LogoProps = HTMLAttributes<HTMLDivElement> & {
  width?: number;
  height?: number;
  /** Which mark to render. Default 'lockup' (full pixel-art lockup). */
  variant?: LogoVariant;
  /**
   * Pin the ink tone regardless of theme. Use for surfaces whose color is
   * fixed independent of the user's theme (e.g. the footer is always dark,
   * so it should always render the white-ink logo).
   * - `light` = white ink (for dark surfaces)
   * - `dark`  = black ink (for light surfaces)
   * Omit to auto-swap based on the global `.dark` class on <html>.
   */
  forceTone?: LogoTone;
};

const SRCS: Record<LogoVariant, { light: string; dark: string }> = {
  lockup:   { light: '/logo-3d-titans.svg',      dark: '/logo-3d-titans-dark.svg' },
  cube:     { light: '/logo-3d-titans-cube.svg', dark: '/logo-3d-titans-cube-dark.svg' },
  wordmark: { light: '/logo-3d-titans.svg',      dark: '/logo-3d-titans-dark.svg' },
};

/**
 * 3D Titans logo — pure SVG, fully transparent backgrounds.
 *
 * Without `forceTone`: auto-detects theme via the `.dark` class on <html>
 * (flipped by ThemeToggle). Both <Image>s mount and Tailwind hides the wrong
 * one with `block dark:hidden` / `hidden dark:block` — no client JS needed.
 *
 * With `forceTone="light"` (white ink): always render the white-ink variant.
 * Use for dark surfaces that don't follow the global theme (e.g. footer).
 *
 * With `forceTone="dark"` (black ink): always render the black-ink variant.
 *
 * The SVG sources live in /public and are generated from scripts/make_logos.py.
 */
export function Logo({
  className,
  width = 200,
  height = 44,
  variant = 'lockup',
  forceTone,
  ...rest
}: LogoProps) {
  const srcs = SRCS[variant];
  const alt = variant === 'cube' ? '3D Titans cube' : '3D Titans logo';

  // Pinned tone — render one image only.
  if (forceTone === 'light') {
    return (
      <div className={cn('relative shrink-0', className)} style={{ width, height }} {...rest}>
        <Image src={srcs.dark} alt={alt} fill sizes={`${width}px`} className="object-contain" priority unoptimized />
      </div>
    );
  }
  if (forceTone === 'dark') {
    return (
      <div className={cn('relative shrink-0', className)} style={{ width, height }} {...rest}>
        <Image src={srcs.light} alt={alt} fill sizes={`${width}px`} className="object-contain" priority unoptimized />
      </div>
    );
  }

  // Auto-swap based on global theme.
  return (
    <div className={cn('relative shrink-0', className)} style={{ width, height }} {...rest}>
      <Image src={srcs.light} alt={alt} fill sizes={`${width}px`} className="object-contain block dark:hidden" priority unoptimized />
      <Image src={srcs.dark}  alt={alt} fill sizes={`${width}px`} className="object-contain hidden dark:block" priority unoptimized />
    </div>
  );
}
