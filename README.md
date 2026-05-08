# Standard v21 — Supabase/Stripe Ready

Standard is a SaaS marketplace for comparing gaming sellers/tools with a trust layer. v21 moves the v20 browser-only prototype toward a production-connected architecture for Supabase Auth, Supabase Postgres, Supabase Storage, Stripe, and Vercel.

## What changed in v21

- Added Supabase schema in `supabase/migrations/001_initial_schema.sql`.
- Added Supabase browser/server clients in `src/lib/supabase`.
- Added server-side role guard scaffold for `/dashboard` and `/admin`.
- Added Supabase Storage scaffold for the `product-media` bucket.
- Added Stripe server route placeholders for seller subscriptions, featured slots, webhooks, and billing portal.
- Added `.env.example` for Supabase, Stripe, and Vercel.
- Changed public product route to `/products/[productSlug]`.
- Replaced browser persistence with a Supabase-ready demo fallback so the app remains navigable before env setup.
- Updated marketplace/product wording so the product uses “Products” / “Produits” instead of legacy marketplace wording.

## Product rules preserved

- Navbar: Marketplace, Start Selling, Trust, Plans, Login.
- Footer includes Terms.
- Start Selling flow includes “How it works”.
- Roles are `user`, `seller`, and `admin`.
- Provider / Developer is a seller tag request approved by admin, not a role.
- Seller dashboard tabs: Produits, Builder, Offers, Payment Verification, Analytics, Provider Tag, Billing.
- Payment methods have verification states: pending verification, verified, rejected, needs re-check.
- Only verified payment methods should appear publicly and in marketplace filters.
- Featured placement is one active slot per game/category and does not replace verification or trust score.

## Supabase setup

1. Create a Supabase project.
2. In SQL Editor, run `supabase/migrations/001_initial_schema.sql`.
3. Create a public Storage bucket named `product-media`.
4. Copy the Supabase URL and anon key into `.env.local`.
5. Add `SUPABASE_SERVICE_ROLE_KEY` only to server environments. Never expose it in client code.
6. Configure Auth redirect URLs:
   - Local: `http://localhost:3000/auth/callback`
   - Production: `https://your-domain.com/auth/callback`
7. Enable password auth: Supabase Dashboard → Authentication → Providers → Email. Keep Email enabled, allow password signups/logins, and decide whether email confirmation is required. If confirmation is required, users must confirm before password login works. Magic links remain available as a secondary login option.

## Stripe setup

The Stripe ↔ Supabase flow is implemented as of Batch 4. Subscriptions and
featured slots are activated **only by the webhook** after Stripe confirms
payment — never from client code.

1. **Products and prices in Stripe.**
   - Create a recurring product for the seller subscription.
   - Create a one-time product for featured slots.
   - Copy each price id.

2. **Environment variables.** Add these to `.env.local` for dev and to Vercel
   for prod:
   ```
   STRIPE_SECRET_KEY=sk_test_...           # secret, server-only
   STRIPE_WEBHOOK_SECRET=whsec_...         # secret, server-only
   NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
   STRIPE_SELLER_SUBSCRIPTION_PRICE_ID=price_...
   STRIPE_FEATURED_SLOT_PRICE_ID=price_...
   ```
   Also required (set during Supabase setup):
   ```
   SUPABASE_SERVICE_ROLE_KEY=...           # server-only, used by webhook
   NEXT_PUBLIC_SITE_URL=https://...        # used for success/cancel URLs
   ```

3. **Webhook endpoint.**
   - **Production:** add an endpoint in the Stripe Dashboard pointing at
     `https://<your-domain>/api/stripe/webhook` and subscribe to:
     - `checkout.session.completed`
     - `customer.subscription.created`
     - `customer.subscription.updated`
     - `customer.subscription.deleted`

     Copy the resulting `whsec_...` into `STRIPE_WEBHOOK_SECRET`.
   - **Local development:** forward events with the Stripe CLI:
     ```
     stripe listen --forward-to localhost:3000/api/stripe/webhook
     ```
     The CLI prints a `whsec_...` for the local environment — set it as
     `STRIPE_WEBHOOK_SECRET` in `.env.local`.

