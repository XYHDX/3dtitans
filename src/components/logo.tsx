import Image from 'next/image';
import type { HTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

type LogoVariant = 'lockup' | 'cube' | 'wordmark';

type LogoProps = HTMLAttributes<HTMLDivElement> & {
  width?: number;
  height?: number;
  /** Which mark to render. Default 'lockup' (full pixel-art lockup). */
  variant?: LogoVariant;
};

/**
 * 3D Titans logo — pure SVG, fully transparent backgrounds.
 *
 * Light mode renders the dark-ink lockup; dark mode renders the white-ink lockup.
 * Theme is detected via the `.dark` class on <html>, which the ThemeToggle
 * component flips. CSS-only swap means no client JS — both <Image>s mount and
 * Tailwind hides the wrong one with `block dark:hidden` / `hidden dark:block`.
 *
 * The SVG sources live in /public/logo-3d-titans*.svg and are generated from
 * scripts/make_logos.py (in repo root or kept alongside design tokens).
 */
export function Logo({ className, width = 200, height = 44, variant = 'lockup', ...rest }: LogoProps) {
  // Cube-only mark — theme-aware swap.
  if (variant === 'cube') {
    return (
      <div className={cn('relative shrink-0', className)} style={{ width, height }} {...rest}>
        <Image
          src="/logo-3d-titans-cube.svg"
          alt="3D Titans cube"
          fill
          sizes={`${width}px`}
          className="object-contain block dark:hidden"
          priority
          unoptimized
        />
        <Image
          src="/logo-3d-titans-cube-dark.svg"
          alt="3D Titans cube"
          fill
          sizes={`${width}px`}
          className="object-contain hidden dark:block"
          priority
          unoptimized
        />
      </div>
    );
  }

  if (variant === 'wordmark') {
    // Wordmark falls back to the lockup SVG since the new SVG includes the wordmark inline.
    return (
      <div className={cn('relative shrink-0', className)} style={{ width, height }} {...rest}>
        <Image
          src="/logo-3d-titans.svg"
          alt="3D Titans"
          fill
          sizes={`${width}px`}
          className="object-contain block dark:hidden"
          priority
          unoptimized
        />
        <Image
          src="/logo-3d-titans-dark.svg"
          alt="3D Titans"
          fill
          sizes={`${width}px`}
          className="object-contain hidden dark:block"
          priority
          unoptimized
        />
      </div>
    );
  }

  // Full lockup — theme-aware via Tailwind dark:* selectors.
  return (
    <div className={cn('relative shrink-0', className)} style={{ width, height }} {...rest}>
      {/* Light-mode lockup: black ink, transparent background */}
      <Image
        src="/logo-3d-titans.svg"
        alt="3D Titans logo"
        fill
        sizes={`${width}px`}
        className="object-contain block dark:hidden"
        priority
      />
      {/* Dark-mode lockup: white ink, transparent background */}
      <Image
        src="/logo-3d-titans-dark.svg"
        alt="3D Titans logo"
        fill
        sizes={`${width}px`}
        className="object-contain hidden dark:block"
        priority
      />
    </div>
  );
}
