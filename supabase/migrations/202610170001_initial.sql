-- Initial PostgreSQL schema. Apply once to a dedicated Supabase project.
-- No sample users, posts, ratings, or payments are inserted.
begin;

create type public.fishing_category as enum ('sea','bass','trout','aji','eging');
create type public.coach_status as enum ('pending','approved','suspended');
create type public.consultation_status as enum ('requested','accepted','declined','cancelled');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  handle text unique not null check (handle ~ '^[a-z0-9_]{3,30}$'),
  display_name text not null check (char_length(btrim(display_name)) between 1 and 40),
  bio text not null default '' check (char_length(bio)<=1000),
  prefecture text not null default '' check (char_length(prefecture)<=20),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.posts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  title text not null check (char_length(btrim(title)) between 1 and 60),
  species text not null default '' check (char_length(species)<=40),
  size_cm numeric(5,1) check (size_cm>0 and size_cm<=999),
  category public.fishing_category not null,
  fished_on date not null,
  area text not null check (char_length(btrim(area)) between 1 and 80),
  method text not null default '' check (char_length(method)<=80),
  rod text not null default '' check (char_length(rod)<=100),
  reel text not null default '' check (char_length(reel)<=100),
  lure text not null default '' check (char_length(lure)<=100),
  memo text not null check (char_length(btrim(memo)) between 1 and 3000),
  image_path text check (image_path is null or (image_path like (user_id::text||'/'||id::text||'/%') and image_path ~ '\.webp$')),
  is_public boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index posts_feed_idx on public.posts(created_at desc,id) where is_public;
create index posts_user_idx on public.posts(user_id,created_at desc);
create index posts_category_idx on public.posts(category,created_at desc) where is_public;

