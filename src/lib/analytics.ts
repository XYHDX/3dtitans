/**
 * Campaign analytics helpers (client-side).
 *
 * Tags load only when their IDs are set in the environment:
 *   NEXT_PUBLIC_GA_MEASUREMENT_ID  e.g. G-XXXXXXXXXX (Google Analytics 4)
 *   NEXT_PUBLIC_META_PIXEL_ID      e.g. 123456789012345 (Meta / Facebook Pixel)
 *
 * `track()` is safe to call anywhere: it's a no-op when no tag is loaded.
 * Event names follow GA4's recommended e-commerce events; Meta gets the
 * matching standard event.
 */

type Item = { item_id: string; item_name: string; price: number; quantity: number };

type EventMap = {
  view_item: { currency: string; value: number; items: Item[] };
  add_to_cart: { currency: string; value: number; items: Item[] };
  begin_checkout: { currency: string; value: number; items: Item[] };
  purchase: { currency: string; value: number; transaction_id: string; items?: Item[] };
  sign_up: { method: string };
  generate_lead: { lead_type: 'print_request' | 'contact' };
};

const META_EVENT: Record<keyof EventMap, string> = {
  view_item: 'ViewContent',
  add_to_cart: 'AddToCart',
  begin_checkout: 'InitiateCheckout',
  purchase: 'Purchase',
  sign_up: 'CompleteRegistration',
  generate_lead: 'Lead',
};

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
    fbq?: (...args: unknown[]) => void;
  }
}

export function track<E extends keyof EventMap>(event: E, params: EventMap[E]): void {
  if (typeof window === 'undefined') return;
  try {
    window.gtag?.('event', event, params);
    const p = params as Record<string, unknown>;
    const meta: Record<string, unknown> = {};
    if ('value' in p) meta.value = p.value;
    if ('currency' in p) meta.currency = p.currency;
    if (Array.isArray(p.items)) {
      meta.content_ids = (p.items as Item[]).map((i) => i.item_id);
      meta.content_type = 'product';
    }
    window.fbq?.('track', META_EVENT[event], meta, 'transaction_id' in p ? { eventID: String(p.transaction_id) } : undefined);
  } catch {
    // Analytics must never break the shop.
  }
}

const UTM_KEYS = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content'] as const;
export const UTM_COOKIE = '3dt_utm';

/**
 * Remember the campaign that brought the visitor (first touch wins for 30
 * days), so orders and print requests can be attributed server-side by
 * reading the `3dt_utm` cookie.
 */
export function captureUtm(search: string): void {
  if (typeof document === 'undefined') return;
  try {
    if (document.cookie.split('; ').some((c) => c.startsWith(`${UTM_COOKIE}=`))) return;
    const params = new URLSearchParams(search);
    const utm: Record<string, string> = {};
    for (const k of UTM_KEYS) {
      const v = params.get(k);
      if (v) utm[k] = v.slice(0, 100);
    }
    if (!Object.keys(utm).length) return;
    const value = encodeURIComponent(JSON.stringify(utm));
    document.cookie = `${UTM_COOKIE}=${value}; Max-Age=${30 * 24 * 3600}; Path=/; SameSite=Lax; Secure`;
  } catch {
    // ignore
  }
}
