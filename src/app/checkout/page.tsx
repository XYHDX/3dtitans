'use client';

import { useCurrency } from '@/hooks/use-currency';
import { useCart } from '@/hooks/use-cart';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import Image from 'next/image';
import Link from 'next/link';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useSessionUser } from '@/hooks/use-session';
import { useAddresses, type Address } from '@/hooks/use-addresses';
import { useTranslation } from '@/components/language-provider';
import { MapPin } from 'lucide-react';
import { DeliveryNote, newOrderFlagKey } from '@/components/delivery-note';
import { PaymentMethodPicker } from '@/components/payment-method-picker';
import type { PaymentMethod } from '@/hooks/use-payment-settings';
import {
  DEFAULT_COUNTRY,
  GovernorateSelect,
  isSyria,
  matchGovernorate,
  useGovernorateLabel,
} from '@/components/governorate-select';
import { orderReference } from '@/lib/payments/common';
import { track } from '@/lib/analytics';
import type { Order } from '@/lib/types';

type AddressFormData = {
  fullName: string;
  email: string;
  phoneNumber: string;
  addressLine1: string;
  city: string;
  postalCode?: string;
  country: string;
  notes?: string;
};

/** Same rule as the orders API; Arabic-Indic / Persian digits are accepted. */
const PHONE_RE = /^\+?[0-9\s\-()]{7,30}$/;
const toAsciiDigits = (s: string) => s.replace(/[\u0660-\u0669\u06F0-\u06F9]/g, (d) => String(d.charCodeAt(0) & 0xf));

/** Max distinct products per order (same limit as the orders API). */
const MAX_CART_LINES = 50;

type ErrorMessage = [key: string, fallback: string, vars?: Record<string, string | number>];

/**
 * Turn an orders-API failure into a translated, customer-friendly message.
 * Uses the API's `code` when present; the raw server text is logged, never shown.
 * `unavailableNames` = names (from the local cart) of products the API reported unavailable.
 */
function orderErrorMessage(status: number, body: any, unavailableNames: string[] = []): ErrorMessage {
  const code = typeof body?.code === 'string' ? body.code : '';
  const raw = String(body?.error || '').toLowerCase();
  if (status === 401) return ['checkout.errors.session', 'Your session has expired. Please log in again to place your order.'];
  if (status === 403) return ['checkout.storeOwnerBlockedDesc', 'Store owner accounts cannot place orders. Please use a customer account.'];
  if (status === 429) return ['checkout.errors.tooMany', 'Too many orders in a short time. Please wait a few minutes and try again.'];
  if (code === 'idempotency_cart_mismatch') {
    return ['checkout.errors.cartChanged', 'Your cart changed while you were checking out. Please review your order and press "Place order" again.'];
  }
  if (status === 409 || raw.includes('idempotency')) {
    return ['checkout.errors.retry', 'Something went wrong with this checkout. Please press "Place order" again.'];
  }
  if (code === 'product_unavailable' || Array.isArray(body?.missingIds)) {
    return unavailableNames.length
      ? [
          'checkout.errors.productUnavailableNamed',
          'No longer available (removed from your cart): {names}. Please review your order and place it again.',
          { names: unavailableNames.join(', ') },
        ]
      : ['checkout.errors.productUnavailable', 'Some items in your cart are no longer available and were removed. Please review your order and place it again.'];
  }
  if (code === 'invalid_quantity') {
    return ['checkout.errors.invalidQuantity', 'Each quantity must be a whole number from 1 to 99. Please adjust your cart and try again.'];
  }
  if (code === 'invalid_cart') {
    return raw.includes('between')
      ? ['checkout.errors.cartSize', 'An order can contain between 1 and {max} different products. Please adjust your cart and try again.', { max: MAX_CART_LINES }]
      : ['checkout.errors.invalidCart', 'Something in your cart is out of date. Please refresh the page and try again.'];
  }
  if (status === 400) {
    if (raw.includes('phone')) return ['checkout.errors.phone', 'A valid phone number is required.'];
    if (raw.includes('payment method')) {
      return ['checkout.errors.methodUnavailable', 'This payment method is not available right now. Please choose another one.'];
    }
    if (raw.includes('address') || raw.includes('shipping')) {
      return ['checkout.errors.addressIncomplete', 'Please complete your delivery address.'];
    }
    return ['checkout.errors.invalid', "We couldn't place your order. Please check your details and try again."];
  }
  return ['checkout.errors.server', "We couldn't place your order right now. Your cart is saved — please try again in a minute."];
}

