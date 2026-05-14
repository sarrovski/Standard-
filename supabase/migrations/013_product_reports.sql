-- Buyer-side report flow for product / seller trust issues.
-- One row per submitted report. Anyone (anon or authenticated) can
-- submit; reads + updates are admin-only.
--
-- The reason enum + a details length cap keep payload size predictable.
-- visitor_hash mirrors the product_events table — a coarse, day-scoped
-- hash of (ip, user-agent) computed by the API route so admins can spot
-- duplicate spam without storing PII.

create type public.product_report_reason as enum (
  'misleading_information',
  'payment_issue',
  'impersonation',
  'broken_official_link',
  'unsafe_or_prohibited',
  'other'
);

create type public.product_report_status as enum (
  'open',
  'reviewed',
  'resolved'
);

create table public.product_reports (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  seller_id uuid references public.sellers(id) on delete set null,
  reporter_profile_id uuid references public.profiles(id) on delete set null,
  reason public.product_report_reason not null,
  details text,
  status public.product_report_status not null default 'open',
  visitor_hash text,
  reviewed_by uuid references public.profiles(id) on delete set null,
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index product_reports_status_created_idx
  on public.product_reports (status, created_at desc);
create index product_reports_product_idx
  on public.product_reports (product_id);
create index product_reports_visitor_idx
  on public.product_reports (visitor_hash)
  where visitor_hash is not null;

create trigger product_reports_set_updated_at
  before update on public.product_reports
  for each row execute function public.set_updated_at();

alter table public.product_reports enable row level security;

-- INSERT: anyone (anon or authenticated) can submit a report. The reason
-- column is enum-typed so invalid reasons cannot be inserted; we still
-- bound details length to keep payloads predictable. The API route does
-- additional validation, rate-limiting, and seller_id population.
drop policy if exists "anyone can submit product reports" on public.product_reports;
create policy "anyone can submit product reports"
  on public.product_reports
  for insert
  to anon, authenticated
  with check (
    char_length(coalesce(details, '')) <= 2000
  );

-- SELECT: admins only. Reports may reference reporter_profile_id which is
-- sensitive; we never expose them to non-admin sessions.
drop policy if exists "admins read product reports" on public.product_reports;
create policy "admins read product reports"
  on public.product_reports
  for select
  to authenticated
  using (public.is_admin());

-- UPDATE: admins only. Used to flip status between open / reviewed /
-- resolved and to stamp reviewed_by + reviewed_at.
drop policy if exists "admins update product reports" on public.product_reports;
create policy "admins update product reports"
  on public.product_reports
  for update
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());
