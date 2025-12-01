import type { SVGProps } from 'react';
import { cn } from '@/lib/utils';

export function Logo(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 200 40"
      dir="ltr"
      className={cn('h-8 w-auto shrink-0 text-accent', props.className)}
      aria-label="3D Titans logo"
      {...props}
    >
      <text
        x="0"
        y="30"
        fontFamily="'Bebas Neue', sans-serif"
        fontSize="32"
        fill="currentColor"
        letterSpacing="1"
        fontWeight="700"
      >
        3D TITANS
      </text>
    </svg>
  );
}
