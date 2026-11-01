-- Monthly rankings are computed from existing point_transactions; no dedicated aggregate table.
-- Apply to an isolated development DB, or during an explicitly approved release.
begin;

alter table public.point_accounts add column if not exists ranking_opt_in boolean not null default false;

-- プロフィール設定 FR-03: 本人だけが自分のランキング参加設定を変更できる。残高・履歴は変更しない。
create or replace function public.set_points_ranking_opt_in(p_opt_in boolean)
returns void language plpgsql security definer set search_path='' as $$
begin
 if auth.uid() is null then raise exception 'Authentication required' using errcode='42501'; end if;
 if p_opt_in is null then raise exception 'A ranking participation value is required' using errcode='23514'; end if;
 update public.point_accounts set ranking_opt_in=p_opt_in where user_id=auth.uid();
 if not found then raise exception 'Point account missing' using errcode='23503'; end if;
end;
$$;
revoke all on function public.set_points_ranking_opt_in(boolean) from public,anon,authenticated;
grant execute on function public.set_points_ranking_opt_in(boolean) to authenticated;

-- ポイントランキング FR-01・FR-02: 参加設定ONの会員だけを、日本時間の当月分のpoint_transactionsで都度集計する。
-- 上位20件は未ログインでも閲覧できる。本人の順位・当月獲得量は、参加設定ONの本人にだけ返す。
create or replace function public.get_points_ranking()
returns jsonb language sql stable security definer set search_path='' as $$
 with month_start as (
  select date_trunc('month', now() at time zone 'Asia/Tokyo') at time zone 'Asia/Tokyo' as value
 ),
 -- 登録特典・導入前残高は投稿活動ではないため対象外とする。当月の投稿・削除取り消しだけを集計する。
 monthly as (
  select t.user_id, sum(t.amount) as amount
  from public.point_transactions t, month_start m
  where t.occurred_at >= m.value and t.kind in ('post','post_reversal')
  group by t.user_id
 ),
 participants as (
  select a.user_id, coalesce(m.amount,0)::integer as amount
  from public.point_accounts a
  left join monthly m on m.user_id=a.user_id
  where a.ranking_opt_in
 ),
 ranked as (
  select p.user_id, p.amount, row_number() over(order by p.amount desc, p.user_id) as rank
  from participants p
 )
 select jsonb_build_object(
  'top', coalesce((
   select jsonb_agg(jsonb_build_object('display_name',pr.display_name,'handle',pr.handle,'amount',r.amount,'rank',r.rank) order by r.rank)
   from ranked r join public.profiles pr on pr.id=r.user_id
   where r.rank<=20
  ),'[]'::jsonb),
  'self', (
   select jsonb_build_object('amount',r.amount,'rank',r.rank)
   from ranked r where r.user_id=auth.uid()
  )
 )
$$;
revoke all on function public.get_points_ranking() from public,anon,authenticated;
grant execute on function public.get_points_ranking() to anon,authenticated;

notify pgrst,'reload schema';
commit;
