'use client';

import { useCurrency } from '@/hooks/use-currency';
import type { Product } from '@/lib/types';
import Image from 'next/image';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import {
  Star,
  ShoppingCart,
  Plus,
  Minus,
  ArrowLeft,
  ArrowRight,
  X,
  Truck,
  Wallet,
  MessageCircle,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useCart } from '@/hooks/use-cart';
import { cn } from '@/lib/utils';
import { useTranslation } from '@/components/language-provider';
import { useSessionUser } from '@/hooks/use-session';
import { ProductReviews } from '@/components/product-reviews';
import { PRODUCT_FALLBACK_IMAGE } from '@/components/product-card';
import { formatMoney, type PaymentMethodId } from '@/lib/payments/common';
import { localeSettings } from '@/lib/i18n';
import { whatsappHref } from '@/lib/site-settings-shared';
import { track } from '@/lib/analytics';

export type ProductDetail = Product & {
  description: string;
  tags: string[];
  imageGallery: string[];
};

type Props = {
  product: ProductDetail;
  /** Store currency from the server (used until / unless the client currency loads). */
  currency: string;
  /** Payment methods customers can use right now. */
  paymentMethods: PaymentMethodId[];
  /** Shop WhatsApp number ("+963…") or null → no WhatsApp button. */
  whatsappNumber: string | null;
  /** Canonical URL of this page (shared in the WhatsApp message). */
  productUrl: string;
};

/** Descriptions longer than this (or with many lines) start collapsed with "Read more". */
const LONG_DESCRIPTION_CHARS = 360;
const LONG_DESCRIPTION_LINES = 6;
const MAX_QUANTITY = 99;

const navButtonClass =
  'inline-flex h-10 w-10 items-center justify-center border-[3px] border-foreground bg-background text-foreground shadow-[3px_3px_0_0_hsl(var(--foreground))] transition-transform [transition-timing-function:steps(2,end)] duration-75 hover:-translate-x-[2px] hover:-translate-y-[2px] hover:bg-accent hover:text-accent-foreground hover:shadow-[5px_5px_0_0_hsl(var(--foreground))] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none';