create table public.post_likes (
  post_id uuid not null references public.posts(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key(post_id,user_id)
);
create table public.bookmarks (
  post_id uuid not null references public.posts(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key(post_id,user_id)
);
create index bookmarks_user_idx on public.bookmarks(user_id,created_at desc);
create table public.follows (
  follower_id uuid not null references public.profiles(id) on delete cascade,
  following_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key(follower_id,following_id),
  check(follower_id<>following_id)
);
create index follows_following_idx on public.follows(following_id);
create table public.comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.posts(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  body text not null check (char_length(btrim(body)) between 1 and 500),
  created_at timestamptz not null default now()
);
create index comments_post_idx on public.comments(post_id,created_at);

create table public.coach_profiles (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  status public.coach_status not null default 'pending',
  introduction text not null check(char_length(btrim(introduction)) between 20 and 2000),
  category public.fishing_category not null,
  area text not null check(char_length(btrim(area)) between 1 and 100),
  years_experience smallint not null check(years_experience between 0 and 80),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index coaches_approved_idx on public.coach_profiles(category) where status='approved';
create table public.coaching_plans (
  id uuid primary key default gen_random_uuid(),
  coach_id uuid not null references public.coach_profiles(user_id) on delete restrict,
  title text not null check(char_length(btrim(title)) between 1 and 80),
  description text not null check(char_length(btrim(description)) between 20 and 3000),
  duration_minutes integer not null check(duration_minutes between 30 and 720),
  price_yen integer not null check(price_yen between 0 and 1000000),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index plans_coach_idx on public.coaching_plans(coach_id) where is_active;

create table public.coaching_requests (
  id uuid primary key default gen_random_uuid(),
  client_token uuid not null,
  student_id uuid not null references public.profiles(id) on delete restrict,
  coach_id uuid not null references public.profiles(id) on delete restrict,
  plan_id uuid not null references public.coaching_plans(id) on delete restrict,
  plan_title text not null,
  price_yen integer not null,
  duration_minutes integer not null,
  preferred_date date not null,
  preferred_time text not null check(preferred_time in ('morning','afternoon','evening','flexible')),
  experience text not null check(experience in ('first','beginner','experienced')),
  goal text not null check(char_length(btrim(goal)) between 1 and 100),
  message text not null check(char_length(btrim(message)) between 1 and 2000),
  status public.consultation_status not null default 'requested',
  coach_note text not null default '' check(char_length(coach_note)<=1000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(student_id,client_token),
  check(student_id<>coach_id)
);
create index requests_student_idx on public.coaching_requests(student_id,created_at desc);
create index requests_coach_idx on public.coaching_requests(coach_id,created_at desc);

create function public.touch_updated_at() returns trigger language plpgsql set search_path='' as $$
begin new.updated_at=now(); return new; end; $$;
create trigger profiles_touch before update on public.profiles for each row execute function public.touch_updated_at();
create trigger posts_touch before update on public.posts for each row execute function public.touch_updated_at();
create trigger coaches_touch before update on public.coach_profiles for each row execute function public.touch_updated_at();
create trigger plans_touch before update on public.coaching_plans for each row execute function public.touch_updated_at();
create trigger requests_touch before update on public.coaching_requests for each row execute function public.touch_updated_at();

create function public.handle_new_user() returns trigger language plpgsql security definer set search_path='' as $$
begin
  insert into public.profiles(id,handle,display_name) values(new.id,'u_'||left(replace(new.id::text,'-',''),24),coalesce(nullif(left(btrim(new.raw_user_meta_data->>'display_name'),40),''),'釣り人'));
  return new;
end; $$;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();

create function public.guard_post() returns trigger language plpgsql security definer set search_path='' as $$
begin
  if new.fished_on>(now() at time zone 'Asia/Tokyo')::date then raise exception 'Future fishing dates are not allowed' using errcode='23514'; end if;
  if tg_op='INSERT' then
    perform pg_advisory_xact_lock(hashtextextended(new.user_id::text,0));
    if (select count(*) from public.posts where user_id=new.user_id and created_at>now()-interval '1 minute')>=10 then
      raise exception 'Posting too frequently' using errcode='P0001';
    end if;
  end if;
  return new;
end; $$;
create trigger posts_guard before insert or update on public.posts for each row execute function public.guard_post();

-- Copy the price/coach/title on the server. Clients cannot choose these snapshots.
create function public.prepare_coaching_request() returns trigger language plpgsql security definer set search_path='' as $$
declare selected public.coaching_plans;
begin
  select p.* into selected from public.coaching_plans p join public.coach_profiles c on c.user_id=p.coach_id
    where p.id=new.plan_id and p.is_active and c.status='approved' for share of p,c;
  if not found then raise exception 'This plan is not available' using errcode='23514'; end if;
  if new.preferred_date<(now() at time zone 'Asia/Tokyo')::date then raise exception 'Past consultation dates are not allowed' using errcode='23514'; end if;
  new.coach_id=selected.coach_id; new.plan_title=selected.title;
  new.price_yen=selected.price_yen; new.duration_minutes=selected.duration_minutes;
  new.status='requested'; new.coach_note='';
  perform pg_advisory_xact_lock(hashtextextended(new.student_id::text,1));
  if (select count(*) from public.coaching_requests where student_id=new.student_id and created_at>now()-interval '1 minute')>=5 then
    raise exception 'Too many consultation requests' using errcode='P0001';
  end if;
  return new;
end; $$;
create trigger requests_prepare before insert on public.coaching_requests for each row execute function public.prepare_coaching_request();

create function public.guard_request_transition() returns trigger language plpgsql set search_path='' as $$
declare actor uuid=auth.uid();
begin
  if actor is null then raise exception 'An authenticated participant is required' using errcode='42501'; end if;
  if actor=old.student_id then
    if not(old.status in ('requested','accepted') and new.status='cancelled') or new.coach_note is distinct from old.coach_note then
      raise exception 'Invalid student transition' using errcode='42501';
    end if;
  elsif actor=old.coach_id then
    if not(old.status='requested' and new.status in ('accepted','declined')) then
      raise exception 'Invalid coach transition' using errcode='42501';
    end if;
  else raise exception 'Not a participant' using errcode='42501'; end if;
  return new;
end; $$;
create trigger requests_transition before update on public.coaching_requests for each row execute function public.guard_request_transition();

alter table public.profiles enable row level security;
alter table public.posts enable row level security;
alter table public.post_likes enable row level security;
alter table public.bookmarks enable row level security;
alter table public.follows enable row level security;
alter table public.comments enable row level security;
alter table public.coach_profiles enable row level security;
alter table public.coaching_plans enable row level security;
alter table public.coaching_requests enable row level security;

-- Start from explicit least privileges, including on older Supabase projects.
revoke all on public.profiles,public.posts,public.post_likes,public.bookmarks,public.follows,public.comments,public.coach_profiles,public.coaching_plans,public.coaching_requests from anon,authenticated;
grant usage on schema public to anon,authenticated;
grant select on public.profiles,public.posts,public.post_likes,public.follows,public.comments,public.coach_profiles,public.coaching_plans to anon,authenticated;
grant select on public.bookmarks,public.coaching_requests to authenticated;
grant update(handle,display_name,bio,prefecture) on public.profiles to authenticated;
grant insert(id,user_id,title,species,size_cm,category,fished_on,area,method,rod,reel,lure,memo,is_public) on public.posts to authenticated;
grant update(title,species,size_cm,category,fished_on,area,method,rod,reel,lure,memo,image_path,is_public) on public.posts to authenticated;
grant delete on public.posts to authenticated;
grant insert(post_id,user_id),delete on public.post_likes,public.bookmarks to authenticated;
grant insert(follower_id,following_id),delete on public.follows to authenticated;
grant insert(post_id,user_id,body),delete on public.comments to authenticated;
grant insert(user_id,introduction,category,area,years_experience),update(introduction,category,area,years_experience) on public.coach_profiles to authenticated;
grant insert(coach_id,title,description,duration_minutes,price_yen,is_active),update(title,description,duration_minutes,price_yen,is_active) on public.coaching_plans to authenticated;
grant insert(client_token,student_id,plan_id,preferred_date,preferred_time,experience,goal,message),update(status,coach_note) on public.coaching_requests to authenticated;
grant all on public.profiles,public.posts,public.post_likes,public.bookmarks,public.follows,public.comments,public.coach_profiles,public.coaching_plans,public.coaching_requests to service_role;

create policy profiles_read on public.profiles for select to anon,authenticated using(true);
create policy profiles_edit on public.profiles for update to authenticated using(id=(select auth.uid())) with check(id=(select auth.uid()));
create policy posts_read on public.posts for select to anon,authenticated using(is_public or user_id=(select auth.uid()));
create policy posts_create on public.posts for insert to authenticated with check(user_id=(select auth.uid()));
create policy posts_edit on public.posts for update to authenticated using(user_id=(select auth.uid())) with check(user_id=(select auth.uid()));
create policy posts_delete on public.posts for delete to authenticated using(user_id=(select auth.uid()));
create policy likes_read on public.post_likes for select to anon,authenticated using(exists(select 1 from public.posts p where p.id=post_id));
create policy likes_create on public.post_likes for insert to authenticated with check(user_id=(select auth.uid()) and exists(select 1 from public.posts p where p.id=post_id));
create policy likes_delete on public.post_likes for delete to authenticated using(user_id=(select auth.uid()));
create policy bookmarks_read on public.bookmarks for select to authenticated using(user_id=(select auth.uid()));
create policy bookmarks_create on public.bookmarks for insert to authenticated with check(user_id=(select auth.uid()) and exists(select 1 from public.posts p where p.id=post_id));
create policy bookmarks_delete on public.bookmarks for delete to authenticated using(user_id=(select auth.uid()));
create policy follows_read on public.follows for select to anon,authenticated using(true);
create policy follows_create on public.follows for insert to authenticated with check(follower_id=(select auth.uid()));
create policy follows_delete on public.follows for delete to authenticated using(follower_id=(select auth.uid()));
create policy comments_read on public.comments for select to anon,authenticated using(exists(select 1 from public.posts p where p.id=post_id));
create policy comments_create on public.comments for insert to authenticated with check(user_id=(select auth.uid()) and exists(select 1 from public.posts p where p.id=post_id));
create policy comments_delete on public.comments for delete to authenticated using(user_id=(select auth.uid()));
create policy coaches_read on public.coach_profiles for select to anon,authenticated using(status='approved' or user_id=(select auth.uid()));
create policy coaches_apply on public.coach_profiles for insert to authenticated with check(user_id=(select auth.uid()) and status='pending');
create policy coaches_edit on public.coach_profiles for update to authenticated using(user_id=(select auth.uid())) with check(user_id=(select auth.uid()));
create policy plans_read on public.coaching_plans for select to anon,authenticated using(coach_id=(select auth.uid()) or (is_active and exists(select 1 from public.coach_profiles c where c.user_id=coach_id and c.status='approved')));
create policy plans_create on public.coaching_plans for insert to authenticated with check(coach_id=(select auth.uid()) and exists(select 1 from public.coach_profiles c where c.user_id=coach_id and c.status='approved'));
create policy plans_edit on public.coaching_plans for update to authenticated using(coach_id=(select auth.uid())) with check(coach_id=(select auth.uid()));
create policy requests_read on public.coaching_requests for select to authenticated using(student_id=(select auth.uid()) or coach_id=(select auth.uid()));
create policy requests_create on public.coaching_requests for insert to authenticated with check(student_id=(select auth.uid()) and coach_id<>(select auth.uid()));
create policy requests_edit on public.coaching_requests for update to authenticated using(student_id=(select auth.uid()) or coach_id=(select auth.uid())) with check(student_id=(select auth.uid()) or coach_id=(select auth.uid()));

create view public.post_stats with(security_invoker=true) as
select p.id as post_id,
  (select count(*)::integer from public.post_likes l where l.post_id=p.id) as like_count,
  (select count(*)::integer from public.comments c where c.post_id=p.id) as comment_count
from public.posts p;
grant select on public.post_stats to anon,authenticated;

-- Private bucket: access is authorized against the corresponding post.
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('catch-photos','catch-photos',false,10485760,array['image/webp']);
create policy catch_photos_read on storage.objects for select to anon,authenticated using(
  bucket_id='catch-photos' and exists(select 1 from public.posts p where p.image_path=name)
);
create policy catch_photos_insert on storage.objects for insert to authenticated with check(
  bucket_id='catch-photos' and (storage.foldername(name))[1]=(select auth.uid())::text
  and exists(select 1 from public.posts p where p.id::text=(storage.foldername(name))[2] and p.user_id=(select auth.uid()))
);
create policy catch_photos_delete on storage.objects for delete to authenticated using(
  bucket_id='catch-photos' and (storage.foldername(name))[1]=(select auth.uid())::text
);

revoke all on function public.handle_new_user(),public.prepare_coaching_request(),public.guard_post(),public.guard_request_transition(),public.touch_updated_at() from public,anon,authenticated;
commit;
