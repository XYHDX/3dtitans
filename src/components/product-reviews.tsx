'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { RotateCw, Star } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { useSessionUser } from '@/hooks/use-session';
import { useTranslation } from '@/components/language-provider';
import { localeSettings } from '@/lib/i18n';
import { cn } from '@/lib/utils';

type Review = {
  id: string;
  rating: number;
  title: string;
  body: string;
  verifiedPurchase: boolean;
  createdAt: string;
  userId: string;
  userName: string;
  userImage: string | null;
};

function StarIcon({ filled, size }: { filled: boolean; size: number }) {
  return (
    <Star
      // Dark outline keeps filled stars visible on the light background.
      className={cn(filled ? 'fill-accent text-foreground' : 'fill-transparent text-foreground/40', 'shrink-0')}
      style={{ width: size, height: size }}
      aria-hidden="true"
    />
  );
}

/** Read-only star row, announced as "4 of 5 stars". */
function StarRow({ value, size = 18 }: { value: number; size?: number }) {
  const { t } = useTranslation();
  return (
    <div className="inline-flex gap-1" role="img" aria-label={t('catalog.reviews.starsAria', '{value} of 5 stars', { value })}>
      {[1, 2, 3, 4, 5].map((n) => (
        <StarIcon key={n} filled={value >= n} size={size} />
      ))}
    </div>
  );
}

/**
 * Star rating input as a proper radio group: one tab stop, arrow keys move
 * (and select) the rating, Home/End jump to 1 / 5.
 */
function StarRatingInput({
  value,
  onChange,
  labelledBy,
  size = 22,
}: {
  value: number;
  onChange: (v: number) => void;
  labelledBy: string;
  size?: number;
}) {
  const { t, locale } = useTranslation();
  const isRtl = localeSettings[locale].dir === 'rtl';
  const refs = useRef<Array<HTMLButtonElement | null>>([]);
  const [hover, setHover] = useState(0);
  const shown = hover || value;
  // Roving tab index: the checked star, or the first one when nothing is picked yet.
  const tabStop = value >= 1 ? value : 1;

  const select = (n: number) => {
    const next = Math.min(5, Math.max(1, n));
    onChange(next);
    refs.current[next - 1]?.focus();
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLButtonElement>, n: number) => {
    const forward = isRtl ? 'ArrowLeft' : 'ArrowRight';
    const backward = isRtl ? 'ArrowRight' : 'ArrowLeft';
    if (e.key === forward || e.key === 'ArrowUp') {
      e.preventDefault();
      select(n >= 5 ? 1 : n + 1);
    } else if (e.key === backward || e.key === 'ArrowDown') {
      e.preventDefault();
      select(n <= 1 ? 5 : n - 1);
    } else if (e.key === 'Home') {
      e.preventDefault();
      select(1);
    } else if (e.key === 'End') {
      e.preventDefault();
      select(5);
    } else if (e.key === ' ' || e.key === 'Enter') {
      e.preventDefault();
      select(n);
    }
  };

  return (
    <div className="inline-flex gap-1" role="radiogroup" aria-labelledby={labelledBy} onMouseLeave={() => setHover(0)}>
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          ref={(el) => {
            refs.current[n - 1] = el;
          }}
          type="button"
          role="radio"
          aria-checked={value === n}
          aria-label={t('catalog.reviews.rateN', '{n} of 5 stars', { n })}
          tabIndex={n === tabStop ? 0 : -1}
          onClick={() => select(n)}
          onKeyDown={(e) => onKeyDown(e, n)}
          onMouseEnter={() => setHover(n)}
          className="p-0.5 hover:scale-110 transition-transform [transition-timing-function:steps(2,end)] duration-75 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground focus-visible:ring-offset-2"
        >
          <StarIcon filled={shown >= n} size={size} />
        </button>
      ))}
    </div>
  );
}

