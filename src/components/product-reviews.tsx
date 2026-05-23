'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Star } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { useSessionUser } from '@/hooks/use-session';
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

function StarRow({
  value,
  size = 18,
  interactive = false,
  onChange,
}: {
  value: number;
  size?: number;
  interactive?: boolean;
  onChange?: (v: number) => void;
}) {
  return (
    <div className="inline-flex gap-1" role={interactive ? 'radiogroup' : 'img'} aria-label={`${value} of 5 stars`}>
      {[1, 2, 3, 4, 5].map((n) => {
        const filled = value >= n;
        const star = (
          <Star
            className={cn(
              filled ? 'fill-accent text-accent' : 'fill-transparent text-foreground/40',
              'shrink-0'
            )}
            style={{ width: size, height: size }}
          />
        );
        if (!interactive) return <span key={n}>{star}</span>;
        return (
          <button
            key={n}
            type="button"
            aria-label={`Rate ${n} of 5`}
            onClick={() => onChange?.(n)}
            className="hover:scale-110 transition-transform [transition-timing-function:steps(2,end)] duration-75"
          >
            {star}
          </button>
        );
      })}
    </div>
  );
}

function formatDate(iso: string) {
  try {
    const d = new Date(iso);
    return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
  } catch {
    return iso;
  }
}

export function ProductReviews({ productId }: { productId: string }) {
  const { user } = useSessionUser();
  const { toast } = useToast();

  const [reviews, setReviews] = useState<Review[] | null>(null);
  const [loading, setLoading] = useState(true);

  // Form state
  const [rating, setRating] = useState(0);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Load reviews
  const load = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/products/${productId}/reviews`);
      const data = await res.json();
      setReviews(data.reviews || []);
    } catch {
      setReviews([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [productId]);

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

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      toast({ variant: 'destructive', title: 'Sign in', description: 'Log in to leave a review.' });
      return;
    }
    if (rating < 1) {
      toast({ variant: 'destructive', title: 'Pick a rating', description: 'Choose 1 to 5 stars.' });
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
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Failed to save review');
      }
      toast({ title: myReview ? 'Review updated' : 'Review posted', description: 'Thanks for the feedback.' });
      await load();
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Could not save', description: err.message });
    } finally {
      setSubmitting(false);
    }
  };

  const remove = async () => {
    if (!confirm('Delete your review?')) return;
    try {
      const res = await fetch(`/api/products/${productId}/reviews`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete');
      setRating(0);
      setTitle('');
      setBody('');
      await load();
      toast({ title: 'Review deleted' });
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Could not delete', description: err.message });
    }
  };

  return (
    <section className="mt-16">
      <div className="flex items-center gap-3 mb-6">
        <span className="font-headline text-xs px-3 py-2 bg-foreground text-background">RV</span>
        <h2 className="font-headline text-2xl md:text-3xl">Reviews</h2>
      </div>

      {/* Review form */}
      <div className="border-[3px] border-foreground bg-card text-card-foreground p-5 shadow-[6px_6px_0_0_hsl(var(--foreground))] dark:shadow-[6px_6px_0_0_hsl(var(--accent))] mb-8">
        {!user ? (
          <div className="text-sm">
            <p className="mb-3">
              <span className="font-headline text-xs">SIGN IN</span> to leave a review for this model.
            </p>
            <Button asChild>
              <Link href="/login">Sign in</Link>
            </Button>
          </div>
        ) : (
          <form onSubmit={submit} className="flex flex-col gap-3">
            <div className="flex items-center gap-3">
              <span className="font-headline text-[10px] uppercase tracking-wider">Your rating</span>
              <StarRow value={rating} interactive onChange={setRating} size={22} />
            </div>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Short headline (optional)"
              maxLength={120}
              aria-label="Review title"
            />
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="What did you think? Print quality, fit, surprises..."
              maxLength={4000}
              rows={4}
              aria-label="Review body"
              className="border-[3px] border-foreground bg-background text-foreground px-3 py-2 text-sm font-mono shadow-[3px_3px_0_0_hsl(var(--foreground))] focus:bg-accent focus:text-accent-foreground outline-none resize-y"
            />
            <div className="flex items-center gap-3 flex-wrap">
              <Button type="submit" disabled={submitting}>
                {submitting ? 'Saving…' : myReview ? 'Update review' : 'Post review'}
              </Button>
              {myReview && (
                <Button type="button" variant="outline" onClick={remove}>
                  Delete review
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
        ) : reviews && reviews.length > 0 ? (
          reviews.map((r) => (
            <article
              key={r.id}
              className="border-[3px] border-foreground bg-card text-card-foreground p-5 shadow-[4px_4px_0_0_hsl(var(--foreground))] dark:shadow-[4px_4px_0_0_hsl(var(--accent))]"
            >
              <div className="flex items-center justify-between gap-3 flex-wrap mb-2">
                <div className="flex items-center gap-3 min-w-0">
                  <StarRow value={r.rating} size={16} />
                  <span className="font-bold text-sm truncate">{r.userName}</span>
                  {r.verifiedPurchase && <Badge variant="verified">VERIFIED BUYER</Badge>}
                </div>
                <span className="text-xs text-muted-foreground">{formatDate(r.createdAt)}</span>
              </div>
              {r.title && <h3 className="font-headline text-sm mb-2">{r.title}</h3>}
              {r.body && <p className="text-sm whitespace-pre-wrap">{r.body}</p>}
            </article>
          ))
        ) : (
          <div className="border-[3px] border-dashed border-foreground/30 p-6 text-center text-sm text-muted-foreground">
            No reviews yet. Be the first to share your experience.
          </div>
        )}
      </div>
    </section>
  );
}
