-- Rank is derived from student-confirmed lessons. No existing request is marked complete.
begin;

create table if not exists public.coaching_completions (
 request_id uuid primary key references public.coaching_requests(id) on delete restrict,
 coach_id uuid not null references public.profiles(id) on delete restrict,
 student_id uuid not null references public.profiles(id) on delete restrict,
 confirmed_at timestamptz not null default now(),
 check(coach_id<>student_id)
);
create index if not exists coaching_completions_coach_idx on public.coaching_completions(coach_id);
alter table public.coaching_completions enable row level security;
revoke all on public.coaching_completions from public,anon,authenticated;
grant select on public.coaching_completions to authenticated;
grant all on public.coaching_completions to service_role;
drop policy if exists coaching_completions_read on public.coaching_completions;
create policy coaching_completions_read on public.coaching_completions for select to authenticated
 using(auth.uid() in (student_id,coach_id));

create table if not exists public.coaching_request_compensation (
 request_id uuid primary key references public.coaching_requests(id) on delete cascade,
 coach_id uuid not null references public.profiles(id) on delete restrict,
 rank text not null check(rank in ('platinum','gold','silver','bronze')),
 coach_payout_yen integer not null check(coach_payout_yen in (5000,4000,3000,2000))
);
alter table public.coaching_request_compensation enable row level security;
revoke all on public.coaching_request_compensation from public,anon,authenticated;
grant select on public.coaching_request_compensation to authenticated;
grant all on public.coaching_request_compensation to service_role;
drop policy if exists coaching_compensation_read on public.coaching_request_compensation;
create policy coaching_compensation_read on public.coaching_request_compensation for select to authenticated using(coach_id=auth.uid());

create or replace function public.coach_rank_rate(p_completed_lessons bigint)
returns table(rank text,price_yen integer,coach_payout_yen integer)
language plpgsql immutable set search_path='' as $$
begin
 if p_completed_lessons is null or p_completed_lessons<0 then raise exception 'Invalid lesson count' using errcode='22023';end if;
 return query select case when p_completed_lessons>=100 then 'platinum' when p_completed_lessons>=30 then 'gold' when p_completed_lessons>=10 then 'silver' else 'bronze' end,
 case when p_completed_lessons>=100 then 7000 when p_completed_lessons>=30 then 5000 when p_completed_lessons>=10 then 4000 else 3000 end,
 case when p_completed_lessons>=100 then 5000 when p_completed_lessons>=30 then 4000 when p_completed_lessons>=10 then 3000 else 2000 end;
end;$$;

-- Only aggregate counts of public coaches (or the signed-in coach) are returned.
create or replace function public.get_coach_rankings(p_coach_ids uuid[])
returns table(coach_id uuid,completed_lessons bigint,rank text)
language sql stable security definer set search_path='' as $$
 select c.user_id,counts.total,rate.rank from public.coach_profiles c
 cross join lateral(select count(*) as total from public.coaching_completions d where d.coach_id=c.user_id) counts
 cross join lateral public.coach_rank_rate(counts.total) rate
 where c.user_id=any(p_coach_ids[1:200]) and (c.status='approved' or c.user_id=auth.uid());
$$;

create or replace function public.confirm_coaching_completion(p_request_id uuid)
returns void language plpgsql security definer set search_path='' as $$
declare request public.coaching_requests;
begin
 if auth.uid() is null then raise exception 'Authentication required' using errcode='42501';end if;
 select * into request from public.coaching_requests where id=p_request_id for update;
 if not found or request.student_id<>auth.uid() then raise exception 'Student confirmation required' using errcode='42501';end if;
 if request.status<>'accepted' or request.preferred_date>(now() at time zone 'Asia/Tokyo')::date then
  raise exception 'Confirm an accepted lesson on or after its date' using errcode='23514';
 end if;
 insert into public.coaching_completions(request_id,coach_id,student_id)
 values(request.id,request.coach_id,request.student_id) on conflict(request_id) do nothing;
end;$$;

create or replace function public.guard_completed_coaching_request()
returns trigger language plpgsql security definer set search_path='' as $$
begin
 if exists(select 1 from public.coaching_completions where request_id=old.id) then
  raise exception 'A completed lesson cannot be changed' using errcode='23514';
 end if;
 return new;
