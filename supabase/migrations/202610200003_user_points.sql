-- User point holdings only. Award/spending rules are intentionally not implemented.
-- Apply to an isolated development DB, or during an explicitly approved release.
begin;
create table if not exists public.point_accounts (
 user_id uuid primary key references public.profiles(id) on delete cascade,
 balance integer not null default 0 check(balance>=0),
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now()
);
alter table public.point_accounts enable row level security;
revoke all on public.point_accounts from public,anon,authenticated;
grant select on public.point_accounts to authenticated;
drop policy if exists point_accounts_read on public.point_accounts;
create policy point_accounts_read on public.point_accounts for select to authenticated using(user_id=auth.uid());

-- A profile and its initial zero-point account are created in the same transaction.
create or replace function public.create_point_account()
returns trigger language plpgsql security definer set search_path='' as $$
begin
 insert into public.point_accounts(user_id) values(new.id) on conflict(user_id) do nothing;
 return new;
end;
$$;
revoke all on function public.create_point_account() from public,anon,authenticated;
drop trigger if exists profiles_create_point_account on public.profiles;
create trigger profiles_create_point_account after insert on public.profiles for each row execute function public.create_point_account();
drop trigger if exists point_accounts_touch on public.point_accounts;
create trigger point_accounts_touch before update on public.point_accounts for each row execute function public.touch_updated_at();

-- Backfill existing members without overwriting any existing balances.
insert into public.point_accounts(user_id) select id from public.profiles on conflict(user_id) do nothing;
notify pgrst,'reload schema';
commit;
