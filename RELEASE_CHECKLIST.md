# Standard — Release Checklist

End-to-end checklist to take this repo from a demo-mode preview to a
live production deployment on Vercel + Supabase + Stripe.

Walk through every section in order. Skipping a step typically results in
a broken flow that's hard to diagnose later (silent webhook failures,
RLS denials with no UI signal, etc.).

---

## 1. Supabase project

### 1.1 Create the project
- New project on supabase.com
- Note the project URL and the anon key (Settings → API)
- Generate a service role key (same page) — keep it private

### 1.2 Apply migrations (in order)
Run each file from `supabase/migrations/` in the SQL editor, or use
`supabase db push` if you have the CLI configured:

1. `001_initial_schema.sql` — tables, enums, RLS policies, default
   payment_methods seed
2. `002_profiles_trigger.sql` — auto-create profiles row on auth.users
   insert
3. `003_seed_payment_methods.sql` — idempotent re-seed (no-op if 001
   was applied fully)
4. `004_storage_product_media_policies.sql` — RLS for the
   product-media storage bucket

### 1.3 Auth URL configuration
Settings → Authentication → URL Configuration:
- Site URL: `https://your-domain.com` (production) or
  `https://your-vercel-preview.vercel.app`
- Additional redirect URLs:
  - `https://your-domain.com/auth/callback`
  - `http://localhost:3000/auth/callback` (for local dev)

If these aren't set, magic links will redirect to localhost or fail
silently with "Invalid redirect URL".

### 1.3b Email/password auth
Settings → Authentication → Providers → Email:
- Email provider: enabled
- Password signups/logins: enabled
- Email confirmations: choose your launch policy

If confirmations are enabled, users must confirm the email before password
login succeeds. Magic links remain available on the login/signup screens as a
secondary option. Password login does **not** bypass roles: `/dashboard` still
requires `seller`/`admin`, and `/admin` still requires `admin`.

### 1.4 Storage bucket
Storage → New bucket:
- Name: `product-media`
- **Public bucket: ON**
- Recommended file-size limit: 10 MB
- Recommended allowed MIME types: `image/png`, `image/jpeg`, `image/webp`

Buckets cannot be created from SQL on managed Supabase projects, hence
the manual step. The RLS policies for the bucket come from migration 004.

---

## 2. Vercel deployment

### 2.1 Connect the GitHub repo
- Import the `sarrovski/Standard-` repository
- Framework: Next.js
- Root directory: `.` (default)
- Build command: `npm run build`
- Install command: `npm install`

### 2.2 Environment variables (production)

| Variable | Where it comes from |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase Settings → API |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase Settings → API |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase Settings → API (private — server-only) |
| `NEXT_PUBLIC_SITE_URL` | Your Vercel production URL or custom domain |
| `STRIPE_SECRET_KEY` | Stripe dashboard → Developers → API keys |
| `STRIPE_WEBHOOK_SECRET` | Set during step 3.4 below |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Stripe dashboard → Developers → API keys |
| `STRIPE_SELLER_SUBSCRIPTION_PRICE_ID` | Created during step 3.2 |
| `STRIPE_FEATURED_SLOT_PRICE_ID` | Created during step 3.3 |

The repo will deploy without these set — pages render in demo mode
when env vars are missing. So you can deploy first, then add env vars
incrementally as you wire each integration.

### 2.3 Deploy
Push to `main` → Vercel deploys automatically. Verify the build
succeeds and the deployed site is reachable.

---

## 3. Stripe

### 3.1 Decide: live mode or test mode first
Recommended for a first live launch: do steps 3.2–3.6 in **test mode**,
run the E2E test in section 5, then duplicate the products + prices in
live mode and swap env vars. The bug you find at the end of test mode is
free; the same bug at the end of live mode costs you a real refund and a
support ticket.

### 3.2 Seller subscription product
Stripe dashboard → Products → Add product:
- Name: e.g. `Standard Seller Subscription`
- Pricing: Recurring, monthly
- Price: whatever your plan is set at
- Save the **price id** (starts with `price_`) → set as
  `STRIPE_SELLER_SUBSCRIPTION_PRICE_ID` in Vercel

### 3.3 Featured slot product
Stripe dashboard → Products → Add product:
- Name: e.g. `Standard Featured Slot`
- Pricing: One-time
- Price: whatever the slot costs (one slot = 30 days, hardcoded)
- Save the **price id** → set as `STRIPE_FEATURED_SLOT_PRICE_ID`

### 3.4 Webhook endpoint
Stripe dashboard → Developers → Webhooks → Add endpoint:
- Endpoint URL: `https://your-domain.com/api/stripe/webhook`
- Events to send:
  - `checkout.session.completed`
  - `customer.subscription.created`
  - `customer.subscription.updated`
  - `customer.subscription.deleted`
- After creating, click "Reveal" on the signing secret → copy the
  `whsec_...` value → set as `STRIPE_WEBHOOK_SECRET` in Vercel

**Order matters**: set the env var on Vercel and redeploy *before* the
webhook starts firing real events. If the secret in Vercel doesn't match
what Stripe is signing with, every webhook event 400s and the only way
to know is to read Stripe's webhook logs.

### 3.5 Local webhook testing (optional but recommended)
Install the Stripe CLI, then:
```
stripe login
stripe listen --forward-to localhost:3000/api/stripe/webhook
```
The CLI prints a `whsec_...` for the local session. Put it in your
local `.env.local` as `STRIPE_WEBHOOK_SECRET`. With `stripe trigger`
you can replay events without going through actual checkouts.

