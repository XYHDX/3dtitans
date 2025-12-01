import Image from 'next/image';
import type { HTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

type LogoProps = HTMLAttributes<HTMLDivElement> & {
  width?: number;
  height?: number;
};

export function Logo({ className, width = 180, height = 60, ...rest }: LogoProps) {
  return (
    <div className={cn('relative shrink-0', className)} style={{ width, height }} {...rest}>
      <Image
        src="/logo-3d-titans.png"
        alt="3D Titans logo"
        fill
        sizes={`${width}px`}
        className="object-contain"
        priority
      />
    </div>
  );
}
