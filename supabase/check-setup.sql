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
  union all
  select '7. 写真の複数保存','image_pathsと上限チェック',exists(
    select 1 from pg_attribute where attrelid=to_regclass('public.posts') and attname='image_paths' and not attisdropped and attnotnull
  ) and exists(
    select 1 from pg_trigger where tgrelid=to_regclass('public.posts') and tgname='posts_photos_guard' and not tgisinternal
  )
  union all
  select '8. 相談の追加項目',column_name,exists(
    select 1 from information_schema.columns where table_schema='public' and table_name='coaching_requests' and information_schema.columns.column_name=r.column_name and is_nullable='NO'
  ) and coalesce(has_column_privilege('authenticated',to_regclass('public.coaching_requests'),r.column_name,'INSERT'),false)
  from (values ('preferred_area'),('equipment_status')) r(column_name)
  union all
  select '9. 保有ポイント','残高と本人の閲覧制限',exists(
    select 1 from pg_class where oid=to_regclass('public.point_accounts') and relrowsecurity
  ) and exists(
    select 1 from pg_attribute where attrelid=to_regclass('public.point_accounts') and attname='balance' and attnotnull and not attisdropped
  ) and exists(
    select 1 from pg_policies where schemaname='public' and tablename='point_accounts' and policyname='point_accounts_read'
  ) and exists(
    select 1 from pg_trigger where tgrelid=to_regclass('public.profiles') and tgname='profiles_create_point_account' and not tgisinternal
  ) and coalesce(has_table_privilege('authenticated',to_regclass('public.point_accounts'),'SELECT'),false)
  and not coalesce(has_table_privilege('authenticated',to_regclass('public.point_accounts'),'INSERT,UPDATE,DELETE'),false)
  union all
  select '10. ポイント付与・履歴','本人の履歴と付与・取り消し',exists(
    select 1 from pg_class where oid=to_regclass('public.point_transactions') and relrowsecurity
  ) and exists(
    select 1 from pg_policies where schemaname='public' and tablename='point_transactions' and policyname='point_transactions_read'
  ) and to_regclass('app_private.point_reward_campaign') is not null
  and coalesce(has_table_privilege('authenticated',to_regclass('public.point_transactions'),'SELECT'),false)
  and not coalesce(has_table_privilege('authenticated',to_regclass('public.point_transactions'),'INSERT,UPDATE,DELETE'),false)
  and coalesce(has_function_privilege('authenticated',to_regprocedure('public.finalize_post_points(uuid)'),'EXECUTE'),false)
  and not coalesce(has_function_privilege('anon',to_regprocedure('public.finalize_post_points(uuid)'),'EXECUTE'),false)
  and exists(select 1 from pg_trigger where tgrelid=to_regclass('public.posts') and tgname='posts_reverse_points' and not tgisinternal)
  and exists(select 1 from pg_trigger where tgrelid=to_regclass('public.point_transactions') and tgname='point_transactions_apply' and not tgisinternal)
  union all
  select '11. コーチランク','完了確認・自動判定・料金と取り分',exists(
    select 1 from pg_class where oid=to_regclass('public.coaching_completions') and relrowsecurity
  ) and exists(
    select 1 from pg_class where oid=to_regclass('public.coaching_request_compensation') and relrowsecurity
  ) and coalesce(has_function_privilege('anon',to_regprocedure('public.get_coach_rankings(uuid[])'),'EXECUTE'),false)
  and coalesce(has_function_privilege('authenticated',to_regprocedure('public.confirm_coaching_completion(uuid)'),'EXECUTE'),false)
  and not coalesce(has_function_privilege('anon',to_regprocedure('public.confirm_coaching_completion(uuid)'),'EXECUTE'),false)
  and not coalesce(has_table_privilege('authenticated',to_regclass('public.coaching_completions'),'INSERT,UPDATE,DELETE'),false)
  and not coalesce(has_table_privilege('authenticated',to_regclass('public.coaching_request_compensation'),'INSERT,UPDATE,DELETE'),false)
  and exists(select 1 from pg_trigger where tgrelid=to_regclass('public.coaching_completions') and tgname='completions_refresh_prices' and not tgisinternal)
  and exists(select 1 from pg_trigger where tgrelid=to_regclass('public.coaching_requests') and tgname='requests_compensation_snapshot' and not tgisinternal)
)
select section as "項目",
       case when bool_and(ok) then 'OK' else '要確認' end as "結果",
       case when bool_and(ok) then count(*)::text||'件確認済み'
            else '未作成または設定が異なる項目: '||string_agg(item,', ' order by item) filter(where not ok)
       end as "詳細"
from checks
group by section
order by section;