export function ProductReviews({ productId }: { productId: string }) {
  const { user } = useSessionUser();
  const { toast } = useToast();
  const { t, locale } = useTranslation();

  const [reviews, setReviews] = useState<Review[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);

  // Form state
  const [rating, setRating] = useState(0);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Load reviews
  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(false);
    try {
      const res = await fetch(`/api/products/${productId}/reviews`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setReviews(data.reviews || []);
    } catch {
      // A failed load is not "no reviews" — show an error with a retry instead.
      setReviews(null);
      setLoadError(true);
    } finally {
      setLoading(false);
    }
  }, [productId]);

  useEffect(() => {
    load();
  }, [load]);

  // If user already reviewed, prefill form
  const myReview = useMemo(
    () => (user && reviews ? reviews.find((r) => r.userId === user.id) : null),
    [user, reviews]
  );
  useEffect(() => {
    if (myReview) {
      setRating(myReview.rating);
      setTitle(myReview.title);
      setBody(myReview.body);
    }
  }, [myReview]);

  const formatDate = (iso: string) => {
    try {
      const d = new Date(iso);
      return d.toLocaleDateString(locale === 'ar' ? 'ar-SY' : 'en-GB', { year: 'numeric', month: 'short', day: 'numeric' });
    } catch {
      return iso;
    }
  };

  const loginHref = `/login?next=${encodeURIComponent(`/products/${productId}`)}`;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    if (rating < 1) {
      toast({
        variant: 'destructive',
        title: t('catalog.reviews.pickRatingTitle', 'Pick a rating'),
        description: t('catalog.reviews.pickRatingDesc', 'Choose 1 to 5 stars.'),
      });
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch(`/api/products/${productId}/reviews`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rating, title, body }),
      });
      if (!res.ok) {
        const reason =
          res.status === 429
            ? t('catalog.reviews.tooMany', 'Too many reviews in a short time. Please wait a few minutes.')
            : res.status === 403
              ? t('catalog.reviews.ownProduct', "You can't review your own product.")
              : res.status === 401
                ? t('catalog.reviews.signInPrompt', 'Sign in to leave a review for this product.')
                : t('catalog.reviews.saveFailedDesc', 'Your review was not saved. Please try again.');
        toast({ variant: 'destructive', title: t('catalog.reviews.saveFailedTitle', 'Could not save'), description: reason });
        return;
      }
      toast({
        title: myReview ? t('catalog.reviews.updated', 'Review updated') : t('catalog.reviews.posted', 'Review posted'),
        description: t('catalog.reviews.thanks', 'Thanks for the feedback.'),
      });
      await load();
    } catch {
      toast({
        variant: 'destructive',
        title: t('catalog.reviews.saveFailedTitle', 'Could not save'),
        description: t('catalog.reviews.saveFailedDesc', 'Your review was not saved. Please try again.'),
      });
    } finally {
      setSubmitting(false);
    }
  };

  const remove = async () => {
    if (!confirm(t('catalog.reviews.confirmDelete', 'Delete your review?'))) return;
    try {
      const res = await fetch(`/api/products/${productId}/reviews`, { method: 'DELETE' });
      if (!res.ok) throw new Error('delete_failed');
      setRating(0);
      setTitle('');
      setBody('');
      await load();
      toast({ title: t('catalog.reviews.deleted', 'Review deleted') });
    } catch {
      toast({
        variant: 'destructive',
        title: t('catalog.reviews.deleteFailedTitle', 'Could not delete'),
        description: t('catalog.reviews.deleteFailedDesc', 'Please try again.'),
      });
    }
  };

  return (
    <section className="mt-16" aria-labelledby="reviews-heading">
      <div className="flex items-center gap-3 mb-6">
        <span className="font-headline text-xs px-3 py-2 bg-foreground text-background" aria-hidden="true">RV</span>
        <h2 id="reviews-heading" className="font-headline text-xl sm:text-2xl md:text-3xl">
          {t('catalog.reviews.title', 'Reviews')}
        </h2>
      </div>

      {/* Review form */}
      <div className="border-[3px] border-foreground bg-card text-card-foreground p-5 shadow-[6px_6px_0_0_hsl(var(--foreground))] dark:shadow-[6px_6px_0_0_hsl(var(--accent))] mb-8">
        {!user ? (
          <div className="text-sm">
            <p className="mb-3">{t('catalog.reviews.signInPrompt', 'Sign in to leave a review for this product.')}</p>
            <Button asChild>
              <Link href={loginHref}>{t('catalog.reviews.signIn', 'Sign in')}</Link>
            </Button>
          </div>
        ) : (
          <form onSubmit={submit} className="flex flex-col gap-3">
            <div className="flex flex-wrap items-center gap-3">
              <span id="review-rating-label" className="font-headline text-xs uppercase tracking-wider">
                {t('catalog.reviews.yourRating', 'Your rating')}
              </span>
              <StarRatingInput value={rating} onChange={setRating} labelledBy="review-rating-label" />
            </div>
            <label htmlFor="review-title" className="text-sm font-bold">
              {t('catalog.reviews.titleLabel', 'Headline (optional)')}
            </label>
            <Input
              id="review-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={t('catalog.reviews.titlePlaceholder', 'Sum it up in a few words')}
              maxLength={120}
            />
            <label htmlFor="review-body" className="text-sm font-bold">
              {t('catalog.reviews.bodyLabel', 'Your review')}
            </label>
            <textarea
              id="review-body"
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder={t('catalog.reviews.bodyPlaceholder', 'What did you think? Print quality, fit, surprises…')}
              maxLength={4000}
              rows={4}
              className="border-[3px] border-foreground bg-background text-foreground px-3 py-2 text-sm font-mono shadow-[3px_3px_0_0_hsl(var(--foreground))] focus:bg-accent focus:text-accent-foreground outline-none resize-y"
            />
            <div className="flex items-center gap-3 flex-wrap">
              <Button type="submit" disabled={submitting}>
                {submitting
                  ? t('catalog.reviews.saving', 'Saving…')
                  : myReview
                    ? t('catalog.reviews.update', 'Update review')
                    : t('catalog.reviews.post', 'Post review')}
              </Button>
              {myReview && (
                <Button type="button" variant="outline" onClick={remove}>
                  {t('catalog.reviews.delete', 'Delete review')}
                </Button>
              )}
            </div>
          </form>
        )}
      </div>

      {/* Reviews list */}
      <div className="space-y-4">
        {loading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="border-[3px] border-foreground/20 p-4">
              <Skeleton className="h-4 w-24 mb-2" />
              <Skeleton className="h-3 w-1/2 mb-3" />
              <Skeleton className="h-4 w-full" />
            </div>
          ))
        ) : loadError ? (
          <div className="border-[3px] border-dashed border-foreground/30 p-6 text-center text-sm" role="alert">
            <p>{t('catalog.reviews.loadFailed', "We couldn't load reviews right now.")}</p>
            <Button variant="outline" size="sm" className="mt-3" onClick={() => load()}>
              <RotateCw className="h-4 w-4" aria-hidden="true" />
              {t('catalog.error.retry', 'Try again')}
            </Button>
          </div>
        ) : reviews && reviews.length > 0 ? (
          reviews.map((r) => (
            <article
              key={r.id}
              className="border-[3px] border-foreground bg-card text-card-foreground p-5 shadow-[4px_4px_0_0_hsl(var(--foreground))] dark:shadow-[4px_4px_0_0_hsl(var(--accent))]"
            >
              <div className="flex items-center justify-between gap-3 flex-wrap mb-2">
                <div className="flex items-center gap-3 min-w-0 flex-wrap">
                  <StarRow value={r.rating} size={16} />
                  <span className="font-bold text-sm truncate">{r.userName}</span>
                  {r.verifiedPurchase && (
                    <Badge variant="verified">{t('catalog.reviews.verified', 'Verified buyer')}</Badge>
                  )}
                </div>
                <span className="text-xs text-muted-foreground">{formatDate(r.createdAt)}</span>
              </div>
              {r.title && <h3 className="font-headline text-sm mb-2 [overflow-wrap:anywhere]">{r.title}</h3>}
              {r.body && <p className="text-sm whitespace-pre-wrap [overflow-wrap:anywhere]">{r.body}</p>}
            </article>
          ))
        ) : (
          <div className="border-[3px] border-dashed border-foreground/30 p-6 text-center text-sm text-muted-foreground">
            {t('catalog.reviews.empty', 'No reviews yet. Be the first to share your experience.')}
          </div>
        )}
      </div>
    </section>
  );
}
