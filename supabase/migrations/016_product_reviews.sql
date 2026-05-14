-- Real product reviews MVP.
--
-- Auto-publish model: reviews land as `approved` and show on the product
-- page immediately. Admins only intervene when a seller appeals a review,
-- at which point the status flips to `appealed` and the review hides until
-- the admin re-approves or rejects it.
--
-- We do NOT call these "verified buyer" reviews — purchase verification
-- doesn't exist on Standard yet. Public copy uses "Community review".
--
-- Seller-owners cannot review their own products. Defense-in-depth: the
-- API route checks via session, and the RLS INSERT policy forbids it via
-- a subquery against public.sellers.
--
-- One free-text appeal_reason column lets the seller explain why they
-- think a review is unfair when they flip it to `appealed`. The admin
-- reads this in the moderation queue.

create type public.product_review_status as enum (
  'approved',
  'appealed',
  'rejected'
);

create table public.product_reviews (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  seller_id uuid not null references public.sellers(id) on delete cascade,
  reviewer_profile_id uuid references public.profiles(id) on delete set null,
  rating integer not null check (rating between 1 and 5),
  body text not null check (char_length(body) between 1 and 1200),
  status public.product_review_status not null default 'approved',
  appeal_reason text,
  reviewed_by uuid references public.profiles(id) on delete set null,
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index product_reviews_product_status_created_idx
  on public.product_reviews (product_id, status, created_at desc);
create index product_reviews_seller_status_idx
  on public.product_reviews (seller_id, status, created_at desc);
create index product_reviews_reviewer_idx
  on public.product_reviews (reviewer_profile_id)
  where reviewer_profile_id is not null;
create index product_reviews_appealed_idx
  on public.product_reviews (created_at desc)
  where status = 'appealed';

create trigger product_reviews_set_updated_at
  before update on public.product_reviews
  for each row execute function public.set_updated_at();

alter table public.product_reviews enable row level security;

-- INSERT: authenticated users only. Defense-in-depth checks (the API route
-- enforces all of these too):
--   - reviewer_profile_id must match the calling user
--   - rating in 1..5 (also enforced by the column CHECK)
--   - body length 1..1200 (also enforced by the column CHECK)
--   - status must be 'approved' (the auto-publish initial state)
--   - the calling user cannot be the seller of the product being reviewed
drop policy if exists "authenticated can submit own product review"
  on public.product_reviews;
create policy "authenticated can submit own product review"
  on public.product_reviews
  for insert
  to authenticated
  with check (
    reviewer_profile_id = auth.uid()
    and rating between 1 and 5
    and char_length(body) between 1 and 1200
    and status = 'approved'
    and not exists (
      select 1
      from public.sellers s
      where s.id = product_reviews.seller_id
        and s.profile_id = auth.uid()
    )
  );

-- SELECT (public): only approved reviews are visible to the marketplace.
-- This is what the product page renders for everyone, anon or authed.
drop policy if exists "public read approved reviews" on public.product_reviews;
create policy "public read approved reviews"
  on public.product_reviews
  for select
  using (status = 'approved');

-- SELECT (reviewer): a logged-in user can always see their own reviews,
-- including those still in appeal or rejected, on their account surface.
drop policy if exists "reviewer reads own reviews" on public.product_reviews;
create policy "reviewer reads own reviews"
  on public.product_reviews
  for select
  to authenticated
  using (reviewer_profile_id = auth.uid());

-- SELECT (seller): a seller can read every review (any status) on the
-- products they own. The seller dashboard "Reviews" tab uses this to let
-- the seller appeal approved reviews they think are unfair.
drop policy if exists "seller reads reviews on own products"
  on public.product_reviews;
create policy "seller reads reviews on own products"
  on public.product_reviews
  for select
  to authenticated
  using (public.is_seller_owner(seller_id));

-- SELECT (admin): admins read everything for the moderation queue.
drop policy if exists "admins read all reviews" on public.product_reviews;
create policy "admins read all reviews"
  on public.product_reviews
  for select
  to authenticated
  using (public.is_admin());

-- UPDATE: admin only. Sellers can't change status / rating / body directly.
-- The seller-appeal flow goes through a server route that uses the
-- service-role admin client, which bypasses RLS — that's the only path
-- that flips `approved` → `appealed`.
drop policy if exists "admins update reviews" on public.product_reviews;
create policy "admins update reviews"
  on public.product_reviews
  for update
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- DELETE: admin only. Reserved for cases where a review needs to be wiped
-- entirely (e.g. doxxing / illegal content). Soft-rejection via the
-- `rejected` status is preferred for the audit trail.
drop policy if exists "admins delete reviews" on public.product_reviews;
create policy "admins delete reviews"
  on public.product_reviews
  for delete
  to authenticated
  using (public.is_admin());
