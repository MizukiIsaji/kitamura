-- Application administrator membership is writable only by the DB owner.
-- This migration grants no account administrator access by itself.
begin;

create schema if not exists app_private;
revoke all on schema app_private from public,anon,authenticated;

create table if not exists app_private.admin_members (
  user_id uuid primary key references auth.users(id) on delete cascade,
  granted_at timestamptz not null default now()
);
create table if not exists app_private.coach_review_log (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references auth.users(id) on delete set null,
  coach_id uuid references public.coach_profiles(user_id) on delete set null,
  previous_status public.coach_status not null,
  next_status public.coach_status not null,
  created_at timestamptz not null default now()
);
alter table app_private.admin_members enable row level security;
alter table app_private.coach_review_log enable row level security;
revoke all on app_private.admin_members,app_private.coach_review_log from public,anon,authenticated;

create or replace function public.is_app_admin()
returns boolean language sql stable security definer set search_path='' as $$
  select auth.uid() is not null and exists(
    select 1 from app_private.admin_members where user_id=auth.uid()
  );
$$;

create or replace function public.admin_dashboard()
returns jsonb language plpgsql security definer set search_path='' as $$
begin
  if not public.is_app_admin() then
    raise exception 'Administrator access required' using errcode='42501';
  end if;
  return jsonb_build_object(
    'memberCount',(select count(*) from public.profiles),
    'publicPostCount',(select count(*) from public.posts where is_public),
    'pendingCoachCount',(select count(*) from public.coach_profiles where status='pending'),
    'coaches',coalesce((
      select jsonb_agg(to_jsonb(c)) from (
        select cp.user_id,cp.status,cp.introduction,cp.category,cp.area,
               cp.years_experience,cp.created_at,p.display_name,p.handle
        from public.coach_profiles cp join public.profiles p on p.id=cp.user_id
        order by (cp.status='pending') desc,cp.created_at desc,cp.user_id
        limit 100
      ) c
    ),'[]'::jsonb)
  );
end;
$$;

create or replace function public.admin_set_coach_status(p_user_id uuid,p_status public.coach_status)
returns void language plpgsql security definer set search_path='' as $$
declare old_status public.coach_status;
begin
  if not public.is_app_admin() then
    raise exception 'Administrator access required' using errcode='42501';
  end if;
  if p_status is null then
    raise exception 'A valid coach status is required' using errcode='23514';
  end if;
  select status into old_status from public.coach_profiles where user_id=p_user_id for update;
  if not found then raise exception 'Coach application not found' using errcode='23503'; end if;
  if old_status=p_status then return; end if;
  update public.coach_profiles set status=p_status where user_id=p_user_id;
  insert into app_private.coach_review_log(actor_id,coach_id,previous_status,next_status)
  values(auth.uid(),p_user_id,old_status,p_status);
end;
$$;

revoke all on function public.is_app_admin(),public.admin_dashboard(),public.admin_set_coach_status(uuid,public.coach_status) from public,anon,authenticated;
grant execute on function public.is_app_admin(),public.admin_dashboard(),public.admin_set_coach_status(uuid,public.coach_status) to authenticated;

notify pgrst,'reload schema';
commit;
