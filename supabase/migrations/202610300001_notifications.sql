-- 通知 FR-01: consultation state changes create a notification for the other party. No message body or price is copied (FR-02.2, NFR-01.1).
begin;

create table if not exists public.notifications (
 id uuid primary key default gen_random_uuid(),
 recipient_id uuid not null references public.profiles(id) on delete cascade,
 consultation_id uuid not null references public.coaching_requests(id) on delete cascade,
 kind text not null check(kind in ('new_consultation','accepted','declined','cancelled')),
 read_at timestamptz,
 created_at timestamptz not null default now(),
 unique(consultation_id,kind)
);
create index if not exists notifications_list_idx on public.notifications(recipient_id,created_at desc,id desc);
create index if not exists notifications_unread_idx on public.notifications(recipient_id) where read_at is null;

alter table public.notifications enable row level security;
revoke all on public.notifications from public,anon,authenticated;
grant select on public.notifications to authenticated;
grant update(read_at) on public.notifications to authenticated;
drop policy if exists notifications_read on public.notifications;
create policy notifications_read on public.notifications for select to authenticated using(recipient_id=(select auth.uid()));
drop policy if exists notifications_mark_read on public.notifications;
create policy notifications_mark_read on public.notifications for update to authenticated
 using(recipient_id=(select auth.uid())) with check(recipient_id=(select auth.uid()));

create or replace function public.notify_new_consultation()
returns trigger language plpgsql security definer set search_path='' as $$
begin
 insert into public.notifications(recipient_id,consultation_id,kind) values(new.coach_id,new.id,'new_consultation')
 on conflict(consultation_id,kind) do nothing;
 return new;
end;
$$;

create or replace function public.notify_consultation_status()
returns trigger language plpgsql security definer set search_path='' as $$
begin
 if new.status=old.status then return new; end if;
 if new.status in ('accepted','declined') then
  insert into public.notifications(recipient_id,consultation_id,kind) values(new.student_id,new.id,new.status)
  on conflict(consultation_id,kind) do nothing;
 elsif new.status='cancelled' then
  insert into public.notifications(recipient_id,consultation_id,kind) values(new.coach_id,new.id,'cancelled')
  on conflict(consultation_id,kind) do nothing;
 end if;
 return new;
end;
$$;

drop trigger if exists requests_notify_created on public.coaching_requests;
create trigger requests_notify_created after insert on public.coaching_requests for each row execute function public.notify_new_consultation();
drop trigger if exists requests_notify_status on public.coaching_requests;
create trigger requests_notify_status after update on public.coaching_requests for each row execute function public.notify_consultation_status();

revoke all on function public.notify_new_consultation(),public.notify_consultation_status() from public,anon,authenticated;

notify pgrst,'reload schema';
commit;
