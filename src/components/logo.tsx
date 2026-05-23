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
 * 3D Titans logo — pixel-art assets sourced from Brand System v2.
 *
 * In light mode we render the dark-on-white lockup; in dark mode we swap to the
 * white-on-black lockup. Theme is detected via the `.dark` class on <html>,
 * which the ThemeToggle component flips. CSS-only swap means no client JS
 * needed for the switch — both <Image>s mount and Tailwind hides the wrong one.
 */
export function Logo({ className, width = 180, height = 60, variant = 'lockup', ...rest }: LogoProps) {
  // Cube and wordmark variants are single-image (no theme swap needed —
  // they already work on either background).
  if (variant === 'cube') {
    return (
      <div className={cn('relative shrink-0', className)} style={{ width, height }} {...rest}>
        <Image
          src="/logo-3d-titans-cube.png"
          alt="3D Titans cube"
          fill
          sizes={`${width}px`}
          className="object-contain"
          priority
        />
      </div>
    );
  }

  if (variant === 'wordmark') {
    return (
      <div className={cn('relative shrink-0', className)} style={{ width, height }} {...rest}>
        <Image
          src="/logo-3d-titans-wordmark.png"
          alt="3D Titans"
          fill
          sizes={`${width}px`}
          className="object-contain"
          priority
        />
      </div>
    );
  }

  // Full lockup — theme-aware via Tailwind dark:* selectors.
  return (
    <div className={cn('relative shrink-0', className)} style={{ width, height }} {...rest}>
      {/* Light-mode lockup: black mark on white */}
      <Image
        src="/logo-3d-titans.png"
        alt="3D Titans logo"
        fill
        sizes={`${width}px`}
        className="object-contain block dark:hidden"
        priority
      />
      {/* Dark-mode lockup: white mark on black */}
      <Image
        src="/logo-3d-titans-dark.png"
        alt="3D Titans logo"
        fill
        sizes={`${width}px`}
        className="object-contain hidden dark:block"
        priority
      />
    </div>
  );
}
