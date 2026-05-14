-- Creator Marketplace MVP.
--
-- Standard helps sellers discover media creators (showcases, thumbnails,
-- trailers, reviews, promos) and send them briefs. Standard does NOT
-- process creator payments in this MVP — the seller/creator deal happens
-- externally. No escrow, invoices, chat, or contracts here.
--
-- Flow:
--   1. A logged-in user applies         -> creator_applications (pending)
--   2. An admin approves/rejects        -> creator_applications.status
--   3. On approve, a profile is created -> creator_profiles (active)
--   4. The creator adds portfolio items -> creator_portfolio_items
--   5. Sellers browse + send briefs     -> creator_requests (open)
--   6. The creator tracks request state -> creator_requests.status
--
-- A user can be both a seller and a creator — there is deliberately no
-- global "creator" role. Creator-ness is expressed by owning a row in
-- creator_profiles linked to profiles.id.
--
-- Owner / admin writes that touch protected fields (application status,
-- profile status/is_featured, request status) are routed through API
-- routes that use the service-role admin client after a server-side
-- ownership check. RLS here is defense-in-depth: public reads are scoped
-- to active/public rows, inserts are self-scoped, and the privileged
-- UPDATE paths are admin-only at the policy layer.

-- =========================================================================
-- Enums
-- =========================================================================

create type public.creator_application_status as enum (
  'pending',
  'approved',
  'rejected'
);

create type public.creator_profile_status as enum (
  'draft',
  'active',
  'hidden',
  'suspended'
);

create type public.creator_request_status as enum (
  'open',
  'responded',
  'closed',
  'declined'
);

create type public.portfolio_item_type as enum (
  'video',
  'image',
  'thumbnail',
  'trailer',
  'short_form',
  'review',
  'promo',
  'other'
);

-- =========================================================================
-- A) creator_applications
-- =========================================================================

create table public.creator_applications (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid references public.profiles(id) on delete set null,
  creator_name text not null check (char_length(creator_name) between 2 and 80),
  email text not null check (char_length(email) between 3 and 160),
  discord text check (discord is null or char_length(discord) <= 80),
  starting_rate text check (starting_rate is null or char_length(starting_rate) <= 80),
  platforms text[] not null default '{}',
  content_types text[] not null default '{}',
  games_covered text[] not null default '{}',
  portfolio_links text[] not null default '{}',
  availability text check (availability is null or char_length(availability) <= 160),
  bio text check (bio is null or char_length(bio) <= 1200),
  status public.creator_application_status not null default 'pending',
  admin_notes text check (admin_notes is null or char_length(admin_notes) <= 2000),
  reviewed_by uuid references public.profiles(id) on delete set null,
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index creator_applications_status_created_idx
  on public.creator_applications (status, created_at desc);
create index creator_applications_profile_idx
  on public.creator_applications (profile_id, created_at desc)
  where profile_id is not null;

create trigger creator_applications_set_updated_at
  before update on public.creator_applications
  for each row execute function public.set_updated_at();

alter table public.creator_applications enable row level security;

-- INSERT: a logged-in user can submit their own application. profile_id
-- must be themselves; status must start at 'pending'; admin fields must
-- be empty. The API route enforces all of this too + dedupe.
drop policy if exists "user submits own creator application" on public.creator_applications;
create policy "user submits own creator application"
  on public.creator_applications
  for insert
  to authenticated
  with check (
    profile_id = auth.uid()
    and status = 'pending'
    and admin_notes is null
    and reviewed_by is null
    and reviewed_at is null
    and char_length(creator_name) between 2 and 80
    and char_length(email) between 3 and 160
  );

-- SELECT: the applicant reads their own applications; admins read all.
drop policy if exists "applicant or admin reads creator applications" on public.creator_applications;
create policy "applicant or admin reads creator applications"
  on public.creator_applications
  for select
  to authenticated
  using (profile_id = auth.uid() or public.is_admin());

-- UPDATE: admin only. Approve / reject + admin_notes + reviewed_by go
-- through /api/admin/creator-applications/[id] (service-role client).
drop policy if exists "admin updates creator applications" on public.creator_applications;
create policy "admin updates creator applications"
  on public.creator_applications
  for update
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- =========================================================================
-- B) creator_profiles
-- =========================================================================

