-- Apply after all previous migrations, to an isolated DB or an explicitly approved release.
begin;
create schema if not exists app_private;
revoke all on schema app_private from public,anon,authenticated;

-- ポイント FR-03: trusted account issuance time, inclusive start / exclusive end.
create table if not exists app_private.point_reward_campaign (
 id text primary key check(id='signup'),
 starts_at timestamptz,
 ends_at timestamptz not null,
 check(starts_at is null or starts_at<ends_at)
);
alter table app_private.point_reward_campaign enable row level security;
revoke all on app_private.point_reward_campaign from public,anon,authenticated;
insert into app_private.point_reward_campaign(id,starts_at,ends_at)
 values('signup',null,'2027-03-31T00:00:00+09:00') on conflict(id) do nothing;

-- No post FK: deletion must preserve both the earning event and its reversal.
create table if not exists public.point_transactions (
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null references public.profiles(id) on delete cascade,
 kind text not null check(kind in ('opening','signup','post','post_reversal')),
 source_id uuid not null,
 amount integer not null check(amount<>0),
 occurred_at timestamptz not null default now(),
 unique(user_id,kind,source_id),
 check((kind='post_reversal' and amount<0) or (kind<>'post_reversal' and amount>0))
);
create index if not exists point_transactions_history_idx on public.point_transactions(user_id,occurred_at desc,id desc);
alter table public.point_transactions enable row level security;
revoke all on public.point_transactions from public,anon,authenticated;
grant select on public.point_transactions to authenticated;
drop policy if exists point_transactions_read on public.point_transactions;
create policy point_transactions_read on public.point_transactions for select to authenticated using(user_id=(select auth.uid()));

-- Opening entries describe existing holdings; they do not add to them again.
insert into public.point_transactions(user_id,kind,source_id,amount)
 select user_id,'opening',user_id,balance from public.point_accounts a where balance>0
 and not exists(select 1 from public.point_transactions t where t.user_id=a.user_id)
 on conflict(user_id,kind,source_id) do nothing;

create or replace function app_private.apply_point_transaction()
returns trigger language plpgsql security definer set search_path='' as $$
begin
 update public.point_accounts set balance=balance+new.amount where user_id=new.user_id;
 if not found then raise exception 'Point account missing' using errcode='23503'; end if;
 return new;
end; $$;
revoke all on function app_private.apply_point_transaction() from public,anon,authenticated;
drop trigger if exists point_transactions_apply on public.point_transactions;
create trigger point_transactions_apply after insert on public.point_transactions for each row execute function app_private.apply_point_transaction();

create or replace function app_private.grant_registration_reward(p_user_id uuid)
returns void language plpgsql security definer set search_path='' as $$
begin
 perform 1 from public.point_accounts where user_id=p_user_id for update;
 insert into public.point_transactions(user_id,kind,source_id,amount)
 select u.id,'signup',u.id,5000 from auth.users u cross join app_private.point_reward_campaign c
 where u.id=p_user_id and c.id='signup' and (c.starts_at is null or u.created_at>=c.starts_at) and u.created_at<c.ends_at
 on conflict(user_id,kind,source_id) do nothing;
end; $$;
revoke all on function app_private.grant_registration_reward(uuid) from public,anon,authenticated;

create or replace function public.create_point_account()
returns trigger language plpgsql security definer set search_path='' as $$
begin
 insert into public.point_accounts(user_id) values(new.id) on conflict(user_id) do nothing;
 perform app_private.grant_registration_reward(new.id);
 return new;
end; $$;
revoke all on function public.create_point_account() from public,anon,authenticated;

-- Safe to repeat: campaign settings and existing balances are retained.
do $$ declare member_id uuid; begin
 for member_id in select user_id from public.point_accounts order by user_id loop
  perform app_private.grant_registration_reward(member_id);
 end loop;
end; $$;

create or replace function public.registration_reward_campaign()
returns jsonb language sql stable security definer set search_path='' as $$
 select jsonb_build_object('starts_at',starts_at,'ends_at',ends_at,'amount',5000)
 from app_private.point_reward_campaign where id='signup'
$$;
revoke all on function public.registration_reward_campaign() from public,anon,authenticated;
grant execute on function public.registration_reward_campaign() to anon,authenticated;

-- Existing posts stay ineligible. Clients have no INSERT/UPDATE privilege on this column.
alter table public.posts add column if not exists points_eligible boolean not null default false;
alter table public.posts alter column points_eligible set default true;
alter table public.posts drop constraint if exists posts_memo_check;
alter table public.posts add constraint posts_memo_check check(char_length(btrim(memo))<=3000);

-- ポイント FR-02: only saved server-side content determines the earning amount.
create or replace function public.finalize_post_points(p_post_id uuid)
returns integer language plpgsql security definer set search_path='' as $$
declare p public.posts; earned integer; previous integer;
 whitespace constant text:=U&'\0009\000A\000B\000C\000D\0020\00A0\1680\2000\2001\2002\2003\2004\2005\2006\2007\2008\2009\200A\2028\2029\202F\205F\3000\FEFF';
begin
 if auth.uid() is null then raise exception 'Login required' using errcode='42501'; end if;
 select * into p from public.posts where id=p_post_id and user_id=auth.uid() for update;
 if not found or not p.points_eligible then raise exception 'Post is not eligible' using errcode='42501'; end if;
 select amount into previous from public.point_transactions where user_id=p.user_id and kind='post' and source_id=p.id;
 if found then return previous; end if;
 if exists(select 1 from unnest(p.image_paths) path where not exists(
  select 1 from storage.objects o where o.bucket_id='catch-photos' and o.name=path
 )) then raise exception 'Post photos are not saved' using errcode='23514'; end if;
 earned=100+10*cardinality(p.image_paths);
 if translate(p.rod||p.reel||p.lure,whitespace,'')<>'' then earned=earned+10; end if;
 if char_length(translate(p.memo,whitespace,''))>=100 then earned=earned+50; end if;
 perform 1 from public.point_accounts where user_id=p.user_id for update;
 insert into public.point_transactions(user_id,kind,source_id,amount) values(p.user_id,'post',p.id,earned);
 return earned;
end; $$;
revoke all on function public.finalize_post_points(uuid) from public,anon,authenticated;
grant execute on function public.finalize_post_points(uuid) to authenticated;

-- ポイント FR-02: a deletion reverses the immutable original earning, never today's content.
create or replace function app_private.reverse_post_points()
returns trigger language plpgsql security definer set search_path='' as $$
begin
 -- Account deletion cascades must not attempt to recreate a deleted member's ledger.
 if not exists(select 1 from public.profiles where id=old.user_id) then return old; end if;
 perform 1 from public.point_accounts where user_id=old.user_id for update;
 insert into public.point_transactions(user_id,kind,source_id,amount)
 select user_id,'post_reversal',source_id,-amount from public.point_transactions
 where user_id=old.user_id and kind='post' and source_id=old.id
 on conflict(user_id,kind,source_id) do nothing;
 return old;
end; $$;
revoke all on function app_private.reverse_post_points() from public,anon,authenticated;
drop trigger if exists posts_reverse_points on public.posts;
create trigger posts_reverse_points after delete on public.posts for each row execute function app_private.reverse_post_points();

notify pgrst,'reload schema';
commit;
