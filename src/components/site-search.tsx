'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { Search as SearchIcon, X as CloseIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

type ProductHit = {
  id: string;
  name: string;
  category: string;
  price: number;
  imageUrl: string;
  storeName: string | null;
  storeSlug: string | null;
};
type StoreHit = {
  id: string;
  name: string;
  slug: string;
  bio: string;
  avatarUrl: string | null;
};
type SearchResults = { products: ProductHit[]; stores: StoreHit[]; query: string };

const RECENT_KEY = 'titans-recent-searches';
const RECENT_MAX = 6;

function loadRecent(): string[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(RECENT_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}
function pushRecent(q: string) {
  if (!q.trim()) return;
  try {
    const cur = loadRecent().filter((x) => x.toLowerCase() !== q.toLowerCase());
    const next = [q, ...cur].slice(0, RECENT_MAX);
    localStorage.setItem(RECENT_KEY, JSON.stringify(next));
  } catch {}
}

export function SiteSearch({ className }: { className?: string }) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);

  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResults>({ products: [], stores: [], query: '' });
  const [loading, setLoading] = useState(false);
  const [activeIdx, setActiveIdx] = useState(-1);
  const [recent, setRecent] = useState<string[]>([]);

  // Hydrate recent searches on mount (avoids SSR mismatch)
  useEffect(() => {
    setRecent(loadRecent());
  }, []);

  // Global ⌘K / Ctrl+K focuses the input from anywhere
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        inputRef.current?.focus();
        setOpen(true);
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  // Close dropdown on outside click
  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  // Debounced fetch
  useEffect(() => {
    const q = query.trim();
    if (!q) {
      setResults({ products: [], stores: [], query: '' });
      setLoading(false);
      return;
    }
    setLoading(true);
    const t = setTimeout(async () => {
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(q)}&limit=5`);
        const data = await res.json();
        setResults(data);
      } catch {
        setResults({ products: [], stores: [], query: q });
      } finally {
        setLoading(false);
      }
    }, 220);
    return () => clearTimeout(t);
  }, [query]);

  // Flat list of all selectable items for keyboard nav
  const flat = useMemo(() => {
    const items: Array<{ kind: 'product' | 'store' | 'recent' | 'all'; key: string; href: string; label: string }> = [];
    const showingRecent = !query.trim() && recent.length > 0;
    if (showingRecent) {
      for (const r of recent) {
        items.push({ kind: 'recent', key: `r-${r}`, href: `/products?q=${encodeURIComponent(r)}`, label: r });
      }
    } else {
      for (const p of results.products) {
        items.push({ kind: 'product', key: `p-${p.id}`, href: `/products/${p.id}`, label: p.name });
      }
      for (const s of results.stores) {
        items.push({ kind: 'store', key: `s-${s.id}`, href: `/stores/${s.slug}`, label: s.name });
      }
      if (query.trim()) {
        items.push({ kind: 'all', key: 'all', href: `/products?q=${encodeURIComponent(query.trim())}`, label: `See all results for "${query.trim()}"` });
      }
    }
    return items;
  }, [query, recent, results]);

  const submit = useCallback(
    (q: string) => {
      const term = q.trim();
      if (!term) return;
      pushRecent(term);
      setRecent(loadRecent());
      setOpen(false);
      router.push(`/products?q=${encodeURIComponent(term)}`);
    },
    [router]
  );

  function onKey(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIdx((i) => Math.min(i + 1, flat.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIdx((i) => Math.max(i - 1, -1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (activeIdx >= 0 && flat[activeIdx]) {
        const item = flat[activeIdx];
        if (item.kind === 'recent') {
          setQuery(item.label);
          submit(item.label);
        } else {
          pushRecent(query.trim() || item.label);
          setRecent(loadRecent());
          setOpen(false);
          router.push(item.href);
        }
      } else {
        submit(query);
      }
    } else if (e.key === 'Escape') {
      setOpen(false);
      inputRef.current?.blur();
    }
  }

  const showingRecent = !query.trim() && recent.length > 0;

  return (
    <div ref={wrapRef} className={cn('relative w-full max-w-md', className)}>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          submit(query);
        }}
        className="flex items-stretch border-[3px] border-foreground bg-background shadow-[3px_3px_0_0_hsl(var(--foreground))] dark:shadow-[3px_3px_0_0_hsl(var(--accent))]"
      >
        <SearchIcon className="h-4 w-4 self-center ml-3 shrink-0" />
        <input
          ref={inputRef}
          type="search"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setActiveIdx(-1);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={onKey}
          placeholder="Search models, creators…   ⌘K"
          aria-label="Search models and creators"
          className="flex-1 bg-transparent text-foreground px-3 py-2 text-sm font-mono outline-none placeholder:text-muted-foreground"
        />
        {query && (
          <button
            type="button"
            onClick={() => {
              setQuery('');
              inputRef.current?.focus();
            }}
            aria-label="Clear search"
            className="px-2 hover:bg-accent hover:text-accent-foreground"
          >
            <CloseIcon className="h-4 w-4" />
          </button>
        )}
        <button
          type="submit"
          className="bg-foreground text-background px-3 font-headline text-[10px] tracking-wider hover:bg-accent hover:text-accent-foreground border-l-[3px] border-foreground"
        >
          GO
        </button>
      </form>

      {open && (showingRecent || query.trim()) && (
        <div className="absolute left-0 right-0 top-full mt-2 z-50 border-[3px] border-foreground bg-background text-foreground shadow-[6px_6px_0_0_hsl(var(--foreground))] dark:shadow-[6px_6px_0_0_hsl(var(--accent))] max-h-[70vh] overflow-y-auto">
          {showingRecent && (
            <div>
              <div className="px-3 py-2 text-[10px] font-headline tracking-wider bg-muted text-muted-foreground border-b-[2px] border-foreground">
                RECENT
              </div>
              {flat.map((item, i) => (
                <Link
                  key={item.key}
                  href={item.href}
                  onClick={() => {
                    setQuery(item.label);
                    submit(item.label);
                  }}
                  className={cn(
                    'flex items-center gap-2 px-3 py-2 text-sm border-b border-foreground/10 last:border-b-0',
                    i === activeIdx ? 'bg-accent text-accent-foreground' : 'hover:bg-accent hover:text-accent-foreground'
                  )}
                >
                  <SearchIcon className="h-3 w-3 shrink-0 opacity-60" />
                  <span>{item.label}</span>
                </Link>
              ))}
            </div>
          )}

          {!showingRecent && (
            <>
              {loading && (
                <div className="px-3 py-3 text-xs text-muted-foreground">Searching…</div>
              )}

              {!loading && results.products.length === 0 && results.stores.length === 0 && (
                <div className="px-3 py-3 text-xs text-muted-foreground">No matches for "{query}".</div>
              )}

              {results.products.length > 0 && (
                <div>
                  <div className="px-3 py-2 text-[10px] font-headline tracking-wider bg-muted text-muted-foreground border-b-[2px] border-foreground">
                    MODELS
                  </div>
                  {results.products.map((p, i) => {
                    const idx = i;
                    const active = idx === activeIdx;
                    return (
                      <Link
                        key={p.id}
                        href={`/products/${p.id}`}
                        onClick={() => {
                          pushRecent(query.trim());
                          setRecent(loadRecent());
                          setOpen(false);
                        }}
                        className={cn(
                          'flex items-center gap-3 px-3 py-2 text-sm border-b border-foreground/10',
                          active ? 'bg-accent text-accent-foreground' : 'hover:bg-accent hover:text-accent-foreground'
                        )}
                      >
                        <div className="relative h-10 w-10 shrink-0 border-2 border-foreground bg-muted overflow-hidden">
                          {p.imageUrl && (
                            <Image src={p.imageUrl} alt="" fill sizes="40px" className="object-cover" unoptimized />
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="truncate font-bold">{p.name}</div>
                          <div className="truncate text-[11px] text-muted-foreground">
                            {p.category}{p.storeName ? ` · ${p.storeName}` : ''}
                          </div>
                        </div>
                        <div className="font-headline text-xs shrink-0">${p.price.toFixed(2)}</div>
                      </Link>
                    );
                  })}
                </div>
              )}

              {results.stores.length > 0 && (
                <div>
                  <div className="px-3 py-2 text-[10px] font-headline tracking-wider bg-muted text-muted-foreground border-b-[2px] border-foreground border-t-[2px]">
                    CREATORS
                  </div>
                  {results.stores.map((s, i) => {
                    const idx = results.products.length + i;
                    const active = idx === activeIdx;
                    return (
                      <Link
                        key={s.id}
                        href={`/stores/${s.slug}`}
                        onClick={() => {
                          pushRecent(query.trim());
                          setRecent(loadRecent());
                          setOpen(false);
                        }}
                        className={cn(
                          'flex items-center gap-3 px-3 py-2 text-sm border-b border-foreground/10',
                          active ? 'bg-accent text-accent-foreground' : 'hover:bg-accent hover:text-accent-foreground'
                        )}
                      >
                        <div className="relative h-10 w-10 shrink-0 border-2 border-foreground bg-muted overflow-hidden">
                          {s.avatarUrl && (
                            <Image src={s.avatarUrl} alt="" fill sizes="40px" className="object-cover" unoptimized />
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="truncate font-bold">{s.name}</div>
                          <div className="truncate text-[11px] text-muted-foreground">
                            {s.bio || 'Creator store'}
                          </div>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              )}

              {query.trim() && (results.products.length > 0 || results.stores.length > 0) && (
                <Link
                  href={`/products?q=${encodeURIComponent(query.trim())}`}
                  onClick={() => {
                    pushRecent(query.trim());
                    setRecent(loadRecent());
                    setOpen(false);
                  }}
                  className={cn(
                    'block px-3 py-2 text-xs font-bold uppercase tracking-wider border-t-[2px] border-foreground bg-foreground text-background hover:bg-accent hover:text-accent-foreground',
                    activeIdx === flat.length - 1 && 'bg-accent text-accent-foreground'
                  )}
                >
                  See all results for "{query.trim()}" →
                </Link>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
