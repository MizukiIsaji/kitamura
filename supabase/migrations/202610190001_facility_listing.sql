-- Fishing ponds, fishing spots and tackle shops that the operator curates and publishes.
-- Pins stay at the prefecture level, same as existing catches and coaches; no geocoding is performed.
begin;

create table public.facilities (
  id uuid primary key default gen_random_uuid(),
  kind text not null check (kind in ('pond','spot','shop')),
  name text not null check (char_length(btrim(name)) between 1 and 60),
  description text not null check (char_length(btrim(description)) between 1 and 1000),
  prefecture text not null check (char_length(btrim(prefecture)) between 1 and 10),
  municipality text not null default '' check (char_length(municipality)<=50),
  address text not null default '' check (char_length(address)<=200),
  phone text not null default '' check (char_length(phone)<=20),
  business_hours text not null default '' check (char_length(business_hours)<=200),
  price_info text not null default '' check (char_length(price_info)<=500),
  is_published boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index facilities_kind_idx on public.facilities(kind) where is_published;

-- is_app_admin() (202610170002_admin.sql) was granted only to authenticated; the public read policy
-- below also needs it callable by anon, since an unauthenticated visitor must still evaluate false, not error.
grant execute on function public.is_app_admin() to anon;

alter table public.facilities enable row level security;
create policy facilities_read on public.facilities for select to anon,authenticated using (is_published or public.is_app_admin());
create policy facilities_admin_write on public.facilities for all to authenticated
  using (public.is_app_admin()) with check (public.is_app_admin());
create trigger facilities_touch before update on public.facilities for each row execute function public.touch_updated_at();

revoke all on public.facilities from public,anon,authenticated;
grant select on public.facilities to anon,authenticated;
grant insert,update,delete on public.facilities to authenticated;

notify pgrst,'reload schema';
commit;
