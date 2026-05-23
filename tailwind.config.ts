
import type { Config } from 'tailwindcss';

const config = {
  darkMode: ['class'],
  content: [
    './pages/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './app/**/*.{ts,tsx}',
    './src/**/*.{ts,tsx}',
  ],
  prefix: "",
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
        "pixel-pulse": {
          "0%, 100%": { transform: "scale(1)" },
          "25%": { transform: "scale(1.08)" },
          "50%": { transform: "scale(0.94)" },
          "75%": { transform: "scale(1.04)" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s steps(4, end)",
        "accordion-up": "accordion-up 0.2s steps(4, end)",
        "pixel-pulse": "pixel-pulse 1.2s steps(4, end) infinite",
      },
      fontFamily: {
        // Body = Space Mono, Headline = Press Start 2P (brand v2)
        body: ['var(--font-space-mono)', 'ui-monospace', 'monospace'],
        headline: ['var(--font-press-start)', 'Press Start 2P', 'monospace'],
        mono: ['var(--font-space-mono)', 'ui-monospace', 'monospace'],
      },
      boxShadow: {
        // Hard block shadows for the pixel-frame aesthetic
        pixel:    '6px 6px 0 0 hsl(var(--foreground))',
        'pixel-sm':'4px 4px 0 0 hsl(var(--foreground))',
        'pixel-lg':'10px 10px 0 0 hsl(var(--foreground))',
        'pixel-accent': '6px 6px 0 0 hsl(var(--accent))',
      },
    },
  },
} satisfies Config

export default config;