4. **What the webhook does.**
   - On a `seller_subscription` checkout completing it creates the
     `stripe_customers` row, creates a `sellers` row if missing, **promotes
     the profile to `role = 'seller'`**, and upserts the `subscriptions` row.
     The webhook is the only place that promotes a user to seller.
   - On a `featured_slot` checkout completing it inserts a `featured_slots`
     row with `status = 'active'`, `starts_at = now()`, and `ends_at = now()
     + 30 days`. It re-checks slot availability inside the webhook to handle
     race conditions; if a clash is detected the row is not inserted (the
     duplicate paying customer must be refunded manually).
   - On subscription updates it upserts the `subscriptions` row with the
     mapped Stripe status. **It never demotes `profile.role`** — sellers keep
     their seller role even when the subscription goes `canceled` /
     `past_due`. The authoritative "can this seller currently sell" signal
     is `subscriptions.status`, which dashboards should read.

5. **Testing locally.** With the Stripe CLI running:
   ```
   stripe trigger checkout.session.completed
   stripe trigger customer.subscription.updated
   ```
   Then check the corresponding rows in Supabase. Note that triggered events
   from the CLI use synthetic data, so metadata like `profile_id` won't match
   a real user — for end-to-end testing, complete a real checkout in test
   mode.

## Supabase Storage setup (product media)

Product images are uploaded to the `product-media` bucket and rendered
publicly on marketplace cards and product pages.

1. **Create the bucket.** Supabase dashboard → Storage → **New bucket** →
   name `product-media`. Mark **Public bucket** ON. (Buckets can't be
   created from SQL on managed Supabase projects, hence the manual step.)

2. **Apply the policies.** Run `supabase/migrations/004_storage_product_media_policies.sql`
   against the project (Supabase SQL editor or `supabase db push`). It
   adds RLS policies on `storage.objects`:
   - public read for anything in `product-media`
   - sellers can insert / update / delete only under their own
     `sellers/{seller_id}/...` path prefix
   - admins can do anything in the bucket

3. **Set the bucket size limit (recommended).** In the bucket settings,
   set the per-file limit to 10 MB. The app also enforces this client-side
   and server-side, so the bucket setting is defense-in-depth.

4. **Allowed MIME types:** `image/png`, `image/jpeg`, `image/webp`. Set
   the bucket's allowed MIME types to match if you want a third layer of
   enforcement.

5. **Upload paths** (set automatically by `lib/storage.ts`):
   ```
   sellers/{seller_id}/products/{product_id}/{timestamp}-{safe_filename}
   ```
   The `seller_id` segment is what the RLS policies key off of. Don't
   change the path layout in `buildProductMediaPath()` without also
   updating migration 004.

6. **Public URLs.** With the bucket public, `supabase.storage.from(...)
   .getPublicUrl()` returns a permanent CDN-cached URL. If you switch
   the bucket to private later, replace the helper in `lib/storage.ts`
   with `createSignedUrl()` and adjust callers (rendering becomes per-render
   network cost).

7. **Local testing.** Same setup. Supabase CLI's local dev project also
   exposes a Storage emulator; the bucket+policies must be applied there
   too.

## Vercel deploy

Add the following variables in Vercel Project Settings → Environment Variables:

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
NEXT_PUBLIC_SITE_URL=
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=
STRIPE_SELLER_SUBSCRIPTION_PRICE_ID=
STRIPE_FEATURED_SLOT_PRICE_ID=
```

Then deploy with the normal Vercel Git flow. Make sure `NEXT_PUBLIC_SITE_URL` matches your deployed domain.

## Remaining work

- Replace the demo fallback reads/writes in dashboard components with live Supabase queries/mutations.
- Add a real Supabase Auth callback route if using magic links or OAuth.
- Complete Stripe webhook database sync for subscriptions and featured slot activation.
- Add admin mutations for payment verification, provider tag requests, and featured slot management.
- Generate full Supabase TypeScript types with the Supabase CLI once the project is live.

## Useful files

- `supabase/migrations/001_initial_schema.sql`
- `src/lib/supabase/client.ts`
- `src/lib/supabase/server.ts`
- `src/lib/supabase/types.ts`
- `src/lib/roles.ts`
- `src/lib/storage.ts`
- `src/lib/stripe.ts`
- `src/app/api/stripe/*`
- `.env.example`
