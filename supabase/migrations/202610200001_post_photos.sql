-- Add up to five private photos while retaining the original cover-photo column.
begin;
alter table public.posts add column if not exists image_paths text[] not null default '{}';
update public.posts set image_paths=array[image_path] where image_path is not null and cardinality(image_paths)=0;

create or replace function public.guard_post_photos() returns trigger language plpgsql set search_path='' as $$
declare photo text; prefix text; filename text;
begin
  -- Older clients update only the original cover column.
  if tg_op='UPDATE' then
    if new.image_paths is not distinct from old.image_paths and new.image_path is distinct from old.image_path then
      new.image_paths=case when new.image_path is null then '{}'::text[] else array[new.image_path] end;
    end if;
  elsif cardinality(new.image_paths)=0 and new.image_path is not null then
    new.image_paths=array[new.image_path];
  end if;
  if new.image_paths is null or cardinality(new.image_paths)>5 or coalesce(array_ndims(new.image_paths),1)<>1 or coalesce(array_lower(new.image_paths,1),1)<>1 then
    raise exception 'A post accepts up to five photos' using errcode='23514';
  end if;
  if (select count(distinct path) from unnest(new.image_paths) as path)<>cardinality(new.image_paths) then
    raise exception 'Photo paths must be unique and non-null' using errcode='23514';
  end if;
  prefix=new.user_id::text||'/'||new.id::text||'/';
  foreach photo in array new.image_paths loop
    filename=substring(photo from char_length(prefix)+1);
    if photo is null or left(photo,char_length(prefix))<>prefix or char_length(filename)<=5 or right(filename,5)<>'.webp'
       or position('/' in filename)>0 or position(chr(92) in filename)>0 or position('..' in filename)>0 then
      raise exception 'Invalid post photo path' using errcode='23514';
    end if;
  end loop;
  new.image_path=new.image_paths[1];
  return new;
end; $$;
drop trigger if exists posts_photos_guard on public.posts;
create trigger posts_photos_guard before insert or update on public.posts for each row execute function public.guard_post_photos();
revoke all on function public.guard_post_photos() from public,anon,authenticated;
grant update(image_paths) on public.posts to authenticated;

drop policy if exists catch_photos_read on storage.objects;
create policy catch_photos_read on storage.objects for select to anon,authenticated using(
  bucket_id='catch-photos' and exists(select 1 from public.posts p where p.image_path=name or name=any(p.image_paths)
    or (p.user_id=(select auth.uid()) and p.id::text=(storage.foldername(name))[2] and p.user_id::text=(storage.foldername(name))[1]))
);
notify pgrst,'reload schema';
commit;
