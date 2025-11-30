import type { SVGProps } from 'react';
import { cn } from '@/lib/utils';

export function Logo(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 100 20"
      dir="ltr"
      className={cn('h-6 w-auto text-accent', props.className)}
      aria-label="3D Titans logo"
      {...props}
    >
      <text
        x="0"
        y="15"
        fontFamily="'Bebas Neue', sans-serif"
        fontSize="20"
        fill="currentColor"
        letterSpacing="1"
      >
        3D TITANS
      </text>
    </svg>
  );
}
