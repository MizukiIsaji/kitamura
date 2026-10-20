-- Read-only setup diagnostics. Safe to run more than once in SQL Editor.
-- Checks object presence/settings; does not replace integration or security tests.
with
required_tables(name) as (
  values ('profiles'),('posts'),('post_likes'),('bookmarks'),('follows'),
         ('comments'),('coach_profiles'),('coaching_plans'),('coaching_requests')
),
required_enums(name, labels) as (
  values ('fishing_category','sea,bass,trout,aji,eging'),
         ('coach_status','pending,approved,suspended'),
         ('consultation_status','requested,accepted,declined,cancelled')
),
required_functions(name) as (
  values ('handle_new_user'),('touch_updated_at'),('guard_post'),
         ('prepare_coaching_request'),('guard_request_transition')
),
required_triggers(relation_name,name) as (
  values ('public.profiles','profiles_touch'),('public.posts','posts_touch'),
         ('public.coach_profiles','coaches_touch'),('public.coaching_plans','plans_touch'),
         ('public.coaching_requests','requests_touch'),('auth.users','on_auth_user_created'),
         ('public.posts','posts_guard'),('public.coaching_requests','requests_prepare'),
         ('public.coaching_requests','requests_transition')
),
required_policies(schema_name,table_name,names) as (
  values ('public','profiles',array['profiles_read','profiles_edit']),
         ('public','posts',array['posts_read','posts_create','posts_edit','posts_delete']),
         ('public','post_likes',array['likes_read','likes_create','likes_delete']),
         ('public','bookmarks',array['bookmarks_read','bookmarks_create','bookmarks_delete']),
         ('public','follows',array['follows_read','follows_create','follows_delete']),
         ('public','comments',array['comments_read','comments_create','comments_delete']),
         ('public','coach_profiles',array['coaches_read','coaches_apply','coaches_edit']),
         ('public','coaching_plans',array['plans_read','plans_create','plans_edit']),
         ('public','coaching_requests',array['requests_read','requests_create','requests_edit']),
         ('storage','objects',array['catch_photos_read','catch_photos_insert','catch_photos_delete'])
),
checks(section,item,ok) as (
  select '1. データの種類',name,coalesce((
    select string_agg(e.enumlabel,',' order by e.enumsortorder)=r.labels
    from pg_enum e where e.enumtypid=to_regtype('public.'||r.name)
  ),false) from required_enums r
  union all
  select '2. テーブルとアクセス制限',name,exists(
    select 1 from pg_class c where c.oid=to_regclass('public.'||r.name)
    and c.relkind='r' and c.relrowsecurity
  ) from required_tables r
  union all
  select '3. 自動処理',name,to_regprocedure('public.'||name||'()') is not null
  from required_functions
  union all
  select '3. 自動処理',r.name,exists(
    select 1 from pg_trigger t where t.tgrelid=to_regclass(r.relation_name)
    and t.tgname=r.name and not t.tgisinternal and t.tgenabled in ('O','A')
  ) from required_triggers r
  union all
  select '4. アクセスルール',p.name,exists(
    select 1 from pg_policies existing where existing.schemaname=r.schema_name
    and existing.tablename=r.table_name and existing.policyname=p.name
  ) from required_policies r cross join lateral unnest(r.names) p(name)
  union all
  select '5. 釣果の集計','post_stats',exists(
    select 1 from pg_class c where c.oid=to_regclass('public.post_stats')
    and c.relkind='v' and 'security_invoker=true'=any(c.reloptions)
  )
  union all
  select '6. 写真の保存先','catch-photos',exists(
    select 1 from storage.buckets where id='catch-photos' and not public
    and file_size_limit=10485760 and allowed_mime_types=array['image/webp']::text[]
  )
)
select section as "項目",
       case when bool_and(ok) then 'OK' else '要確認' end as "結果",
       case when bool_and(ok) then count(*)::text||'件確認済み'
            else '未作成または設定が異なる項目: '||string_agg(item,', ' order by item) filter(where not ok)
       end as "詳細"
from checks
group by section
order by section;
