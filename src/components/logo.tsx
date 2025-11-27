import type { SVGProps } from 'react';

export function Logo(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 100 20"
      className="h-6 w-auto"
      aria-label="3D Titans logo"
      {...props}
    >
      <text
        x="0"
        y="15"
        fontFamily="'Bebas Neue', sans-serif"
        fontSize="20"
        fill="hsl(var(--accent))"
        letterSpacing="1"
      >
        3D TITANS
      </text>
    </svg>
  );
}
