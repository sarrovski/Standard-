# Deployment — production domain configuration

Production domain: **https://stnd.cc**

The app resolves its origin in exactly one place: `getSiteUrl()` in
`src/lib/site-url.ts`. Every canonical URL is relative and resolves against
`metadataBase` (set from `getSiteUrl()` in `src/app/layout.tsx`); every
absolute URL — OpenGraph/Twitter, JSON-LD, auth redirects, Stripe
success/cancel URLs — is built from `getSiteUrl()`. There are no hardcoded
domain literals anywhere else in the codebase.

`getSiteUrl()` resolution order:

1. `NEXT_PUBLIC_SITE_URL` env var (explicit override)
2. `https://stnd.cc` when `VERCEL_ENV === "production"` (built-in fallback)
3. `https://$VERCEL_URL` for preview / branch deploys
4. `http://localhost:3000` for local dev

So production is correct even if the env var is forgotten — but you should
still set `NEXT_PUBLIC_SITE_URL` explicitly (belt and suspenders, and it makes
the value visible in the Vercel dashboard).

---

## 1. Vercel — environment variables

Set these on the **Production** environment (Project → Settings → Environment
Variables). `NEXT_PUBLIC_*` vars are exposed to the browser bundle; the rest
are server-only.

| Variable | Production value | Notes |
| --- | --- | --- |
| `NEXT_PUBLIC_SITE_URL` | `https://stnd.cc` | **The domain change.** No trailing slash. |
| `NEXT_PUBLIC_SUPABASE_URL` | `https://gybwunonnsfgiezqvjvv.supabase.co` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | _(Supabase anon key)_ | Supabase → Settings → API |
| `SUPABASE_SERVICE_ROLE_KEY` | _(Supabase service-role key)_ | Server-only. Never expose to the client. |
| `STRIPE_SECRET_KEY` | _(Stripe live secret key, `sk_live_…`)_ | Use the **live** key in production |
| `STRIPE_WEBHOOK_SECRET` | _(Stripe webhook signing secret, `whsec_…`)_ | From the live webhook endpoint — see §3 |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | _(Stripe live publishable key, `pk_live_…`)_ | |
| `STRIPE_SELLER_SUBSCRIPTION_PRICE_ID` | _(live price id, `price_…`)_ | Seller subscription |
| `STRIPE_FEATURED_SLOT_PRICE_ID` | _(live price id, `price_…`)_ | Featured slot purchase |

`VERCEL_ENV` and `VERCEL_URL` are injected by Vercel automatically — do not set
them yourself.

**Preview deployments:** leave `NEXT_PUBLIC_SITE_URL` unset on the Preview
environment so each preview's canonicals point at its own `*.vercel.app`
hostname (avoids preview deploys competing with production in search).

After changing env vars, **redeploy** — Next.js inlines `NEXT_PUBLIC_*` values
at build time.

## 2. Vercel — domain

- Project → Settings → Domains → add `stnd.cc` (and `www.stnd.cc` if desired,
  redirecting to the apex).
- Point DNS at Vercel per the dashboard instructions (A / CNAME records).
- Set `stnd.cc` as the **Production** domain so production deploys serve it.

## 3. Supabase — Auth redirect URLs

Supabase → Authentication → URL Configuration:

- **Site URL:** `https://stnd.cc`
- **Redirect URLs (allow list)** — add:
  - `https://stnd.cc/**`
    (covers `/auth/callback`, `/account`, and the role-based redirect
    targets `/dashboard`, `/admin`, `/creator-dashboard`)
  - Keep `http://localhost:3000/**` for local dev.
  - Optionally add your Vercel preview pattern, e.g.
    `https://standard-*.vercel.app/**`, if you test auth on previews.

The magic-link / OAuth callback the app uses is `https://stnd.cc/auth/callback`
(built from `getSiteUrl()` in `login-client.tsx` / `signup-client.tsx`).

## 4. Stripe — dashboard settings

Checkout success/cancel URLs and the billing-portal return URL are built at
request time from `getSiteUrl()`, so they update automatically once
`NEXT_PUBLIC_SITE_URL` / the production fallback is in effect — **no Stripe
dashboard change needed for those.**

The one fixed URL Stripe stores is the **webhook endpoint**:

- Stripe → Developers → Webhooks → the endpoint for this app.
- Endpoint URL must be: `https://stnd.cc/api/stripe/webhook`
- If you were previously pointing at a `*.vercel.app` URL, update it (or add a
  new live-mode endpoint) and copy its signing secret into
  `STRIPE_WEBHOOK_SECRET`.
- Confirm the endpoint is in **live mode** and subscribed to the events the
  handler cares about (checkout/subscription events).

## 5. Post-cutover smoke check

After the env vars + DNS are live, on `https://stnd.cc`:

- View source on a product / seller / creator page → `<link rel="canonical">`,
  OpenGraph `url`, and JSON-LD URLs all read `https://stnd.cc/...`.
- Sign in with a magic link → the email link points at
  `https://stnd.cc/auth/callback` and lands you signed in.
- Start a Stripe checkout → success/cancel return to `https://stnd.cc/...`.
- Trigger a Stripe webhook (test event or a real checkout) → 200 in the Stripe
  dashboard, no signature error in Vercel logs.

## 6. Not configured (recommended follow-ups, out of scope here)

- **`robots.txt` / `sitemap.xml`** — the app has neither. With a real domain
  live, adding `src/app/robots.ts` and `src/app/sitemap.ts` (both can use
  `getSiteUrl()`) is worth doing for SEO.
- **`stnd.cc` → `www` (or vice-versa) redirect** — pick a canonical host at
  the Vercel domain level so both don't get indexed.
