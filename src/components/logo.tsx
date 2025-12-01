import type { SVGProps } from 'react';
import { cn } from '@/lib/utils';

export function Logo(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 320 80"
      dir="ltr"
      className={cn('h-8 w-auto shrink-0', props.className)}
      aria-label="3D Titans logo"
      {...props}
    >
      <text
        x="0"
        y="60"
        fontFamily="'Bebas Neue', sans-serif"
        fontSize="64"
        fill="#f5c51c"
        letterSpacing="2"
        fontWeight="700"
      >
        3D TITANS
      </text>
    </svg>
  );
}