create table public.creator_profiles (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid references public.profiles(id) on delete set null,
  application_id uuid references public.creator_applications(id) on delete set null,
  slug text not null unique check (slug = lower(slug) and char_length(slug) between 1 and 120),
  display_name text not null check (char_length(display_name) between 2 and 80),
  headline text check (headline is null or char_length(headline) <= 140),
  bio text check (bio is null or char_length(bio) <= 1600),
  avatar_url text check (avatar_url is null or char_length(avatar_url) <= 500),
  banner_url text check (banner_url is null or char_length(banner_url) <= 500),
  email text check (email is null or char_length(email) <= 160),
  discord text check (discord is null or char_length(discord) <= 80),
  website_url text check (website_url is null or char_length(website_url) <= 500),
  platforms text[] not null default '{}',
  content_types text[] not null default '{}',
  games_covered text[] not null default '{}',
  starting_rate text check (starting_rate is null or char_length(starting_rate) <= 80),
  availability text check (availability is null or char_length(availability) <= 160),
  status public.creator_profile_status not null default 'draft',
  is_featured boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index creator_profiles_status_featured_created_idx
  on public.creator_profiles (status, is_featured desc, created_at desc);
create index creator_profiles_slug_idx
  on public.creator_profiles (slug);
create index creator_profiles_profile_idx
  on public.creator_profiles (profile_id)
  where profile_id is not null;

create trigger creator_profiles_set_updated_at
  before update on public.creator_profiles
  for each row execute function public.set_updated_at();

alter table public.creator_profiles enable row level security;

-- SELECT (public): only active profiles are visible to the marketplace.
drop policy if exists "public reads active creator profiles" on public.creator_profiles;
create policy "public reads active creator profiles"
  on public.creator_profiles
  for select
  using (status = 'active');

-- SELECT (owner / admin): the owner sees their own profile in any status
-- (draft before approval, hidden, suspended); admins see everything.
drop policy if exists "owner or admin reads creator profiles" on public.creator_profiles;
create policy "owner or admin reads creator profiles"
  on public.creator_profiles
  for select
  to authenticated
  using (profile_id = auth.uid() or public.is_admin());

-- INSERT: admin only. Profiles are created by the approval flow
-- (/api/admin/creator-applications/[id]) via the service-role client.
drop policy if exists "admin inserts creator profiles" on public.creator_profiles;
create policy "admin inserts creator profiles"
  on public.creator_profiles
  for insert
  to authenticated
  with check (public.is_admin());

-- UPDATE: admin only at the policy layer. Creator-owner profile edits go
-- through /api/creator/profile, which uses the service-role client after
-- an ownership check and strips status / is_featured from the payload.
drop policy if exists "admin updates creator profiles" on public.creator_profiles;
create policy "admin updates creator profiles"
  on public.creator_profiles
  for update
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- =========================================================================
-- C) creator_portfolio_items
-- =========================================================================

create table public.creator_portfolio_items (
  id uuid primary key default gen_random_uuid(),
  creator_id uuid not null references public.creator_profiles(id) on delete cascade,
  title text not null check (char_length(title) between 2 and 100),
  description text check (description is null or char_length(description) <= 1000),
  item_type public.portfolio_item_type not null default 'other',
  game text check (game is null or char_length(game) <= 80),
  platform text check (platform is null or char_length(platform) <= 80),
  external_url text check (external_url is null or char_length(external_url) <= 500),
  thumbnail_url text check (thumbnail_url is null or char_length(thumbnail_url) <= 500),
  sort_order integer not null default 0,
  is_public boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index creator_portfolio_items_creator_idx
  on public.creator_portfolio_items (creator_id, sort_order, created_at desc);

create trigger creator_portfolio_items_set_updated_at
  before update on public.creator_portfolio_items
  for each row execute function public.set_updated_at();

alter table public.creator_portfolio_items enable row level security;

-- SELECT (public): a portfolio item is public only when the item is
-- flagged public AND its parent creator profile is active.
drop policy if exists "public reads public portfolio items" on public.creator_portfolio_items;
create policy "public reads public portfolio items"
  on public.creator_portfolio_items
  for select
  using (
    is_public = true
    and exists (
      select 1
      from public.creator_profiles cp
      where cp.id = creator_portfolio_items.creator_id
        and cp.status = 'active'
    )
  );

-- SELECT / INSERT / UPDATE / DELETE (owner or admin): the creator who
-- owns the parent profile has full CRUD on their portfolio items; admins
-- can manage all. There are no privileged fields here, so owner CRUD via
-- RLS is safe — the API routes layer on input validation.
drop policy if exists "owner or admin reads portfolio items" on public.creator_portfolio_items;
create policy "owner or admin reads portfolio items"
  on public.creator_portfolio_items
  for select
  to authenticated
  using (
    public.is_admin()
    or exists (
      select 1
      from public.creator_profiles cp
      where cp.id = creator_portfolio_items.creator_id
        and cp.profile_id = auth.uid()
    )
  );

drop policy if exists "owner or admin inserts portfolio items" on public.creator_portfolio_items;
create policy "owner or admin inserts portfolio items"
  on public.creator_portfolio_items
  for insert
  to authenticated
  with check (
    public.is_admin()
    or exists (
      select 1
      from public.creator_profiles cp
      where cp.id = creator_portfolio_items.creator_id
        and cp.profile_id = auth.uid()
    )
  );

drop policy if exists "owner or admin updates portfolio items" on public.creator_portfolio_items;
create policy "owner or admin updates portfolio items"
  on public.creator_portfolio_items
  for update
  to authenticated
  using (
    public.is_admin()
    or exists (
      select 1
      from public.creator_profiles cp
      where cp.id = creator_portfolio_items.creator_id
        and cp.profile_id = auth.uid()
    )
  )
  with check (
    public.is_admin()
    or exists (
      select 1
      from public.creator_profiles cp
      where cp.id = creator_portfolio_items.creator_id
        and cp.profile_id = auth.uid()
    )
  );

drop policy if exists "owner or admin deletes portfolio items" on public.creator_portfolio_items;
create policy "owner or admin deletes portfolio items"
  on public.creator_portfolio_items
  for delete
  to authenticated
  using (
    public.is_admin()
    or exists (
      select 1
      from public.creator_profiles cp
      where cp.id = creator_portfolio_items.creator_id
        and cp.profile_id = auth.uid()
    )
  );

-- =========================================================================
-- D) creator_requests
-- =========================================================================

