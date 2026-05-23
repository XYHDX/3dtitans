'use client';

import { useEffect, useState } from 'react';
import { Moon, Sun } from 'lucide-react';
import { cn } from '@/lib/utils';

const STORAGE_KEY = 'titans-theme';

type Theme = 'light' | 'dark';

function readTheme(): Theme {
  if (typeof window === 'undefined') return 'light';
  const saved = window.localStorage.getItem(STORAGE_KEY);
  if (saved === 'dark' || saved === 'light') return saved;
  // Fall back to OS preference
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function applyTheme(theme: Theme) {
  const root = document.documentElement;
  if (theme === 'dark') root.classList.add('dark');
  else root.classList.remove('dark');
}

export function ThemeToggle({ className }: { className?: string }) {
  // Start `null` so server and first client render match (we don't yet know the theme).
  // The inline script in <body> has already applied the correct class to <html>, so the
  // page renders correctly even while this state is hydrating.
  const [theme, setTheme] = useState<Theme | null>(null);

  useEffect(() => {
    setTheme(readTheme());
  }, []);

  const toggle = () => {
    const next: Theme = theme === 'dark' ? 'light' : 'dark';
    setTheme(next);
    applyTheme(next);
    try {
      window.localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // localStorage can throw in private mode — non-fatal
    }
  };

  const isDark = theme === 'dark';

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      aria-pressed={isDark}
      className={cn(
        'inline-flex h-10 w-10 items-center justify-center border-[3px] border-foreground bg-background text-foreground shadow-[3px_3px_0_0_hsl(var(--foreground))] dark:shadow-[3px_3px_0_0_hsl(var(--accent))] transition-transform [transition-timing-function:steps(2,end)] duration-75 hover:-translate-x-[2px] hover:-translate-y-[2px] hover:bg-accent hover:text-accent-foreground active:translate-x-[2px] active:translate-y-[2px]',
        className,
      )}
      title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
    >
      {/* Render both icons; CSS swaps via dark: variant so SSR is stable */}
      <Sun className="h-4 w-4 block dark:hidden" />
      <Moon className="h-4 w-4 hidden dark:block" />
    </button>
  );
}
