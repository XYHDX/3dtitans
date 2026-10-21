# 3D Titans — website

Marketplace for 3D-printed products and custom print requests in Syria
(https://3dtitans.org). Next.js 14 (App Router) · Prisma 5 on Supabase Postgres ·
Supabase Storage · NextAuth (credentials + Google) · ShamCash e-pay · Vercel.

The Flutter mobile app lives in [`mobile/`](mobile/) and uses this site's API
(see [`mobile/README.md`](mobile/README.md)).

## Run locally

```bash
npm ci
cp .env.example .env.local   # fill in values — use a TEST database, never production
npm run dev                  # http://localhost:3000
```

Checks: `npm run typecheck`, `npm run lint`, `npm run build`. Node 22.x.

## Environment variables

All variables are documented in [`.env.example`](.env.example). In Vercel, set
Production and Preview separately: previews must use a test Supabase project and
ShamCash **sandbox** keys. `DATABASE_URL` must be the Supabase transaction pooler
(port 6543, `pgbouncer=true`).

## Database changes

The schema is defined in [`prisma/schema.prisma`](prisma/schema.prisma). Changes to
the live database are applied as SQL scripts in [`scripts/`](scripts/), in order,
in the Supabase SQL editor (take a backup first). Every script is idempotent.

| Script | When |
|---|---|
| `phase2` … `phase8` | Already applied to production |
| `phase9_shamcash_epay_migration.sql` | Before deploying the ShamCash e-pay release |
| `phase10_rls_lockdown.sql` | As soon as possible (closes the public Data API) — re-run after every future migration |
| `phase11_performance_indexes.sql` | Any time |
| `phase12_launch_fixes_migration.sql` | Before deploying the launch-fixes release |
| `phase13_storage_lockdown.sql` | Right **after** deploying the launch-fixes release |

Never run `prisma db push` or `prisma migrate dev` against production.

## Payments

- Cash on delivery, bank transfer, Syriatel Cash and manual Sham Cash (customer
  uploads a proof, an admin confirms; each reference can pay one order only).
- ShamCash e-pay (official API: bill → ShamCash app/web → encrypted webhook):
  see [`docs/shamcash-epay.md`](docs/shamcash-epay.md).
- Stripe cards: only when the store currency is USD.

## Deployment (Vercel)

`vercel.json` holds the build settings and the ShamCash reconcile cron
(every 10 minutes — requires a Pro plan). `.vercelignore` keeps the mobile app
and local files out of uploads. Health check for uptime monitoring:
`GET /api/health`.

The production-readiness audit and launch checklist are in
[`audit/launch-audit.html`](audit/launch-audit.html).
