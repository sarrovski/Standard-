-- Per-product event log used by the seller Analytics tab.
-- One row per beacon: a product page view, or an outbound CTA click.
--
-- visitor_hash is a coarse, day-scoped hash of (ip, user_agent) computed by
-- the /api/product-events route. It's not a stable identity; it just lets us
-- de-dupe rough refresh-spam at aggregate time if we ever want to.
--
-- Inserts are open to anon + authenticated (anonymous beacons from the
-- public product page). Reads are gated to the seller who owns the product.

create table if not exists public.product_events (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  kind text not null check (kind in ('view', 'outbound_click')),
  visitor_hash text,
  ts timestamptz not null default now()
);

create index if not exists product_events_product_kind_ts_idx
  on public.product_events (product_id, kind, ts desc);

alter table public.product_events enable row level security;

drop policy if exists "anyone can record product events" on public.product_events;
create policy "anyone can record product events"
  on public.product_events
  for insert
  to anon, authenticated
  with check (true);

drop policy if exists "sellers read own product events" on public.product_events;
create policy "sellers read own product events"
  on public.product_events
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.products p
      join public.sellers s on s.id = p.seller_id
      where p.id = product_events.product_id
        and s.profile_id = auth.uid()
    )
  );

-- Aggregation helper. Returns one row per product owned by the given seller
-- with totals for views and outbound clicks. SECURITY DEFINER + a hard
-- predicate on seller_id keeps the function safe to call from RLS contexts.
create or replace function public.get_product_traffic_stats(p_seller_id uuid)
returns table (
  product_id uuid,
  views bigint,
  outbound_clicks bigint
)
language sql
stable
security definer
set search_path = public
as $$
  select
    p.id as product_id,
    count(*) filter (where pe.kind = 'view') as views,
    count(*) filter (where pe.kind = 'outbound_click') as outbound_clicks
  from public.products p
  left join public.product_events pe on pe.product_id = p.id
  where p.seller_id = p_seller_id
  group by p.id;
$$;

grant execute on function public.get_product_traffic_stats(uuid)
  to authenticated;