export function ProductDetailClient({ product, currency: serverCurrency, paymentMethods, whatsappNumber, productUrl }: Props) {
  const { currency: liveCurrency } = useCurrency();
  const currency = liveCurrency || serverCurrency;
  const { toast } = useToast();
  const { addToCart, getItemQuantity } = useCart();
  const { t, locale } = useTranslation();
  const isRtl = localeSettings[locale].dir === 'rtl';
  const { user } = useSessionUser();

  const [quantity, setQuantity] = useState(1);
  const [touchStartX, setTouchStartX] = useState<number | null>(null);
  const [expanded, setExpanded] = useState(false);
  // The cart lives in localStorage — only read it after hydration to avoid a mismatch.
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const gallery = useMemo(
    () =>
      product.imageGallery.length > 0
        ? product.imageGallery
        : product.imageUrl
          ? [product.imageUrl]
          : [PRODUCT_FALLBACK_IMAGE],
    [product.imageGallery, product.imageUrl]
  );
  const [activeIndex, setActiveIndex] = useState(0);
  const activeImage = gallery[activeIndex] || gallery[0];

  // Campaign analytics: one view_item per product page view, once the currency is known.
  const trackedFor = useRef<string | null>(null);
  useEffect(() => {
    if (!serverCurrency || trackedFor.current === product.id) return;
    trackedFor.current = product.id;
    track('view_item', {
      currency: serverCurrency,
      value: product.price,
      items: [{ item_id: product.id, item_name: product.name, price: product.price, quantity: 1 }],
    });
  }, [product.id, product.name, product.price, serverCurrency]);

  const handleAddToCart = () => {
    // Guests can add to cart (the cart merges into their account on login);
    // only store-owner accounts are blocked from buying.
    if (user?.role === 'store-owner') {
      toast({
        variant: 'destructive',
        title: t('auth.storeOwnerBlockedTitle'),
        description: t('auth.storeOwnerBlockedDesc'),
      });
      return;
    }

    // The cart is persisted (localStorage / server) — keep the stored item card-sized.
    addToCart({ ...product, description: undefined, tags: undefined, imageGallery: gallery.slice(0, 1) }, quantity);

    toast({
      title: t('productCard.addedTitle'),
      description: t('productCard.addedDescription', '', { name: `${quantity} × ${product.name}` }),
    });
    setQuantity(1); // Reset quantity after adding
  };

  // Real data only — no fake fallbacks (matches product-card.tsx).
  const rating = product.rating ?? 0;
  const reviewCount = product.reviewCount ?? 0;
  const hasReviews = reviewCount > 0;
  const filledStars = Math.round(Math.min(5, Math.max(0, rating)));
  const storeName = product.storeName || product.uploaderName || t('catalog.store.fallbackName', 'Store');
  const quantityInCart = mounted ? getItemQuantity(product.id) : 0;

  const description = product.description.trim();
  const isLongDescription =
    description.length > LONG_DESCRIPTION_CHARS || description.split('\n').length > LONG_DESCRIPTION_LINES;

  const paymentLabels = paymentMethods.map((m) => t(`payment.methods.${m}.label`));
  const whatsappLink = whatsappHref(
    whatsappNumber,
    t('catalog.product.whatsappMessage', 'Hi! I have a question about "{name}": {url}', {
      name: product.name,
      url: productUrl,
    })
  );

  const goToPrev = () => setActiveIndex((i) => (i - 1 + gallery.length) % gallery.length);
  const goToNext = () => setActiveIndex((i) => (i + 1) % gallery.length);

  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchStartX(e.touches[0]?.clientX ?? null);
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX === null) return;
    const delta = (e.changedTouches[0]?.clientX || 0) - touchStartX;
    if (Math.abs(delta) > 40) {
      // Swiping towards the reading direction's end shows the previous image.
      const towardsEnd = isRtl ? delta < 0 : delta > 0;
      if (towardsEnd) goToPrev();
      else goToNext();
    }
    setTouchStartX(null);
  };

  return (
    <div className="container mx-auto max-w-4xl py-12 px-4 sm:px-6 lg:px-8">
      <Card className="overflow-hidden">
        <div className="grid md:grid-cols-2 gap-8 lg:gap-12">
          <div className="flex flex-col gap-3">
            <div
              className="relative w-full max-w-[92vw] md:max-w-3xl mx-auto aspect-square"
              onTouchStart={handleTouchStart}
              onTouchEnd={handleTouchEnd}
            >
              {/* Pixel-frame image stage — Recycled Tissue background to match brand */}
              <div
                className="absolute inset-3 sm:inset-6 border-[3px] border-foreground"
                style={{ background: 'hsl(var(--recycled-tissue))' }}
              />
              <div className="absolute inset-4 sm:inset-7 overflow-hidden">
                <Image
                  src={activeImage}
                  alt={product.name}
                  fill
                  // The main image is the LCP element: load it eagerly at its real size.
                  priority={activeIndex === 0}
                  sizes="(max-width: 768px) 90vw, 420px"
                  className="object-contain"
                  data-ai-hint={product.imageHint}
                />
              </div>
              <Badge variant="creator" className="absolute top-4 end-4 sm:top-6 sm:end-6 z-20 max-w-[55%]">
                <span className="truncate">{storeName}</span>
              </Badge>

              {/* Close — pixel-frame button, back to /products */}
              <Link
                href="/products"
                aria-label={t('productDetail.close')}
                className={cn('absolute start-6 top-6 sm:start-8 sm:top-8 z-20', navButtonClass)}
              >
                <X className="h-5 w-5" aria-hidden="true" />
              </Link>

              {gallery.length > 1 && (
                <>
                  <button
                    type="button"
                    onClick={goToPrev}
                    aria-label={t('catalog.product.prevImage', 'Previous image')}
                    className={cn('absolute start-6 sm:start-8 top-1/2 -translate-y-1/2 z-20', navButtonClass)}
                  >
                    <ArrowLeft className="h-5 w-5 rtl:rotate-180" aria-hidden="true" />
                  </button>
                  <button
                    type="button"
                    onClick={goToNext}
                    aria-label={t('catalog.product.nextImage', 'Next image')}
                    className={cn('absolute end-6 sm:end-8 top-1/2 -translate-y-1/2 z-20', navButtonClass)}
                  >
                    <ArrowRight className="h-5 w-5 rtl:rotate-180" aria-hidden="true" />
                  </button>

                  {/* Image counter */}
                  <div
                    className="absolute bottom-6 sm:bottom-8 left-1/2 -translate-x-1/2 z-20 border-[2px] border-foreground bg-background px-2 py-1 font-headline text-xs tracking-wider"
                    aria-live="polite"
                  >
                    {t('catalog.product.imageCounter', '{n} / {total}', { n: activeIndex + 1, total: gallery.length })}
                  </div>
                </>
              )}
            </div>

            {/* Thumbnails — pixel-frame, active state inverts to Arcade Yellow */}
            {gallery.length > 1 && (
              <div className="grid grid-cols-4 gap-3 mt-4 px-4">
                {gallery.map((img, i) => (
                  <button
                    key={`${img}-${i}`}
                    type="button"
                    onClick={() => setActiveIndex(i)}
                    aria-label={t('catalog.product.viewImage', 'View image {n} of {total}', { n: i + 1, total: gallery.length })}
                    aria-pressed={activeIndex === i}
                    className={cn(
                      'relative aspect-square overflow-hidden border-[3px] border-foreground',
                      'transition-transform [transition-timing-function:steps(2,end)] duration-75',
                      activeIndex === i
                        ? 'shadow-[4px_4px_0_0_hsl(var(--accent))] ring-[3px] ring-accent ring-offset-2 ring-offset-background'
                        : 'shadow-[3px_3px_0_0_hsl(var(--foreground))] hover:-translate-x-[1px] hover:-translate-y-[1px] hover:shadow-[4px_4px_0_0_hsl(var(--foreground))]'
                    )}
                  >
                    <Image src={img} alt="" fill sizes="(max-width: 768px) 22vw, 100px" className="object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="flex flex-col p-6 sm:p-8 min-w-0">
            <h1 className="font-headline text-xl sm:text-3xl lg:text-4xl [overflow-wrap:anywhere]">{product.name}</h1>
            <p className="text-muted-foreground mt-2 text-lg [overflow-wrap:anywhere]">{product.category}</p>
            <div className="text-sm text-muted-foreground mt-2">
              {product.storeSlug ? (
                <>
                  {t('catalog.product.storeLabel', 'Store:')}{' '}
                  <Link
                    href={`/stores/${product.storeSlug}`}
                    className="font-bold text-foreground underline decoration-primary decoration-2 underline-offset-4 hover:bg-accent hover:text-accent-foreground dark:text-primary dark:hover:text-accent-foreground"
                  >
                    {storeName}
                  </Link>
                </>
              ) : (
                <>{t('catalog.product.byStore', 'By {store}', { store: storeName })}</>
              )}
            </div>

            <div className="flex items-center mt-4">
              {hasReviews ? (
                <>
                  <div className="flex items-center" aria-hidden="true">
                    {[0, 1, 2, 3, 4].map((i) => (
                      <Star
                        key={i}
                        className={cn('w-5 h-5', i < filledStars ? 'fill-accent text-foreground' : 'fill-transparent text-foreground/40')}
                      />
                    ))}
                  </div>
                  <span className="ms-2 text-muted-foreground text-sm">
                    {t('productDetail.rating', '', { rating: rating.toFixed(1), count: reviewCount })}
                  </span>
                </>
              ) : (
                <span className="text-muted-foreground text-sm italic">
                  {t('productDetail.noReviews', 'No reviews yet')}
                </span>
              )}
            </div>

            <Separator className="my-6" />

            {description ? (
              <div>
                <p
                  id="product-description"
                  className={cn(
                    'text-muted-foreground text-base leading-relaxed whitespace-pre-line [overflow-wrap:anywhere]',
                    isLongDescription && !expanded && 'line-clamp-6'
                  )}
                >
                  {description}
                </p>
                {isLongDescription && (
                  <button
                    type="button"
                    onClick={() => setExpanded((v) => !v)}
                    aria-expanded={expanded}
                    aria-controls="product-description"
                    className="mt-2 text-sm font-bold text-foreground underline decoration-primary decoration-2 underline-offset-4 hover:bg-accent hover:text-accent-foreground"
                  >
                    {expanded ? t('catalog.product.showLess', 'Show less') : t('catalog.product.readMore', 'Read more')}
                  </button>
                )}
              </div>
            ) : (
              <p className="text-muted-foreground text-base leading-relaxed">{t('productDetail.noDescription')}</p>
            )}

            {/* Specs — from the fields every product has */}
            <section className="mt-6" aria-labelledby="product-specs-heading">
              <h2 id="product-specs-heading" className="font-headline text-xs tracking-wider mb-3">
                {t('catalog.product.specsTitle', 'Details')}
              </h2>
              <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm">
                <dt className="text-muted-foreground">{t('catalog.product.specCategory', 'Category')}</dt>
                <dd className="font-medium [overflow-wrap:anywhere]">{product.category}</dd>
                <dt className="text-muted-foreground">{t('catalog.product.specMade', 'Made by')}</dt>
                <dd className="font-medium [overflow-wrap:anywhere]">{storeName}</dd>
                {product.tags.length > 0 && (
                  <>
                    <dt className="text-muted-foreground">{t('catalog.product.specTags', 'Tags')}</dt>
                    <dd className="flex flex-wrap gap-2">
                      {product.tags.map((tag) => (
                        <Badge key={tag} variant="secondary">
                          {tag}
                        </Badge>
                      ))}
                    </dd>
                  </>
                )}
              </dl>
            </section>

            {/* Delivery & payment */}
            <section
              className="mt-6 border-[3px] border-foreground bg-muted/40 p-4"
              aria-labelledby="product-delivery-heading"
            >
              <h2 id="product-delivery-heading" className="font-headline text-xs tracking-wider mb-3">
                {t('catalog.product.deliveryTitle', 'Delivery & payment')}
              </h2>
              <ul className="space-y-3 text-sm">
                <li className="flex gap-3">
                  <Truck className="h-5 w-5 shrink-0" aria-hidden="true" />
                  <span>
                    {t(
                      'catalog.product.deliveryText',
                      'Delivered across Syria — fee and time confirmed by phone/WhatsApp after ordering'
                    )}
                  </span>
                </li>
                <li className="flex gap-3">
                  <Wallet className="h-5 w-5 shrink-0" aria-hidden="true" />
                  <span>
                    {paymentLabels.length > 0
                      ? t('catalog.product.paymentAccepted', 'Payment: {methods}', {
                          methods: paymentLabels.join(locale === 'ar' ? '، ' : ', '),
                        })
                      : t('catalog.product.paymentAtCheckout', 'Payment options are shown at checkout.')}
                  </span>
                </li>
              </ul>
            </section>

            <div className="flex-grow" />

            <Separator className="my-6" />

            <div className="flex flex-col sm:flex-row sm:flex-wrap sm:items-center sm:justify-between gap-4">
              <p className="text-3xl sm:text-4xl font-bold">{formatMoney(product.price, currency)}</p>

              <div className="flex flex-wrap items-center gap-4 justify-start sm:justify-end">
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                    disabled={quantity <= 1}
                    aria-label={t('catalog.product.decrease', 'Decrease quantity')}
                  >
                    <Minus className="h-4 w-4" aria-hidden="true" />
                  </Button>
                  <span className="text-xl font-bold w-10 text-center" aria-live="polite">
                    <span className="sr-only">{t('catalog.product.quantity', 'Quantity')}: </span>
                    {quantity}
                  </span>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => setQuantity((q) => Math.min(MAX_QUANTITY, q + 1))}
                    disabled={quantity >= MAX_QUANTITY}
                    aria-label={t('catalog.product.increase', 'Increase quantity')}
                  >
                    <Plus className="h-4 w-4" aria-hidden="true" />
                  </Button>
                </div>
                <Button size="lg" className="min-w-[160px] justify-center flex-shrink-0" onClick={handleAddToCart}>
                  <ShoppingCart className="me-2 h-5 w-5" aria-hidden="true" />
                  {t('productDetail.addToCart')}
                </Button>
              </div>
            </div>
            {quantityInCart > 0 && (
              <p className="text-sm text-center mt-4 text-muted-foreground">
                {t('productDetail.inCart', '', { count: quantityInCart })}
              </p>
            )}
            {whatsappLink && (
              <Button asChild variant="outline" className="mt-4 h-auto min-h-10 whitespace-normal text-center">
                <a href={whatsappLink} target="_blank" rel="noopener noreferrer">
                  <MessageCircle className="h-4 w-4" aria-hidden="true" />
                  {t('catalog.product.askWhatsapp', 'Ask about this product on WhatsApp')}
                </a>
              </Button>
            )}
          </div>
        </div>
      </Card>

      {/* Phase 2 — reviews */}
      <ProductReviews productId={product.id} />
    </div>
  );
}
