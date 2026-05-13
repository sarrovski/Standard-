-- User-saved products ("wishlist") for the buyer-side dashboard.
--
-- Buyers can save any published product to a personal list they can
-- come back to from /account. Per-(profile, product) unique constraint
-- means "save" is idempotent and the dashboard shows each product once.

create table public.saved_products (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (profile_id, product_id)
);

create index saved_products_profile_idx on public.saved_products(profile_id, created_at desc);
create index saved_products_product_idx on public.saved_products(product_id);

alter table public.saved_products enable row level security;

-- Owner-only RLS. A user can only see, insert, and delete their own
-- saved-product rows. Admins inherit through their own admin policies
-- elsewhere; we don't grant admin read here to keep buyer lists private.

create policy "saved products owner read" on public.saved_products
  for select using (profile_id = auth.uid());

create policy "saved products owner insert" on public.saved_products
  for insert with check (profile_id = auth.uid());

create policy "saved products owner delete" on public.saved_products
  for delete using (profile_id = auth.uid());
