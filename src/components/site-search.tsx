'use client';

import { useCurrency } from '@/hooks/use-currency';
import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { ArrowRight, Search as SearchIcon, X as CloseIcon } from 'lucide-react';
import { useTranslation } from './language-provider';
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
/** Same limits as /api/search. */
const MIN_QUERY = 2;
const MAX_QUERY = 100;

const EMPTY: SearchResults = { products: [], stores: [], query: '' };

function loadRecent(): string[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(RECENT_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.filter((x) => typeof x === 'string') : [];
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

type Item = { kind: 'product' | 'store' | 'recent' | 'all'; key: string; href: string; label: string };

/**
 * Header search as an accessible combobox: the input owns a listbox of
 * results (products, stores, "see all"), arrow keys move the active option
 * (announced via aria-activedescendant), Enter opens it, Escape closes.
 */
export function SiteSearch({
  className,
  enableShortcut = true,
}: {
  className?: string;
  /** Global ⌘K / Ctrl+K focus shortcut. Disable on a second (e.g. mobile) instance. */
  enableShortcut?: boolean;
}) {
  const { format: formatPrice } = useCurrency();
  const { t } = useTranslation();
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const baseId = useId();
  const listboxId = `${baseId}-listbox`;
  const optionId = (i: number) => `${baseId}-option-${i}`;

  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResults>(EMPTY);
  const [loading, setLoading] = useState(false);
  const [failed, setFailed] = useState<false | 'error' | 'busy'>(false);
  const [activeIdx, setActiveIdx] = useState(-1);
  const [recent, setRecent] = useState<string[]>([]);

  const term = query.trim();
  const tooShort = term.length > 0 && term.length < MIN_QUERY;

  // Hydrate recent searches on mount (avoids SSR mismatch)
  useEffect(() => {
    setRecent(loadRecent());
  }, []);

  // Global ⌘K / Ctrl+K focuses the input from anywhere
  useEffect(() => {
    if (!enableShortcut) return;
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        inputRef.current?.focus();
        setOpen(true);
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [enableShortcut]);

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

  // Debounced fetch (only for terms the API accepts)
  useEffect(() => {
    if (term.length < MIN_QUERY) {
      setResults(EMPTY);
      setLoading(false);
      setFailed(false);
      return;
    }
    setLoading(true);
    setFailed(false);
    let cancelled = false;
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(term)}&limit=5`);
        if (!res.ok) {
          if (!cancelled) {
            setResults(EMPTY);
            setFailed(res.status === 429 ? 'busy' : 'error');
          }
          return;
        }
        const data = await res.json();
        if (!cancelled) setResults({ products: data.products || [], stores: data.stores || [], query: term });
      } catch {
        if (!cancelled) {
          setResults(EMPTY);
          setFailed('error');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }, 220);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [term]);

  const showingRecent = !term && recent.length > 0;

  // Flat list of all selectable options, in display order (keyboard nav + ids)
  const flat = useMemo(() => {
    const items: Item[] = [];
    if (showingRecent) {
      for (const r of recent) {
        items.push({ kind: 'recent', key: `r-${r}`, href: `/products?q=${encodeURIComponent(r)}`, label: r });
      }
    } else if (term.length >= MIN_QUERY) {
      for (const p of results.products) {
        items.push({ kind: 'product', key: `p-${p.id}`, href: `/products/${p.id}`, label: p.name });
      }
      for (const s of results.stores) {
        items.push({ kind: 'store', key: `s-${s.id}`, href: `/stores/${s.slug}`, label: s.name });
      }
      if (results.products.length > 0 || results.stores.length > 0) {
        items.push({ kind: 'all', key: 'all', href: `/products?q=${encodeURIComponent(term)}`, label: term });
      }
    }
    return items;
  }, [showingRecent, recent, term, results]);

  // Keep the active option valid and visible
  useEffect(() => {
    if (activeIdx >= flat.length) setActiveIdx(flat.length - 1);
  }, [flat.length, activeIdx]);
  useEffect(() => {
    if (activeIdx < 0) return;
    document.getElementById(optionId(activeIdx))?.scrollIntoView({ block: 'nearest' });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeIdx]);

  const submit = useCallback(
    (q: string) => {
      const value = q.trim();
      if (!value) return;
      pushRecent(value);
      setRecent(loadRecent());
      setOpen(false);
      router.push(`/products?q=${encodeURIComponent(value)}`);
    },
    [router]
  );

  const remember = () => {
    if (term) pushRecent(term);
    setRecent(loadRecent());
    setOpen(false);
  };

  function onKey(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setOpen(true);
      setActiveIdx((i) => Math.min(i + 1, flat.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIdx((i) => Math.max(i - 1, -1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (open && activeIdx >= 0 && flat[activeIdx]) {
        const item = flat[activeIdx];
        if (item.kind === 'recent') {
          setQuery(item.label);
          submit(item.label);
        } else {
          pushRecent(term || item.label);
          setRecent(loadRecent());
          setOpen(false);
          router.push(item.href);
        }
      } else {
        submit(query);
      }
    } else if (e.key === 'Escape') {
      if (open) {
        e.preventDefault();
        setOpen(false);
        setActiveIdx(-1);
      } else {
        inputRef.current?.blur();
      }
    }
  }

  const panelVisible = open && (showingRecent || term.length > 0);
  const listVisible = panelVisible && flat.length > 0;
  const productCount = results.products.length;
  const storeCount = results.stores.length;

  const optionClass = (i: number) =>
    cn(
      'flex items-center gap-3 px-3 py-2 text-sm border-b border-foreground/10 last:border-b-0',
      i === activeIdx ? 'bg-accent text-accent-foreground' : 'hover:bg-accent hover:text-accent-foreground'
    );

  const statusText = tooShort
    ? t('catalog.search.tooShort', 'Type at least 2 characters.')
    : loading
      ? t('catalog.search.searching', 'Searching…')
      : failed === 'busy'
        ? t('catalog.search.busy', 'Too many searches — please wait a moment.')
        : failed === 'error'
          ? t('catalog.search.failed', 'Search is unavailable right now. Please try again.')
          : term && productCount === 0 && storeCount === 0
            ? t('catalog.search.noMatches', 'No matches for "{query}".', { query: term })
            : '';

  return (
    <div ref={wrapRef} className={cn('relative w-full max-w-md', className)}>
      <form
        role="search"
        onSubmit={(e) => {
          e.preventDefault();
          submit(query);
        }}
        className="flex items-stretch border-[3px] border-foreground bg-background shadow-[3px_3px_0_0_hsl(var(--foreground))] dark:shadow-[3px_3px_0_0_hsl(var(--accent))]"
      >
        <SearchIcon className="h-4 w-4 self-center ms-3 shrink-0" aria-hidden="true" />
        <input
          ref={inputRef}
          type="search"
          role="combobox"
          aria-expanded={listVisible}
          aria-controls={listboxId}
          aria-autocomplete="list"
          aria-activedescendant={listVisible && activeIdx >= 0 ? optionId(activeIdx) : undefined}
          aria-label={t('catalog.search.label', 'Search products and stores')}
          value={query}
          maxLength={MAX_QUERY}
          onChange={(e) => {
            setQuery(e.target.value);
            setActiveIdx(-1);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={onKey}
          placeholder={t('catalog.search.placeholder', 'Search products, stores…')}
          autoComplete="off"
          className="flex-1 min-w-0 bg-transparent text-foreground px-3 py-2 text-sm font-mono outline-none placeholder:text-muted-foreground"
        />
        {query && (
          <button
            type="button"
            onClick={() => {
              setQuery('');
              inputRef.current?.focus();
            }}
            aria-label={t('catalog.search.clear', 'Clear search')}
            className="px-2 hover:bg-accent hover:text-accent-foreground"
          >
            <CloseIcon className="h-4 w-4" aria-hidden="true" />
          </button>
        )}
        <button
          type="submit"
          className="bg-foreground text-background px-3 font-headline text-xs tracking-wider hover:bg-accent hover:text-accent-foreground border-s-[3px] border-foreground"
        >
          {t('catalog.search.go', 'GO')}
        </button>
      </form>

      {panelVisible && (
        <div className="absolute inset-x-0 top-full mt-2 z-50 border-[3px] border-foreground bg-background text-foreground shadow-[6px_6px_0_0_hsl(var(--foreground))] dark:shadow-[6px_6px_0_0_hsl(var(--accent))] max-h-[70vh] overflow-y-auto">
          {!showingRecent && statusText && (
            <div className="px-3 py-3 text-xs text-muted-foreground" role="status" aria-live="polite">
              {statusText}
            </div>
          )}

          <div id={listboxId} role="listbox" aria-label={t('catalog.search.resultsLabel', 'Search suggestions')}>
            {showingRecent && (
              <div role="group" aria-labelledby={`${baseId}-recent`}>
                <div
                  id={`${baseId}-recent`}
                  className="px-3 py-2 text-xs font-headline tracking-wider bg-muted text-muted-foreground border-b-[2px] border-foreground"
                >
                  {t('catalog.search.recent', 'RECENT')}
                </div>
                {flat.map((item, i) => (
                  <Link
                    key={item.key}
                    id={optionId(i)}
                    role="option"
                    aria-selected={i === activeIdx}
                    tabIndex={-1}
                    href={item.href}
                    onClick={() => {
                      setQuery(item.label);
                      pushRecent(item.label);
                      setRecent(loadRecent());
                      setOpen(false);
                    }}
                    className={optionClass(i)}
                  >
                    <SearchIcon className="h-3 w-3 shrink-0 opacity-60" aria-hidden="true" />
                    <span className="truncate">{item.label}</span>
                  </Link>
                ))}
              </div>
            )}

            {!showingRecent && productCount > 0 && (
              <div role="group" aria-labelledby={`${baseId}-products`}>
                <div
                  id={`${baseId}-products`}
                  className="px-3 py-2 text-xs font-headline tracking-wider bg-muted text-muted-foreground border-b-[2px] border-foreground"
                >
                  {t('catalog.search.products', 'PRODUCTS')}
                </div>
                {results.products.map((p, i) => (
                  <Link
                    key={p.id}
                    id={optionId(i)}
                    role="option"
                    aria-selected={i === activeIdx}
                    tabIndex={-1}
                    href={`/products/${p.id}`}
                    onClick={remember}
                    className={optionClass(i)}
                  >
                    <div className="relative h-10 w-10 shrink-0 border-2 border-foreground bg-muted overflow-hidden">
                      {p.imageUrl && <Image src={p.imageUrl} alt="" fill sizes="40px" className="object-cover" />}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="truncate font-bold">{p.name}</div>
                      <div className="truncate text-xs text-muted-foreground">
                        {p.category}
                        {p.storeName ? ` · ${p.storeName}` : ''}
                      </div>
                    </div>
                    <div className="font-headline text-xs shrink-0">{formatPrice(p.price)}</div>
                  </Link>
                ))}
              </div>
            )}

            {!showingRecent && storeCount > 0 && (
              <div role="group" aria-labelledby={`${baseId}-stores`}>
                <div
                  id={`${baseId}-stores`}
                  className="px-3 py-2 text-xs font-headline tracking-wider bg-muted text-muted-foreground border-b-[2px] border-foreground border-t-[2px]"
                >
                  {t('catalog.search.stores', 'STORES')}
                </div>
                {results.stores.map((s, i) => {
                  const idx = productCount + i;
                  return (
                    <Link
                      key={s.id}
                      id={optionId(idx)}
                      role="option"
                      aria-selected={idx === activeIdx}
                      tabIndex={-1}
                      href={`/stores/${s.slug}`}
                      onClick={remember}
                      className={optionClass(idx)}
                    >
                      <div className="relative h-10 w-10 shrink-0 border-2 border-foreground bg-muted overflow-hidden">
                        {s.avatarUrl && <Image src={s.avatarUrl} alt="" fill sizes="40px" className="object-cover" />}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="truncate font-bold">{s.name}</div>
                        <div className="truncate text-xs text-muted-foreground">
                          {s.bio || t('catalog.search.storeFallback', 'Store')}
                        </div>
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}

            {!showingRecent && (productCount > 0 || storeCount > 0) && (
              <Link
                id={optionId(flat.length - 1)}
                role="option"
                aria-selected={activeIdx === flat.length - 1}
                tabIndex={-1}
                href={`/products?q=${encodeURIComponent(term)}`}
                onClick={remember}
                className={cn(
                  'flex items-center justify-between gap-2 px-3 py-2 text-xs font-bold uppercase tracking-wider border-t-[2px] border-foreground',
                  activeIdx === flat.length - 1
                    ? 'bg-accent text-accent-foreground'
                    : 'bg-foreground text-background hover:bg-accent hover:text-accent-foreground'
                )}
              >
                <span className="truncate">{t('catalog.search.seeAll', 'See all results for "{query}"', { query: term })}</span>
                <ArrowRight className="h-4 w-4 shrink-0 rtl:rotate-180" aria-hidden="true" />
              </Link>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
