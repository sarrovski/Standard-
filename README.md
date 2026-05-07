# Standard v10 — Marketplace Gallery + Unified Sellers

Frontend-only MVP for Standard.

## Key changes

- Everyone who sells on the platform is a **Seller**.
- No separate reseller account role.
- Sellers can:
  - create product listings
  - create reseller offers
  - define payment methods
  - manage stock, delivery, pricing, and analytics
- Providers can request a **Provider / Developer** tag.
- Admin reviews provider tag requests using:
  - official website
  - Discord
  - Telegram
  - proof note
- Marketplace redesigned into a visual **gallery grid** instead of one long row-per-item layout.

## Routes

- `/`
- `/marketplace`
- `/login`
- `/account`
- `/dashboard`
- `/dashboard?tab=overview`
- `/dashboard?tab=listings`
- `/dashboard?tab=builder`
- `/dashboard?tab=offers`
- `/dashboard?tab=payments`
- `/dashboard?tab=analytics`
- `/dashboard?tab=verification`
- `/dashboard?tab=billing`
- `/admin`
