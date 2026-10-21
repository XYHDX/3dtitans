# ShamCash online payment (e-pay)

Implements ShamCash's official **Electronic Payment** API ("ShamCashEPayDoc v1.0.0").
The customer is sent to the ShamCash app (or the ShamCash website when the app
isn't installed), confirms the bill with their transfer confirmation code, and
ShamCash tells our server through a webhook. No screenshot, no manual check.

The older **manual** "Sham Cash" method (customer transfers to our wallet number
and uploads a screenshot, admin confirms) still exists as a separate method.

## Flow

1. Checkout: the customer picks **ShamCash — pay online** and places the order
   (`paymentMethod = sham_cash_epay`, `paymentStatus = pending`).
2. Right away the browser calls `POST /api/payments/shamcash/create`. The server
   writes a `PaymentAttempt` row first (billNo `3DT-AB12CD34-1`, `-2`, … per retry),
   then calls ShamCash `createBill` with the order's server-side total, and
   returns the `paymentUrl`. The browser navigates there (normal navigation, not an iframe).
3. The customer pays in ShamCash. ShamCash redirects them back to
   `/checkout/success?orderId=…&shamcash=return`, which polls our own
   `GET /api/payments/shamcash/status` every 3 s for up to 2 minutes.
4. ShamCash POSTs the encrypted result to `/api/payments/shamcash/webhook`
   (`statusId` 4 = paid, 3 = expired). We verify the JWE (AES-GCM tag + `exp`),
   then `applyBillStatus()` marks the attempt and the order paid, records a
   `PaymentTransaction` (`provider = sham_cash_epay`, `externalId = tranId`) and
   emails the customer. Re-deliveries are harmless (idempotent).
5. Missed webhook? ShamCash's rule is: no polling of `getBillInfo`, only one call
   ≥ 10 minutes after the bill was created. We do exactly that:
   - the status endpoint asks ShamCash once when the latest bill is still pending
     10.5 min after creation (at most once every 2 min per bill);
   - `GET /api/payments/shamcash/reconcile` (cron or the admin button
     "Check ShamCash payments") checks up to 50 bills that are still pending
     11 min – 3 days after creation.
6. Bills expire after 10 minutes. The customer can press **Try again** on the
   success page; a new bill (`…-2`) is created for the same order.
7. Refunds: Admin → Orders → paid ShamCash order → **Refund via ShamCash**
   (full or partial, with an in-page confirmation). A full refund of the bill
   that paid the order sets the order's payment status to `refunded`
   (the order status itself is not changed — cancel it separately if needed).

Safety rules built in: the amount always comes from the database; one bill per
billNo (unique index); a pending bill is re-used for 9 minutes instead of making
a new one; a "paid" webhook for an order whose total changed afterwards (priority
surcharge) puts the order "under review" instead of paid; a second payment for an
already-paid or cancelled order is recorded and the admins are emailed.

## Environment variables (server only — never `NEXT_PUBLIC_`)

| Name | Value |
|---|---|
| `SHAMCASH_BASE_URL` | Sandbox: `https://dev.shamlogix.tech/services`. Production: the URL ShamCash issues. Trailing `/` is fine. Must be `https://`. |
| `SHAMCASH_AGENT_KEY` | The `agentKey` ShamCash issued. |
| `SHAMCASH_SECRET_KEY` | The `secretKey`: a Base64 string that decodes to exactly 32 bytes (AES-256 key). If it doesn't decode to 32 bytes the method stays switched off. |
| `NEXT_PUBLIC_APP_URL` | Production site URL (e.g. `https://3dtitans.org`), used to build the callback/redirect URLs. Previews use the Vercel branch URL; local dev uses the request origin. |
| `CRON_SECRET` | Optional — lets a scheduler call the reconcile endpoint. |

After changing env vars on Vercel, redeploy. Then in **Admin → Settings → Payments**:
switch on **ShamCash — online payment (e-pay)**, press **Test connection**
(it calls `getTransactions` with `limit: 10`; keys are never shown), and **Save**.
The method only appears to customers when the keys are valid, the switch is on,
and the store currency is **USD or SYP**.

## Webhook URL

`https://<your domain>/api/payments/shamcash/webhook`

It is sent to ShamCash as `callbackUrl` with every bill, so nothing has to be
registered by hand — but if ShamCash asks for it during service creation, give
them the production URL above. It must be publicly reachable: on Vercel
**preview** deployments with Deployment Protection turned on, ShamCash gets a
401 from Vercel; the 10.5-minute fallback still settles those bills, or use
"Protection Bypass for Automation" while testing.

## Database (run once)

Run `scripts/phase9_shamcash_epay_migration.sql` in the Supabase SQL Editor
**before** deploying this code. It creates the `PaymentAttempt` table, its
indexes and foreign key, enables RLS and revokes access from `anon` /
`authenticated`. It is idempotent (safe to run again). Do not use
`prisma db push` / `migrate` against production.

## Testing in the sandbox

1. Set the three `SHAMCASH_*` vars to the sandbox values ShamCash sent, store
   currency USD or SYP, enable the method, Test connection → "Connected".
2. Place an order with **ShamCash — pay online**. You're redirected to the
   ShamCash sandbox payment page.
3. Confirm with the mock confirmation code **`000000`**.
4. You're sent back to the success page; it should switch to "Payment received"
   within seconds (webhook). The order shows Paid in Admin → Orders with the
   ShamCash bill and transaction id.
5. Also try: closing the payment page without paying (after 10 min the bill
   expires → success page shows "link expired" + Try again), and a partial
   then full refund from Admin → Orders.

The webhook must reach your server, so test on a public deployment (or a tunnel),
not plain `localhost`.

## Go-live checklist

- [ ] ShamCash **verified commercial account** active.
- [ ] Service created with ShamCash: **logo URL** (publicly reachable https
      image) and **application name** ("3D Titans") registered — they are shown
      to customers on the ShamCash payment screen.
- [ ] Production `SHAMCASH_BASE_URL`, `SHAMCASH_AGENT_KEY`, `SHAMCASH_SECRET_KEY`
      from ShamCash set in Vercel **Production** env (sandbox keys only in Preview),
      then redeploy.
- [ ] `NEXT_PUBLIC_APP_URL` = the production domain.
- [ ] `scripts/phase9_shamcash_epay_migration.sql` run on the production database.
- [ ] Test connection shows the production host (not `dev.…`).
- [ ] One small real payment + refund end to end.
- [ ] Optional: a scheduler calling `/api/payments/shamcash/reconcile` every
      15–30 min with `Authorization: Bearer $CRON_SECRET`.
- [ ] If the secret key ever leaks: ask ShamCash support to revoke and reissue it.

## Code map

- `src/lib/payments/shamcash-epay.ts` — config, JWE (dir + A256GCM) encrypt/decrypt, API client.
- `src/lib/payments/shamcash-epay-service.ts` — `applyBillStatus()`, fallback check, app URL.
- `src/app/api/payments/shamcash/{create,webhook,status,reconcile,refund}/route.ts`
- `src/app/api/admin/shamcash/status/route.ts` — Test connection.
- `src/components/shamcash-epay-panel.tsx` — success-page panel (en + ar).
