import { Resend } from 'resend';
import { formatMoney, orderReference } from '@/lib/payments/common';

export { orderReference };

/**
 * Transactional email via Resend.
 *
 * Env vars:
 *   RESEND_API_KEY      — required to actually send anything
 *   EMAIL_FROM          — optional, defaults to "3D Titans <noreply@3dtitans.org>"
 *                         (the domain must be verified in Resend)
 *   ADMIN_NOTIFY_EMAIL  — optional, comma-separated list of addresses that get
 *                         "new order" / "payment proof submitted" alerts
 *
 * Sending never throws: a failed email must not fail an order or payment.
 */
const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;
const FROM = process.env.EMAIL_FROM || '3D Titans <noreply@3dtitans.org>';

export function escapeHtml(value: unknown): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export async function sendEmail(opts: { to: string | string[]; subject: string; html: string }): Promise<boolean> {
  const to = (Array.isArray(opts.to) ? opts.to : [opts.to]).map((s) => s.trim()).filter(Boolean);
  if (!resend || to.length === 0) return false;
  try {
    const { error } = await resend.emails.send({ from: FROM, to, subject: opts.subject, html: opts.html });
    if (error) {
      console.error('sendEmail failed', error);
      return false;
    }
    return true;
  } catch (err) {
    console.error('sendEmail failed', err);
    return false;
  }
}

export function adminEmails(): string[] {
  return (process.env.ADMIN_NOTIFY_EMAIL || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}

function appUrl() {
  return process.env.NEXT_PUBLIC_APP_URL || 'https://3dtitans.org';
}

type OrderLike = {
  id: string;
  totalAmount: unknown;
  customerEmail?: string | null;
  shippingName?: string | null;
  paymentMethod?: string | null;
};

function money(amount: unknown, currency: string) {
  return formatMoney(Number(amount), currency);
}

const METHOD_LABELS: Record<string, string> = {
  cod: 'Cash on Delivery',
  bank_transfer: 'Bank Transfer',
  sham_cash: 'Sham Cash',
  syriatel_cash: 'Syriatel Cash',
  stripe: 'Card payment',
};

export async function notifyOrderPlaced(order: OrderLike, currency: string) {
  const ref = orderReference(order.id);
  const method = METHOD_LABELS[order.paymentMethod || ''] || order.paymentMethod || '';
  const link = `${appUrl()}/checkout/success?orderId=${encodeURIComponent(order.id)}`;
  const tasks: Promise<boolean>[] = [];
  if (order.customerEmail) {
    tasks.push(
      sendEmail({
        to: order.customerEmail,
        subject: `Order ${ref} received`,
        html: `
          <h1>Thanks for your order!</h1>
          <p>Order <strong>${escapeHtml(ref)}</strong> — total <strong>${escapeHtml(money(order.totalAmount, currency))}</strong>.</p>
          <p>Payment method: ${escapeHtml(method)}</p>
          <p>Payment instructions and order status: <a href="${escapeHtml(link)}">${escapeHtml(link)}</a></p>`,
      })
    );
  }
  const admins = adminEmails();
  if (admins.length) {
    tasks.push(
      sendEmail({
        to: admins,
        subject: `New order ${ref} — ${money(order.totalAmount, currency)} (${method})`,
        html: `<p>New order <strong>${escapeHtml(ref)}</strong> from ${escapeHtml(order.shippingName)} (${escapeHtml(order.customerEmail)}).</p>
               <p>Total: ${escapeHtml(money(order.totalAmount, currency))} — ${escapeHtml(method)}</p>
               <p><a href="${escapeHtml(appUrl())}/admin/orders">Open admin orders</a></p>`,
      })
    );
  }
  await Promise.all(tasks);
}

export async function notifyProofSubmitted(order: OrderLike, currency: string) {
  const admins = adminEmails();
  if (!admins.length) return;
  const ref = orderReference(order.id);
  await sendEmail({
    to: admins,
    subject: `Payment proof submitted for ${ref}`,
    html: `<p>The customer submitted payment proof for order <strong>${escapeHtml(ref)}</strong> (${escapeHtml(money(order.totalAmount, currency))}).</p>
           <p><a href="${escapeHtml(appUrl())}/admin/orders">Review it in admin orders</a></p>`,
  });
}

export async function notifyPaymentConfirmed(order: OrderLike, currency: string) {
  if (!order.customerEmail) return;
  const ref = orderReference(order.id);
  await sendEmail({
    to: order.customerEmail,
    subject: `Payment received for order ${ref}`,
    html: `<h1>Payment confirmed</h1>
           <p>We received ${escapeHtml(money(order.totalAmount, currency))} for order <strong>${escapeHtml(ref)}</strong>. We'll start on it shortly.</p>
           <p><a href="${escapeHtml(appUrl())}/orders">View your orders</a></p>`,
  });
}

export async function notifyPaymentRejected(order: OrderLike, currency: string) {
  if (!order.customerEmail) return;
  const ref = orderReference(order.id);
  await sendEmail({
    to: order.customerEmail,
    subject: `We couldn't confirm the payment for order ${ref}`,
    html: `<p>We couldn't match a payment of ${escapeHtml(money(order.totalAmount, currency))} to order <strong>${escapeHtml(ref)}</strong>.</p>
           <p>Please check the details and submit your proof again, or contact support.</p>
           <p><a href="${escapeHtml(appUrl())}/checkout/success?orderId=${encodeURIComponent(order.id)}">Open your order</a></p>`,
  });
}