end;$$;
drop trigger if exists requests_completed_guard on public.coaching_requests;
create trigger requests_completed_guard before update on public.coaching_requests for each row execute function public.guard_completed_coaching_request();

-- Enforce current two-hour pricing even for a direct client write. Other durations retain their price.
create or replace function public.price_ranked_coaching_plan()
returns trigger language plpgsql security definer set search_path='' as $$
begin
 if new.duration_minutes=120 then
  select rate.price_yen into new.price_yen from public.coach_rank_rate((select count(*) from public.coaching_completions where coach_id=new.coach_id)) rate;
 end if;
 return new;
end;$$;
drop trigger if exists plans_rank_price on public.coaching_plans;
create trigger plans_rank_price before insert or update on public.coaching_plans for each row execute function public.price_ranked_coaching_plan();

create or replace function public.refresh_coach_rank_prices()
returns trigger language plpgsql security definer set search_path='' as $$
begin
 perform pg_advisory_xact_lock(hashtextextended(new.coach_id::text,28));
 update public.coaching_plans set price_yen=price_yen where coach_id=new.coach_id and duration_minutes=120;
 return new;
end;$$;
drop trigger if exists completions_refresh_prices on public.coaching_completions;
create trigger completions_refresh_prices after insert on public.coaching_completions for each row execute function public.refresh_coach_rank_prices();
-- Apply the new current rates to two-hour plans; historic request quotes remain untouched.
update public.coaching_plans set price_yen=price_yen where duration_minutes=120;

-- The quote is derived afresh at submission, not from a stale stored plan price.
create or replace function public.prepare_coaching_request() returns trigger language plpgsql security definer set search_path='' as $$
declare selected public.coaching_plans;
begin
 select p.* into selected from public.coaching_plans p join public.coach_profiles c on c.user_id=p.coach_id
 where p.id=new.plan_id and p.is_active and c.status='approved' for share of p,c;
 if not found then raise exception 'This plan is not available' using errcode='23514';end if;
 if new.preferred_date<(now() at time zone 'Asia/Tokyo')::date then raise exception 'Past consultation dates are not allowed' using errcode='23514';end if;
 new.coach_id=selected.coach_id;new.plan_title=selected.title;new.duration_minutes=selected.duration_minutes;
 new.price_yen=selected.price_yen;
 if selected.duration_minutes=120 then
  select rate.price_yen into new.price_yen from public.coach_rank_rate((select count(*) from public.coaching_completions where coach_id=selected.coach_id)) rate;
 end if;
 new.status='requested';new.coach_note='';
 perform pg_advisory_xact_lock(hashtextextended(new.student_id::text,1));
 if (select count(*) from public.coaching_requests where student_id=new.student_id and created_at>now()-interval '1 minute')>=5 then
  raise exception 'Too many consultation requests' using errcode='P0001';
 end if;
 return new;
end;$$;

create or replace function public.snapshot_coaching_compensation()
returns trigger language plpgsql security definer set search_path='' as $$
begin
 if new.duration_minutes=120 then
  insert into public.coaching_request_compensation(request_id,coach_id,rank,coach_payout_yen)
  select new.id,new.coach_id,rate.rank,rate.coach_payout_yen from public.coach_rank_rate(
   case new.price_yen when 7000 then 100 when 5000 then 30 when 4000 then 10 else 0 end
  ) rate;
 end if;
 return new;
end;$$;
drop trigger if exists requests_compensation_snapshot on public.coaching_requests;
create trigger requests_compensation_snapshot after insert on public.coaching_requests for each row execute function public.snapshot_coaching_compensation();

revoke all on function public.coach_rank_rate(bigint),public.get_coach_rankings(uuid[]),public.confirm_coaching_completion(uuid),public.guard_completed_coaching_request(),public.price_ranked_coaching_plan(),public.snapshot_coaching_compensation(),public.refresh_coach_rank_prices() from public,anon,authenticated;
grant execute on function public.get_coach_rankings(uuid[]) to anon,authenticated;
grant execute on function public.confirm_coaching_completion(uuid) to authenticated;
notify pgrst,'reload schema';
commit;