create table public.creator_requests (
  id uuid primary key default gen_random_uuid(),
  creator_id uuid not null references public.creator_profiles(id) on delete cascade,
  seller_id uuid references public.sellers(id) on delete set null,
  requester_profile_id uuid references public.profiles(id) on delete set null,
  requester_email text check (requester_email is null or char_length(requester_email) <= 160),
  requester_discord text check (requester_discord is null or char_length(requester_discord) <= 80),
  title text not null check (char_length(title) between 2 and 120),
  brief text not null check (char_length(brief) between 10 and 3000),
  budget text check (budget is null or char_length(budget) <= 80),
  timeline text check (timeline is null or char_length(timeline) <= 120),
  status public.creator_request_status not null default 'open',
  creator_notes text check (creator_notes is null or char_length(creator_notes) <= 2000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index creator_requests_creator_status_created_idx
  on public.creator_requests (creator_id, status, created_at desc);
create index creator_requests_seller_status_created_idx
  on public.creator_requests (seller_id, status, created_at desc)
  where seller_id is not null;
create index creator_requests_requester_created_idx
  on public.creator_requests (requester_profile_id, created_at desc)
  where requester_profile_id is not null;

create trigger creator_requests_set_updated_at
  before update on public.creator_requests
  for each row execute function public.set_updated_at();

alter table public.creator_requests enable row level security;

-- INSERT: a logged-in user sends a brief to an ACTIVE creator. The
-- requester must be themselves; status starts 'open'; creator_notes must
-- be empty. The API route additionally verifies seller ownership when a
-- seller_id is attached, and rate-limits duplicate briefs.
drop policy if exists "authenticated sends creator request" on public.creator_requests;
create policy "authenticated sends creator request"
  on public.creator_requests
  for insert
  to authenticated
  with check (
    requester_profile_id = auth.uid()
    and status = 'open'
    and creator_notes is null
    and char_length(title) between 2 and 120
    and char_length(brief) between 10 and 3000
    and exists (
      select 1
      from public.creator_profiles cp
      where cp.id = creator_requests.creator_id
        and cp.status = 'active'
    )
  );

-- SELECT: the requester reads their own briefs; the creator-owner reads
-- briefs sent to their profile; admins read all. Anon cannot read.
drop policy if exists "requester creator-owner or admin reads requests" on public.creator_requests;
create policy "requester creator-owner or admin reads requests"
  on public.creator_requests
  for select
  to authenticated
  using (
    requester_profile_id = auth.uid()
    or public.is_admin()
    or exists (
      select 1
      from public.creator_profiles cp
      where cp.id = creator_requests.creator_id
        and cp.profile_id = auth.uid()
    )
  );

-- UPDATE: admin only at the policy layer. Creator-owner status changes
-- (responded / closed / declined) + creator_notes go through
-- /api/creator/requests/[id], which uses the service-role client after
-- an ownership check.
drop policy if exists "admin updates creator requests" on public.creator_requests;
create policy "admin updates creator requests"
  on public.creator_requests
  for update
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());
