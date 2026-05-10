# Media Creators System

## 1. Product Goal

Standard should help gaming sellers find trusted media creators for product content such as clips, trailers, thumbnails, TikToks, YouTube showcases, reviews, and promotional assets.

The first version should validate buyer and seller interest without turning Standard into a payments, messaging, or contract platform. Sellers need better product media. Creators need paid opportunities. Standard can connect both sides while keeping execution external in the MVP.

## 2. MVP Scope

- Public creator discovery page.
- Static creator profile cards with reviewed-profile positioning.
- Static creator application page.
- Local-only application success state.
- External contact model for early validation.
- No database-backed creator data yet.

## 3. Non-Goals

- No escrow.
- No in-app payments.
- No real-time chat.
- No contracts.
- No dispute system.
- No ratings system.
- No creator role on `profiles`.
- No Stripe changes.
- No Auth, RLS, Admin, or product flow changes.

## 4. User Roles

- Seller: browses creators, compares portfolio fit, and contacts creators externally.
- Creator: applies to be reviewed and listed publicly.
- Standard admin, later: reviews creator applications and moderates public creator profiles.
- Buyer: no direct role in the MVP.

## 5. Proposed Pages

- `/creators`: public landing and directory concept with filters for game, content type, platform, and availability.
- `/creators/apply`: public creator application mock with no backend submission.
- Future `/dashboard/creator-briefs`: seller-only brief creation and management.
- Future `/admin/creator-applications`: admin moderation queue for creator applications and profile approval.

## 6. Future Database Schema

### `creator_profiles`

- `id`
- `display_name`
- `contact_email`
- `discord_handle`
- `games`
- `content_types`
- `platforms`
- `starting_rate`
- `availability`
- `bio`
- `status`
- `reviewed_by`
- `reviewed_at`
- `created_at`
- `updated_at`

### `creator_portfolio_links`

- `id`
- `creator_profile_id`
- `label`
- `url`
- `platform`
- `sort_order`
- `created_at`

### `creator_briefs`

- `id`
- `seller_id`
- `product_id`
- `title`
- `game`
- `content_type`
- `budget_range`
- `timeline`
- `description`
- `external_contact`
- `status`
- `created_at`
- `updated_at`

### `creator_applications`

- `id`
- `creator_name`
- `email`
- `discord_handle`
- `platforms`
- `games_covered`
- `content_types`
- `portfolio_links`
- `starting_rate`
- `availability`
- `bio`
- `status`
- `admin_notes`
- `reviewed_by`
- `reviewed_at`
- `created_at`
- `updated_at`

## 7. Moderation and Safety

- Creator profiles should be reviewed before appearing publicly.
- Portfolio links should be checked for spam, impersonation, unsafe content, and misleading claims.
- Public contact details should be opt-in and editable before launch.
- Seller briefs should be moderated before public visibility if the directory becomes two-sided.
- The MVP should clearly state that Standard does not handle payment, delivery, contracts, or disputes.

## 8. Monetization Later

- Featured creator placement.
- Seller subscription add-on for posting briefs.
- Creator verification or portfolio review fee.
- Lead generation fee after a creator accepts a brief.
- Marketplace sponsorships for content production partners.

## 9. Implementation Phases

- D1 static concept: docs, `/creators`, `/creators/apply`, mock data, local success state.
- D2 DB schema: create creator tables, RLS, and moderation-safe storage rules.
- D3 public directory from DB: list only approved creator profiles from Supabase.
- D4 seller briefs: authenticated sellers can post creator briefs without payments or chat.
- D5 applications/admin moderation: admin review queue for creator applications and public profile approval.

## 10. Open Questions

- Should creators be attached to user accounts later, or remain application-only until approval?
- What minimum portfolio proof should be required before public listing?
- Should sellers contact creators externally through Discord/email, or should Standard proxy contact requests later?
- Should creator pages show rates publicly, or only rate ranges?
- How should Standard handle creators who work on high-risk or policy-sensitive content?
- When, if ever, should ratings, disputes, or escrow become part of the product?
