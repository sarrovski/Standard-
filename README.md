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

## Stripe setup

1. Create a seller subscription product and price in Stripe.
2. Create a featured slot one-time payment price in Stripe.
3. Add these env vars:
   - `STRIPE_SECRET_KEY`
   - `STRIPE_WEBHOOK_SECRET`
   - `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`
   - `STRIPE_SELLER_SUBSCRIPTION_PRICE_ID`
   - `STRIPE_FEATURED_SLOT_PRICE_ID`
4. Configure webhook endpoint:
   - Local with Stripe CLI: `stripe listen --forward-to localhost:3000/api/stripe/webhook`
   - Production: `https://your-domain.com/api/stripe/webhook`
5. Handle these events first:
   - `checkout.session.completed`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`

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