export default function CheckoutPage() {
  const { format: formatPrice, currency } = useCurrency();
  const { cart, clearCart, total, removeFromCart, loading: cartLoading } = useCart();
  const { user, status: sessionStatus } = useSessionUser();
  const { toast } = useToast();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  // True while the browser is leaving for Stripe / ShamCash — keeps the button disabled.
  const [redirecting, setRedirecting] = useState(false);
  const { t } = useTranslation();
  const governorateLabel = useGovernorateLabel();

  const addressSchema = useMemo(
    () =>
      z.object({
        fullName: z.string().trim().min(3, t('checkout.errors.fullName')),
        email: z.string().email(t('checkout.errors.email')),
        phoneNumber: z
          .string()
          .trim()
          .refine((v) => PHONE_RE.test(toAsciiDigits(v)), t('checkout.errors.phone')),
        addressLine1: z.string().trim().min(5, t('checkout.errors.areaStreet', 'Please enter your area, street and a nearby landmark.')),
        city: z.string().trim().min(2, t('checkout.errors.governorate', 'Please choose your governorate.')),
        // Most Syrian addresses have no postal code — optional everywhere.
        postalCode: z.string().trim().max(20).optional().or(z.literal('')),
        country: z.string().trim().min(2, t('checkout.errors.country')),
        notes: z.string().max(500, t('checkout.errors.notesMax')).optional().or(z.literal('')),
      }),
    [t]
  );

  const { register, handleSubmit, formState: { errors }, setValue, watch, getValues } = useForm<AddressFormData>({
    resolver: zodResolver(addressSchema),
    defaultValues: { country: DEFAULT_COUNTRY, city: '', postalCode: '' },
  });
  const country = watch('country');
  const syria = isSyria(country);

  // Switching back to Syria: keep the city only if it is one of the governorates.
  useEffect(() => {
    if (syria) {
      const current = getValues('city');
      if (current && !matchGovernorate(current)) setValue('city', '');
    }
  }, [syria, getValues, setValue]);

  // Saved addresses — pre-fill from default
  const { addresses, defaultAddress, loading: addressesLoading } = useAddresses();
  const [selectedAddressId, setSelectedAddressId] = useState<string>('');

  // Payment method (Phase 4)
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod | ''>('');

  // Idempotency key (Phase 6) — fetched once per checkout visit. Sent with the
  // POST so accidental double-clicks / network retries return the existing
  // order instead of creating duplicates. Re-fetched on full navigation to /checkout.
  const [idempotencyKey, setIdempotencyKey] = useState<string>('');
  const fetchIdempotencyKey = useCallback(async (): Promise<string> => {
    try {
      const res = await fetch('/api/orders/idempotency-key', { cache: 'no-store' });
      const data = await res.json();
      if (typeof data?.idempotencyKey === 'string') return data.idempotencyKey;
    } catch {
      // handled by the caller
    }
    return '';
  }, []);
  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    fetchIdempotencyKey().then((key) => {
      // If this fails we retry once more when the order is placed.
      if (!cancelled && key) setIdempotencyKey(key);
    });
    return () => { cancelled = true; };
  }, [user, fetchIdempotencyKey]);

  useEffect(() => {
    if (user) {
      setValue('fullName', user.displayName || '');
      setValue('email', user.email || '');
    }
  }, [user, setValue]);

  const fillFromAddress = useCallback(
    (a: Address) => {
      const addrCountry = a.country || DEFAULT_COUNTRY;
      setValue('fullName', a.name);
      setValue('phoneNumber', a.phone || '');
      setValue('addressLine1', [a.line1, a.line2].filter(Boolean).join(', '));
      setValue('country', addrCountry);
      // Legacy free-text cities that aren't a governorate must be re-picked.
      setValue('city', isSyria(addrCountry) ? matchGovernorate(a.city) : a.city);
      setValue('postalCode', a.postalCode || '');
    },
    [setValue]
  );

  // When saved addresses load, auto-pick the default and pre-fill the form
  useEffect(() => {
    if (!defaultAddress || selectedAddressId) return;
    setSelectedAddressId(defaultAddress.id);
    fillFromAddress(defaultAddress);
  }, [defaultAddress, selectedAddressId, fillFromAddress]);

  // User explicitly picks a different saved address
  function pickAddress(id: string) {
    setSelectedAddressId(id);
    const a = addresses.find((x) => x.id === id);
    if (a) fillFromAddress(a);
  }

  // Analytics: begin_checkout once per visit, as soon as the cart and currency are known.
  const beganCheckout = useRef(false);
  useEffect(() => {
    if (beganCheckout.current || !user || cart.length === 0 || !currency) return;
    beganCheckout.current = true;
    track('begin_checkout', {
      currency,
      value: Math.round(total * 100) / 100,
      items: cart.map((it) => ({ item_id: it.id, item_name: it.name, price: it.price, quantity: it.quantity })),
    });
  }, [user, cart, currency, total]);

  const showError = ([key, fallback, vars]: ErrorMessage) =>
    toast({ variant: 'destructive', title: t('checkout.toastErrorTitle'), description: t(key, fallback, vars) });

  const handlePlaceOrder = async (addressData: AddressFormData) => {
    if (cart.length === 0) {
      toast({ variant: 'destructive', title: t('checkout.toastEmptyTitle'), description: t('checkout.toastEmptyDesc') });
      return;
    }
    if (!user) {
      toast({ variant: 'destructive', title: t('checkout.loginRequiredTitle'), description: t('checkout.loginRequiredDesc') });
      router.push(`/login?next=${encodeURIComponent('/checkout')}`);
      return;
    }
    if (!paymentMethod) {
      toast({
        variant: 'destructive',
        title: t('checkout.pickMethodTitle', 'Choose a payment method'),
        description: t('checkout.pickMethodDesc', 'Please choose how you want to pay.'),
      });
      return;
    }
    if (user.role === 'store-owner') {
      toast({ variant: 'destructive', title: t('checkout.storeOwnerBlockedTitle'), description: t('checkout.storeOwnerBlockedDesc') });
      return;
    }
    if (cart.length > MAX_CART_LINES) {
      showError(['checkout.errors.cartSize', 'An order can contain between 1 and {max} different products. Please adjust your cart and try again.', { max: MAX_CART_LINES }]);
      return;
    }

    setLoading(true);

    try {
      let key = idempotencyKey;
      if (!key) {
        key = await fetchIdempotencyKey();
        if (key) setIdempotencyKey(key);
      }
      if (!key) {
        showError(['checkout.errors.notReady', "We couldn't start checkout. Please check your connection and try again."]);
        return;
      }

      // SECURITY: we send ONLY {productId, quantity} per item. Prices, names,
      // images, and totals are server-authoritative — the server fetches the
      // current price from Postgres so a malicious client cannot edit the
      // request body to pay $0.01 for a $99 product. Assignees are derived
      // server-side too. Idempotency key prevents double-clicks creating dupes.
      const orderData = {
        items: cart.map((item) => ({
          productId: item.id,
          quantity: item.quantity,
        })),
        shippingAddress: {
          fullName: addressData.fullName,
          addressLine1: addressData.addressLine1,
          city: addressData.city,
          postalCode: addressData.postalCode || '',
          country: addressData.country || DEFAULT_COUNTRY,
        },
        phoneNumber: toAsciiDigits(addressData.phoneNumber),
        customerEmail: addressData.email,
        isPrioritized: false,
        notes: addressData.notes || '',
        paymentMethod,
        idempotencyKey: key,
      };

      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(orderData),
      });
      const body = await res.json().catch(() => ({}));
      const order: Order | undefined = res.ok ? body?.order : undefined;
      if (!order?.id) {
        console.error('Failed to place order:', res.status, body?.error || body);
        if (res.status === 401) {
          showError(orderErrorMessage(401, body));
          router.push(`/login?next=${encodeURIComponent('/checkout')}`);
          return;
        }
        // Archived / removed products: tell the customer which ones and drop them from the cart.
        let unavailableNames: string[] = [];
        if (Array.isArray(body?.missingIds)) {
          const missing = new Set((body.missingIds as unknown[]).map(String));
          unavailableNames = cart.filter((it) => missing.has(it.id)).map((it) => it.name);
          missing.forEach((id) => removeFromCart(id));
        }
        if (res.status === 409 || body?.code === 'idempotency_cart_mismatch' || String(body?.error || '').toLowerCase().includes('idempotency')) {
          // The key belongs to an earlier submission: get a fresh one so the
          // next "Place order" click starts a new, clean attempt.
          setIdempotencyKey('');
          fetchIdempotencyKey().then((k) => k && setIdempotencyKey(k));
        }
        showError(orderErrorMessage(res.status, body, unavailableNames));
        return;
      }

      // Lets the success page report the purchase exactly once for this new order.
      try { sessionStorage.setItem(newOrderFlagKey(order.id), '1'); } catch {}
      const successUrl = `/checkout/success?orderId=${encodeURIComponent(order.id)}`;

      // Stripe path — redirect to hosted checkout instead of the local success page.
      if (paymentMethod === 'stripe') {
        const stripeRes = await fetch('/api/payments/stripe/checkout', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ orderId: order.id }),
        });
        const stripeData = await stripeRes.json().catch(() => ({}));
        if (stripeRes.ok && stripeData.url) {
          clearCart();
          setRedirecting(true);
          window.location.href = stripeData.url;
          return;
        }
        // The order exists; the customer can retry the card payment from the success page.
        console.error('Stripe checkout failed:', stripeRes.status, stripeData?.error);
        toast({
          variant: 'destructive',
          title: t('checkout.cardUnavailableTitle', 'Card payment unavailable'),
          description: t('checkout.cardUnavailableDesc', 'Your order was saved. You can try paying again from the next page, or contact us.'),
        });
        clearCart();
        router.push(successUrl);
        return;
      }

      // ShamCash online payment — create the bill just-in-time and go to ShamCash
      // (normal navigation: the link opens the ShamCash app when it is installed).
      // On failure the order still exists; the success page offers "Try again".
      if (paymentMethod === 'sham_cash_epay') {
        clearCart();
        try {
          const shamRes = await fetch('/api/payments/shamcash/create', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ orderId: order.id }),
          });
          const shamData = await shamRes.json().catch(() => ({}));
          if (shamRes.ok && typeof shamData.paymentUrl === 'string' && shamData.paymentUrl) {
            setRedirecting(true);
            window.location.assign(shamData.paymentUrl);
            return;
          }
        } catch {
          // handled below
        }
        toast({
          variant: 'destructive',
          title: t('checkout.shamcashStartFailedTitle'),
          description: t('checkout.shamcashStartFailedDesc'),
        });
        router.push(successUrl);
        return;
      }

      toast({
        title: t('checkout.toastSuccessTitle'),
        description: t('checkout.toastPlacedDesc', 'Your order number is {ref}.', { ref: orderReference(order.id) }),
      });
      clearCart();
      router.push(successUrl);

    } catch (error) {
      console.error('Failed to place order:', error);
      showError(['checkout.errors.network', "We couldn't reach the store. Please check your connection and try again."]);
    } finally {
        setLoading(false);
    }
  };

  if (sessionStatus === 'loading') {
    return (
      <div className="container mx-auto py-12 px-4 sm:px-6 lg:px-8">
        <div className="grid lg:grid-cols-2 gap-12 max-w-6xl mx-auto">
          <Skeleton className="h-96 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="container mx-auto py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-xl mx-auto text-center space-y-4">
          <h1 className="font-headline text-4xl">{t('checkout.loginRequiredTitle')}</h1>
          <p className="text-muted-foreground">{t('checkout.loginRequiredDesc')}</p>
          <Button asChild size="lg">
            <Link href={`/login?next=${encodeURIComponent('/checkout')}`}>{t('checkout.loginCta')}</Link>
          </Button>
        </div>
      </div>
    );
  }

  if (user.role === 'store-owner') {
    return (
      <div className="container mx-auto py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-xl mx-auto text-center space-y-4">
          <h1 className="font-headline text-4xl text-destructive">{t('checkout.storeOwnerBlockedTitle')}</h1>
          <p className="text-muted-foreground">{t('checkout.storeOwnerBlockedDesc')}</p>
          <div className="flex items-center justify-center gap-3">
            <Button asChild variant="secondary">
              <Link href="/store-dashboard">{t('nav.store')}</Link>
            </Button>
            <Button asChild>
              <Link href="/">{t('checkout.emptyCta')}</Link>
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const fieldError = (msg?: string, id?: string) =>
    msg ? <p id={id} className="text-xs text-destructive">{msg}</p> : null;

  return (
    <div className="container mx-auto py-12 px-4 sm:px-6 lg:px-8">
      <h1 className="font-headline text-3xl md:text-4xl max-w-6xl mx-auto mb-8">{t('nav.checkout')}</h1>
      <div className="grid lg:grid-cols-2 gap-12 max-w-6xl mx-auto">
        <div>
          <Card>
            <CardHeader>
              <CardTitle className="text-2xl font-headline">
                <h2>{t('checkout.formTitle')}</h2>
              </CardTitle>
              <CardDescription>{t('checkout.formSubtitle')}</CardDescription>
            </CardHeader>
            <CardContent>
              {/* Saved-address picker — appears for logged-in users with at least one address.
                  Selecting an entry pre-fills the form below. New addresses are saved on
                  /account/addresses (linked at the bottom). */}
              {addresses.length > 0 && (
                <div className="mb-6 border-[3px] border-foreground bg-card p-4 shadow-[4px_4px_0_0_hsl(var(--foreground))] dark:shadow-[4px_4px_0_0_hsl(var(--accent))]">
                  <div className="flex items-center justify-between gap-3 mb-3 flex-wrap">
                    <div className="flex items-center gap-2">
                      <MapPin className="h-4 w-4" />
                      <span className="font-headline text-xs uppercase tracking-wider">{t('checkout.useSavedAddress', 'Use a saved address')}</span>
                    </div>
                    <Link href="/account/addresses" className="text-xs underline decoration-primary decoration-2 underline-offset-2 hover:text-accent-foreground hover:bg-accent px-1">
                      {t('checkout.manageAddresses', 'Manage addresses')}
                    </Link>
                  </div>
                  <div className="grid sm:grid-cols-2 gap-2">
                    {addresses.map((a) => (
                      <button
                        key={a.id}
                        type="button"
                        onClick={() => pickAddress(a.id)}
                        aria-pressed={selectedAddressId === a.id}
                        className={`text-start border-[2px] border-foreground p-3 text-xs transition-transform [transition-timing-function:steps(2,end)] duration-75 hover:-translate-x-[1px] hover:-translate-y-[1px] hover:shadow-[2px_2px_0_0_hsl(var(--foreground))] ${
                          selectedAddressId === a.id ? 'bg-accent text-accent-foreground' : 'bg-background'
                        }`}
                      >
                        <div className="flex items-center gap-2 mb-1">
                          {a.label && <span className="font-headline text-[10px]">{a.label}</span>}
                          {a.isDefault && (
                            <span className="font-headline text-[10px] bg-foreground text-background px-1">{t('addressBook.defaultBadge', 'Default')}</span>
                          )}
                        </div>
                        <div className="font-bold">{a.name}</div>
                        <div className={selectedAddressId === a.id ? '' : 'text-muted-foreground'}>
                          {[a.line1, governorateLabel(a.city), a.postalCode, a.country].filter(Boolean).join(', ')}
                        </div>
                      </button>
                    ))}
                  </div>
                  <p className="text-[11px] text-muted-foreground mt-3">
                    {t('checkout.savedAddressHint', "Need to change something? Edit the fields below — your saved address won't change.")}
                  </p>
                </div>
              )}
              {addresses.length === 0 && !addressesLoading && (
                <p className="text-xs text-muted-foreground mb-4">
                  <Link href="/account/addresses" className="underline decoration-primary decoration-2 underline-offset-2 text-foreground hover:bg-accent hover:text-accent-foreground">
                    {t('checkout.saveAddressTip', 'Save your address for faster checkout next time')}
                  </Link>
                </p>
              )}

              <form id="shipping-form" onSubmit={handleSubmit(handlePlaceOrder)} className="grid gap-4" noValidate>
                 <div className="grid gap-2">
                    <Label htmlFor="fullName">{t('checkout.labels.fullName')}</Label>
                    <Input id="fullName" autoComplete="name" aria-invalid={!!errors.fullName} aria-describedby={errors.fullName ? 'fullName-error' : undefined} {...register('fullName')} />
                    {fieldError(errors.fullName?.message, 'fullName-error')}
                  </div>
                   <div className="grid gap-2">
                    <Label htmlFor="email">{t('checkout.labels.email')}</Label>
                    {/* Order emails always go to the account's email address. */}
                    <Input id="email" type="email" dir="ltr" readOnly aria-readonly className="bg-muted" {...register('email')} />
                    {fieldError(errors.email?.message)}
                  </div>
                   <div className="grid gap-2">
                    <Label htmlFor="phoneNumber">{t('checkout.labels.phoneWhatsapp', 'Phone / WhatsApp')}</Label>
                    <Input
                      id="phoneNumber"
                      type="tel"
                      inputMode="tel"
                      autoComplete="tel"
                      dir="ltr"
                      placeholder="09XX XXX XXX"
                      aria-invalid={!!errors.phoneNumber}
                      aria-describedby={errors.phoneNumber ? 'phone-help phone-error' : 'phone-help'}
                      {...register('phoneNumber')}
                    />
                    <p id="phone-help" className="text-xs text-muted-foreground">
                      {t('checkout.phoneHelp', "We'll call or message you on this number to arrange delivery.")}
                    </p>
                    {fieldError(errors.phoneNumber?.message, 'phone-error')}
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="country">{t('checkout.labels.country')}</Label>
                    <Input id="country" autoComplete="country-name" aria-invalid={!!errors.country} {...register('country')} />
                    {fieldError(errors.country?.message)}
                  </div>
                  <div className="grid sm:grid-cols-2 gap-4">
                    <div className="grid gap-2">
                        <Label htmlFor="city">
                          {syria ? t('checkout.labels.governorate', 'Governorate') : t('checkout.labels.city')}
                        </Label>
                        {syria ? (
                          <GovernorateSelect id="city" aria-invalid={!!errors.city} aria-describedby={errors.city ? 'city-error' : undefined} {...register('city')} />
                        ) : (
                          <Input id="city" autoComplete="address-level2" aria-invalid={!!errors.city} aria-describedby={errors.city ? 'city-error' : undefined} {...register('city')} />
                        )}
                        {fieldError(errors.city?.message, 'city-error')}
                    </div>
                    <div className="grid gap-2">
                        <Label htmlFor="postalCode">
                          {t('checkout.labels.postalCode')}{' '}
                          <span className="text-muted-foreground font-normal">{t('authCommon.optional', '(optional)')}</span>
                        </Label>
                        <Input id="postalCode" autoComplete="postal-code" dir="ltr" {...register('postalCode')} />
                        {fieldError(errors.postalCode?.message)}
                    </div>
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="addressLine1">{t('checkout.labels.areaStreet', 'Area, street and nearest landmark')}</Label>
                    <Input
                      id="addressLine1"
                      autoComplete="street-address"
                      placeholder={t('checkout.areaStreetPlaceholder', 'e.g. Mezzeh, Villas St., near the pharmacy')}
                      aria-invalid={!!errors.addressLine1}
                      aria-describedby={errors.addressLine1 ? 'address-error' : undefined}
                      {...register('addressLine1')}
                    />
                    {fieldError(errors.addressLine1?.message, 'address-error')}
                  </div>
                  <div className="grid gap-2 md:col-span-2">
                    <Label htmlFor="notes">{t('checkout.notesLabel')}</Label>
                    <Textarea
                      id="notes"
                      placeholder={t('checkout.notesPlaceholder')}
                      rows={4}
                      {...register('notes')}
                    />
                    {fieldError(errors.notes?.message)}
                  </div>
              </form>
            </CardContent>
          </Card>

          {/* Payment method picker (Phase 4) */}
          <Card className="mt-6">
            <CardHeader>
              <CardTitle className="text-2xl font-headline">
                <h2>{t('checkout.paymentTitle', 'Payment method')}</h2>
              </CardTitle>
              <CardDescription>{t('checkout.paymentSubtitle', 'Choose how you want to pay for this order.')}</CardDescription>
            </CardHeader>
            <CardContent>
              <PaymentMethodPicker value={paymentMethod} onChange={setPaymentMethod} />
              {!paymentMethod && (
                <p className="text-xs text-muted-foreground mt-3">{t('checkout.selectMethodHint', 'Select a payment method to continue.')}</p>
              )}
            </CardContent>
          </Card>
        </div>
        <div>
            <Card className="sticky top-24">
              <CardHeader>
                <CardTitle className="text-2xl font-headline">
                  <h2>{t('checkout.summaryTitle')}</h2>
                </CardTitle>
                <CardDescription>{t('checkout.summarySubtitle')}</CardDescription>
              </CardHeader>
              <CardContent>
                {cart.length === 0 && cartLoading ? (
                  // Right after login the guest cart is being merged into the account.
                  <div className="space-y-3" aria-busy="true">
                    <Skeleton className="h-16 w-full" />
                    <Skeleton className="h-16 w-full" />
                  </div>
                ) : cart.length === 0 ? (
                  <div className="text-center py-12">
                    <p className="text-muted-foreground mb-4">{t('checkout.emptyTitle')}</p>
                    <Button asChild>
                      <Link href="/products">{t('checkout.emptyCta')}</Link>
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {cart.map(item => (
                      <div key={item.id} className="flex items-center gap-4">
                        <Image src={item.imageUrl} alt={item.name} width={64} height={64} className="object-cover h-16 w-16 border-[2px] border-foreground" />
                        <div className="flex-grow min-w-0">
                          <p className="font-semibold break-words">{item.name}</p>
                          <p className="text-sm text-muted-foreground">{t('checkout.quantity', 'Quantity: {count}', { count: item.quantity })}</p>
                        </div>
                        <p className="font-semibold shrink-0" dir="ltr">{formatPrice(item.price * item.quantity)}</p>
                      </div>
                    ))}
                    <Separator />
                    <div className="flex justify-between items-center text-lg font-semibold">
                      <p>{t('cart.total')}</p>
                      <p dir="ltr">{formatPrice(total)}</p>
                    </div>
                    <DeliveryNote />
                  </div>
                )}
              </CardContent>
              {cart.length > 0 && (
                <CardFooter>
                  <Button size="lg" className="w-full" type="submit" form="shipping-form" disabled={loading || redirecting || !paymentMethod}>
                    {loading || redirecting
                      ? t('checkout.placing')
                      : !paymentMethod
                      ? t('checkout.pickMethodTitle', 'Choose a payment method')
                      : t('checkout.placeOrder')}
                  </Button>
                </CardFooter>
              )}
            </Card>
        </div>
      </div>
    </div>
  );
}
