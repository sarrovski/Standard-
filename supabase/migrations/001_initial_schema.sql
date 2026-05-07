-- Standard v21 Supabase initial schema
create extension if not exists "pgcrypto";

create type public.user_role as enum ('user', 'seller', 'admin');
create type public.product_status as enum ('draft', 'published', 'archived');
create type public.payment_verification_status as enum ('pending_verification', 'verified', 'rejected', 'needs_recheck');
create type public.provider_tag_status as enum ('none', 'pending', 'approved', 'rejected');
create type public.featured_slot_status as enum ('available', 'active', 'expired', 'cancelled');
create type public.subscription_status as enum ('inactive', 'trialing', 'active', 'past_due', 'canceled');

create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  display_name text,
  role public.user_role not null default 'user',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.sellers (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null unique references public.profiles(id) on delete cascade,
  seller_name text not null,
  provider_tag_status public.provider_tag_status not null default 'none',
  website_url text,
  discord_handle text,
  telegram_handle text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.products (
  id uuid primary key default gen_random_uuid(),
  seller_id uuid not null references public.sellers(id) on delete cascade,
  slug text not null unique,
  name text not null,
  game text not null,
  category text not null,
  status public.product_status not null default 'draft',
  website_url text,
  summary text,
  features text[] not null default '{}',
  price_points text[] not null default '{}',
  trust_score integer check (trust_score between 0 and 100),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.product_media (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  storage_path text not null,
  public_url text,
  alt_text text,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create table public.payment_methods (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  slug text not null unique,
  created_at timestamptz not null default now()
);

create table public.seller_payment_methods (
  id uuid primary key default gen_random_uuid(),
  seller_id uuid not null references public.sellers(id) on delete cascade,
  payment_method_id uuid not null references public.payment_methods(id) on delete restrict,
  status public.payment_verification_status not null default 'pending_verification',
  processor text,
  checkout_url text,
  refund_policy_url text,
  verified_at timestamptz,
  expires_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (seller_id, payment_method_id)
);

create table public.payment_verification_requests (
  id uuid primary key default gen_random_uuid(),
  seller_id uuid not null references public.sellers(id) on delete cascade,
  product_id uuid references public.products(id) on delete set null,
  payment_method_id uuid not null references public.payment_methods(id) on delete restrict,
  status public.payment_verification_status not null default 'pending_verification',
  proof_screenshot_path text,
  proof_document_path text,
  external_proof_url text,
  seller_notes text,
  admin_notes text,
  reviewed_by uuid references public.profiles(id) on delete set null,
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.provider_tag_requests (
  id uuid primary key default gen_random_uuid(),
  seller_id uuid not null references public.sellers(id) on delete cascade,
  status public.provider_tag_status not null default 'pending',
  website_url text,
  discord_handle text,
  telegram_handle text,
  proof_url text,
  seller_notes text,
  admin_notes text,
  reviewed_by uuid references public.profiles(id) on delete set null,
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.trust_signals (
  id uuid primary key default gen_random_uuid(),
  seller_id uuid references public.sellers(id) on delete cascade,
  product_id uuid references public.products(id) on delete cascade,
  label text not null,
  description text,
  is_public boolean not null default true,
  created_at timestamptz not null default now(),
  check (seller_id is not null or product_id is not null)
);

create table public.featured_slots (
  id uuid primary key default gen_random_uuid(),
  game text not null,
  category text not null,
  product_id uuid references public.products(id) on delete set null,
  seller_id uuid references public.sellers(id) on delete set null,
  status public.featured_slot_status not null default 'available',
  starts_at timestamptz,
  ends_at timestamptz,
  stripe_checkout_session_id text unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Enforces only one active featured slot per game/category.
create unique index featured_slots_one_active_per_game_category
on public.featured_slots (game, category)
where status = 'active';

create table public.stripe_customers (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null unique references public.profiles(id) on delete cascade,
  stripe_customer_id text not null unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  seller_id uuid not null references public.sellers(id) on delete cascade,
  stripe_subscription_id text unique,
  status public.subscription_status not null default 'inactive',
  current_period_end timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.admin_actions (
  id uuid primary key default gen_random_uuid(),
  admin_profile_id uuid not null references public.profiles(id) on delete restrict,
  action_type text not null,
  target_table text not null,
  target_id uuid,
  notes text,
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now()
);

create index products_seller_id_idx on public.products(seller_id);
create index products_public_marketplace_idx on public.products(status, game, category);
create index seller_payment_methods_public_idx on public.seller_payment_methods(status, seller_id);
create index payment_verification_requests_seller_status_idx on public.payment_verification_requests(seller_id, status);
create index provider_tag_requests_seller_status_idx on public.provider_tag_requests(seller_id, status);
create index featured_slots_lookup_idx on public.featured_slots(game, category, status);

create trigger profiles_set_updated_at before update on public.profiles for each row execute function public.set_updated_at();
create trigger sellers_set_updated_at before update on public.sellers for each row execute function public.set_updated_at();
create trigger products_set_updated_at before update on public.products for each row execute function public.set_updated_at();
create trigger seller_payment_methods_set_updated_at before update on public.seller_payment_methods for each row execute function public.set_updated_at();
create trigger payment_verification_requests_set_updated_at before update on public.payment_verification_requests for each row execute function public.set_updated_at();
create trigger provider_tag_requests_set_updated_at before update on public.provider_tag_requests for each row execute function public.set_updated_at();
create trigger featured_slots_set_updated_at before update on public.featured_slots for each row execute function public.set_updated_at();
create trigger stripe_customers_set_updated_at before update on public.stripe_customers for each row execute function public.set_updated_at();
create trigger subscriptions_set_updated_at before update on public.subscriptions for each row execute function public.set_updated_at();

create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select exists(select 1 from public.profiles where id = auth.uid() and role = 'admin');
$$;

create or replace function public.is_seller_owner(target_seller_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists(select 1 from public.sellers where id = target_seller_id and profile_id = auth.uid());
$$;

alter table public.profiles enable row level security;
alter table public.sellers enable row level security;
alter table public.products enable row level security;
alter table public.product_media enable row level security;
alter table public.payment_methods enable row level security;
alter table public.seller_payment_methods enable row level security;
alter table public.payment_verification_requests enable row level security;
alter table public.provider_tag_requests enable row level security;
alter table public.trust_signals enable row level security;
alter table public.featured_slots enable row level security;
alter table public.stripe_customers enable row level security;
alter table public.subscriptions enable row level security;
alter table public.admin_actions enable row level security;

create policy "profiles read own or admin" on public.profiles for select using (id = auth.uid() or public.is_admin());
create policy "profiles update own" on public.profiles for update using (id = auth.uid()) with check (id = auth.uid());

create policy "sellers public read" on public.sellers for select using (true);
create policy "sellers owner insert" on public.sellers for insert with check (profile_id = auth.uid());
create policy "sellers owner update" on public.sellers for update using (profile_id = auth.uid() or public.is_admin()) with check (profile_id = auth.uid() or public.is_admin());

create policy "products public read published" on public.products for select using (status = 'published' or public.is_seller_owner(seller_id) or public.is_admin());
create policy "products seller insert" on public.products for insert with check (public.is_seller_owner(seller_id));
create policy "products seller update" on public.products for update using (public.is_seller_owner(seller_id) or public.is_admin()) with check (public.is_seller_owner(seller_id) or public.is_admin());

create policy "product media public read for published products" on public.product_media for select using (exists (select 1 from public.products p where p.id = product_id and (p.status = 'published' or public.is_seller_owner(p.seller_id) or public.is_admin())));
create policy "product media seller manage" on public.product_media for all using (exists (select 1 from public.products p where p.id = product_id and public.is_seller_owner(p.seller_id)) or public.is_admin()) with check (exists (select 1 from public.products p where p.id = product_id and public.is_seller_owner(p.seller_id)) or public.is_admin());

create policy "payment methods public read" on public.payment_methods for select using (true);
create policy "payment methods admin manage" on public.payment_methods for all using (public.is_admin()) with check (public.is_admin());

create policy "verified seller payment methods public read" on public.seller_payment_methods for select using (status = 'verified' or public.is_seller_owner(seller_id) or public.is_admin());
create policy "seller payment methods admin manage" on public.seller_payment_methods for all using (public.is_admin()) with check (public.is_admin());

create policy "seller creates own payment requests" on public.payment_verification_requests for insert with check (public.is_seller_owner(seller_id));
create policy "seller reads own payment requests or admin" on public.payment_verification_requests for select using (public.is_seller_owner(seller_id) or public.is_admin());
create policy "admin updates payment requests" on public.payment_verification_requests for update using (public.is_admin()) with check (public.is_admin());

create policy "seller creates own provider tag requests" on public.provider_tag_requests for insert with check (public.is_seller_owner(seller_id));
create policy "seller reads own provider tag requests or admin" on public.provider_tag_requests for select using (public.is_seller_owner(seller_id) or public.is_admin());
create policy "admin updates provider tag requests" on public.provider_tag_requests for update using (public.is_admin()) with check (public.is_admin());

create policy "public reads public trust signals" on public.trust_signals for select using (is_public or public.is_admin());
create policy "admin manages trust signals" on public.trust_signals for all using (public.is_admin()) with check (public.is_admin());

create policy "public reads featured slots" on public.featured_slots for select using (true);
create policy "admin manages featured slots" on public.featured_slots for all using (public.is_admin()) with check (public.is_admin());

create policy "stripe customer owner/admin read" on public.stripe_customers for select using (profile_id = auth.uid() or public.is_admin());
create policy "stripe customer admin manage" on public.stripe_customers for all using (public.is_admin()) with check (public.is_admin());

create policy "subscription seller/admin read" on public.subscriptions for select using (public.is_seller_owner(seller_id) or public.is_admin());
create policy "subscription admin manage" on public.subscriptions for all using (public.is_admin()) with check (public.is_admin());

create policy "admin actions admin only" on public.admin_actions for all using (public.is_admin()) with check (public.is_admin());

insert into public.payment_methods (name, slug) values
  ('Crypto', 'crypto'),
  ('PayPal G&S', 'paypal-gs'),
  ('PayPal F&F', 'paypal-ff'),
  ('Card', 'card'),
  ('CashApp', 'cashapp'),
  ('Skrill', 'skrill'),
  ('Wise', 'wise'),
  ('Gift Cards', 'gift-cards'),
  ('Bank Transfer', 'bank-transfer')
on conflict (slug) do nothing;