### 3.6 Customer portal configuration
Stripe dashboard → Settings → Billing → Customer portal:
- Enable the portal
- Allow customers to: cancel subscriptions (at least)
- Save

Without this, the "Open billing portal" button on /dashboard/billing
returns an error from Stripe.

---

## 4. Initial admin seeding

After your first user signs up via magic link, manually promote them
to admin (there's no UI for this — by design, admin is a private state):

```sql
update public.profiles
set role = 'admin'
where email = 'you@your-email.com';
```

Without an admin, the moderation queue at `/admin` cannot approve
anything, and new sellers' payment methods stay forever pending.

---

## 5. End-to-end test (mandatory before sharing the URL)

Do this once on production with a real card you own. The whole loop
takes about 10 minutes.

### 5.1 Setup
- Open an incognito window
- Have your Supabase SQL editor open in another tab

### 5.2 Sign up & become a seller
1. Visit `/signup`, enter your email
2. Check inbox, click magic link → should land on `/account`
3. In SQL editor, verify:
   ```sql
   select id, email, role from profiles where email = 'your@email.com';
   ```
   role should be `user`
4. Visit `/plans`, click any "Start with X" → should land in Stripe Checkout
5. Complete checkout with a real card (or test card in test mode)
6. After redirect to `/dashboard/billing?checkout=success`, refresh and
   verify in SQL editor:
   ```sql
   select role from profiles where email = 'your@email.com';
   -- expect: 'seller'
   select * from sellers where profile_id = (select id from profiles where email = 'your@email.com');
   -- expect: 1 row
   select * from subscriptions order by created_at desc limit 1;
   -- expect: status 'active' or 'trialing'
   ```

### 5.3 Create a product
1. Visit `/dashboard?tab=builder`
2. Fill the form, click "Save product draft"
3. Should see "Product created" with a link
4. Visit `/dashboard?tab=products` — your product should appear with
   status "Pending Review"
5. Upload an image via the per-card upload control — should see a thumbnail

### 5.4 Submit a payment method
1. `/dashboard?tab=payments`
2. Pick the product, pick a payment method, fill the form, submit
3. Should see "Submitted. Admin will review."

### 5.5 Submit a provider tag request
1. `/dashboard?tab=verification`
2. Fill the form, submit
3. Should see "Submitted. Admin will review."

### 5.6 Admin moderation
1. Promote yourself to admin via SQL (see section 4) if not already
2. Visit `/admin`
3. Approve the payment request — should disappear from queue
4. Approve the provider tag request — should disappear from queue
5. Verify in SQL:
   ```sql
   select status from seller_payment_methods order by created_at desc limit 1;
   -- expect: 'verified'
   select provider_tag_status from sellers limit 1;
   -- expect: 'approved'
   ```

### 5.7 Publish & verify public visibility
1. `/dashboard?tab=products`, click "Publish"
2. Visit `/marketplace` — should see your product card with image and
   payment badge
3. Visit `/products/your-slug` — should see gallery + verified payment

### 5.8 Featured slot
1. On the published card, click "Reserve featured slot"
2. Complete the one-time payment in Stripe
3. After redirect to `/dashboard/billing?featured=success`, verify:
   ```sql
   select * from featured_slots where status = 'active';
   -- expect: 1 row, ends_at ~30 days out
   ```
4. `/marketplace` — your product should appear at the top with
   "Featured" badge

### 5.9 Cleanup
- Refund yourself in Stripe dashboard for any real charges
- Optional: `delete from products where seller_id = (...)` to remove
  the test product

---

## 6. Rollback notes

If something goes wrong post-launch:

### 6.1 Site is fully broken
- Vercel → Deployments → previous green deploy → "Promote to Production"
- This rolls back code only, not DB schema or Stripe state

### 6.2 Webhook is failing in production
Symptoms: subscriptions complete in Stripe but profile.role stays `user`,
or featured_slots aren't being inserted.

- Stripe dashboard → Developers → Webhooks → click your endpoint → check
  recent failures
- Common causes: `STRIPE_WEBHOOK_SECRET` mismatch (after rotating in
  Stripe), `SUPABASE_SERVICE_ROLE_KEY` missing or rotated
- Re-send a failed event from the Stripe dashboard once env is fixed

### 6.3 RLS denial in production
Symptoms: API returns 403 or empty arrays where data should appear.
- Supabase dashboard → Logs → Postgres logs
- Often means a migration didn't apply (compare migration order against
  section 1.2)

### 6.4 Storage uploads failing
Symptoms: media upload returns "new row violates row-level security policy"
- Bucket exists? Public? See section 1.4
- Migration 004 applied? Re-run if unsure (it's idempotent)

### 6.5 Schema rollback
Migrations are not auto-reversible. If a future migration breaks
production:
- The safest path is forward — write a fix-up migration
- Manual rollback only if you know what you're doing in SQL

### 6.6 Refund rather than cancel
For any test or accidental charge, refund through Stripe rather than
trying to undo the DB state. The webhook handles `customer.subscription.deleted`
correctly (sets status, never demotes role).

---

## 7. Things that are intentionally NOT in this checklist

- Email notifications (none implemented yet)
- Custom domain configuration (Vercel docs cover this)
- CDN / image optimization tuning (Next.js defaults are fine for v1)
- Automated DB backups (Supabase Pro plan handles daily backups)
- Per-tier subscription pricing (all plans share one price id today)
- Idempotency table for Stripe events (not needed — all writes are
  upsert-safe)

If any of these become important post-launch, they're follow-up batches.
