# Deployment Guide — Bethel Divine Healthcare Services

## Prerequisites

- GitHub repository with this codebase pushed to `main`
- Vercel account connected to the GitHub repo
- Supabase project created and migrations run (see below)
- Stripe account (test mode for staging, live mode for production)
- Resend account with `betheldivine.com` domain verified
- QuickBooks Online developer app created

---

## 1. Supabase Setup

### Run migrations (in order)

In the Supabase dashboard → SQL Editor, run each file in `supabase/migrations/` in order:

```
001_initial_schema.sql
002_rls_policies.sql
003_notifications.sql
004_push_subscriptions.sql
005_reports.sql
006_audit_log.sql
007_indexes.sql
```

### Seed initial data (optional — development/staging only)

```sql
-- Run in Supabase SQL Editor
-- WARNING: Contains test data. Do NOT run in production.
```

Paste contents of `supabase/seed.sql` into the SQL Editor and run.

### Get your API keys

Supabase Dashboard → Project Settings → API:
- **Project URL** → `NEXT_PUBLIC_SUPABASE_URL`
- **anon / public** key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- **service_role** key → `SUPABASE_SERVICE_ROLE_KEY`

---

## 2. Vercel Deployment

### Connect repository

1. Go to [vercel.com/new](https://vercel.com/new)
2. Import your GitHub repository
3. Framework preset: **Next.js** (auto-detected)
4. Root directory: `.` (default)
5. Do not change build or output settings

### Environment variables

Add each variable in Vercel Dashboard → Project → Settings → Environment Variables. Set all variables for **Production**, **Preview**, and **Development** unless noted.

| Variable | Where to find it | Notes |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase → Project Settings → API → Project URL | |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase → Project Settings → API → anon/public | |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase → Project Settings → API → service_role | **Never expose to client** |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Stripe Dashboard → Developers → API Keys | Use `pk_test_` for preview |
| `STRIPE_SECRET_KEY` | Stripe Dashboard → Developers → API Keys | Use `sk_test_` for preview |
| `STRIPE_WEBHOOK_SECRET` | Stripe Dashboard → Developers → Webhooks → your endpoint | Set after step 3 below |
| `QUICKBOOKS_CLIENT_ID` | developer.intuit.com → My Apps → Keys & OAuth | |
| `QUICKBOOKS_CLIENT_SECRET` | developer.intuit.com → My Apps → Keys & OAuth | |
| `QUICKBOOKS_REDIRECT_URI` | — | `https://betheldivine.com/api/quickbooks/callback` |
| `RESEND_API_KEY` | resend.com → API Keys | |
| `RESEND_FROM_EMAIL` | — | `noreply@betheldivine.com` (must be verified in Resend) |
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY` | Generate once (see below) | |
| `VAPID_PRIVATE_KEY` | Generate once (see below) | **Keep private, never rotate after first push subscriber** |
| `VAPID_EMAIL` | — | `mailto:victor@betheldivine.com` |
| `ANTHROPIC_API_KEY` | console.anthropic.com → API Keys | Server-side only |
| `MARYLAND_EVV_API_KEY` | Maryland Medicaid / Sandata EVV enrollment | Leave blank until credentials received |
| `NEXT_PUBLIC_APP_URL` | — | `https://betheldivine.com` |

### Generate VAPID keys (one-time)

```bash
npx web-push generate-vapid-keys
```

Copy the output into `NEXT_PUBLIC_VAPID_PUBLIC_KEY` and `VAPID_PRIVATE_KEY`.

> **Important:** These keys must never change after any user subscribes to push notifications. Rotating them invalidates all existing subscriptions.

---

## 3. Register Stripe Webhook

After the first successful Vercel deployment:

1. Go to Stripe Dashboard → Developers → Webhooks → **Add endpoint**
2. Endpoint URL: `https://betheldivine.com/api/stripe/webhook`
3. Select events:
   - `payment_intent.succeeded`
   - `payment_intent.payment_failed`
   - `setup_intent.succeeded`
4. Copy the **Signing secret** (`whsec_...`)
5. Add it as `STRIPE_WEBHOOK_SECRET` in Vercel and redeploy (or trigger a new deployment)

---

## 4. Connect QuickBooks Online

1. Deploy to production first (QuickBooks requires a live redirect URI)
2. Log in as **owner** role at `https://betheldivine.com`
3. Navigate to **Settings** → **Integrations**
4. Click **Connect QuickBooks**
5. Complete the OAuth flow — you will be redirected back to `/admin/settings`
6. Confirm the "Connected" status badge appears

---

## 5. Post-Deployment Checklist

Run through these steps after the first production deployment:

- [ ] Log in as `victor@betheldivine.com` (admin) — confirm dashboard loads
- [ ] Log in as `dr.asooye@betheldivine.com` (owner) — confirm owner routes accessible
- [ ] Create a test employee and client
- [ ] Clock in and out as an employee — confirm clock event recorded
- [ ] Submit a Stripe test payment — confirm receipt email received
- [ ] Trigger a Stripe webhook with Stripe CLI: `stripe trigger payment_intent.succeeded`
- [ ] Request push notification permission in browser — confirm subscribe succeeds
- [ ] Generate an AI shift summary report — confirm Claude response saved
- [ ] Add a license with an expiry date 20 days out — confirm expiry alert appears
- [ ] Connect QuickBooks (see step 4)
- [ ] Verify `https://betheldivine.com/manifest.json` returns valid JSON
- [ ] Verify PWA installs on mobile (Add to Home Screen)
- [ ] Check Vercel Functions logs for any runtime errors

---

## 6. EVV (Maryland Electronic Visit Verification)

The EVV integration with Sandata is **disabled by default** until a real API key is configured.

- If `MARYLAND_EVV_API_KEY` is not set or equals `your_evv_api_key`, visit records are logged locally but not transmitted
- Contact Maryland Medicaid / Sandata for enrollment and API credentials before going live with real patient visits
- Once credentials are received, add `MARYLAND_EVV_API_KEY` in Vercel — no code changes required
- Manual re-submission is available at `POST /api/evv/submit` with `x-internal-key` header

---

## 7. Rollback Instructions

### Vercel instant rollback

1. Vercel Dashboard → Project → Deployments
2. Find the last working deployment
3. Click **...** → **Promote to Production**

This is instant and requires no code changes.

### Database rollback

Supabase does not support automatic schema rollback. If a migration causes issues:

1. Identify the breaking migration in `supabase/migrations/`
2. Write a reverse migration manually in the SQL Editor
3. Test on a staging project first

### Dependency rollback

```bash
git revert <commit-hash>
git push origin main
```

Vercel will auto-deploy the revert.

---

## 8. Staging Environment

For a staging environment, create a second Vercel project pointing to the same repo but a `staging` branch:

- Use separate Supabase project
- Use Stripe **test** keys (`pk_test_`, `sk_test_`)
- Set `NEXT_PUBLIC_APP_URL=https://staging.betheldivine.com`
- Register a separate Stripe webhook at `https://staging.betheldivine.com/api/stripe/webhook`

---

## Contact

Victor Asooye — victor@betheldivine.com
