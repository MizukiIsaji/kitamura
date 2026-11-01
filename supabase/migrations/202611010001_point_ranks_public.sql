-- ADR-012: ポイントランクの階級・Lvだけを公開情報にする。残高そのものは返さない。
-- Apply to an isolated development DB, or during an explicitly approved release.
begin;

-- 階級・Lvの境界はsrc/lib/points.tsのpointRankFromBalanceと一致させる（1000ptごとに1レベル、各階級5レベル）。
create or replace function public.get_point_ranks(p_user_ids uuid[])
returns table(user_id uuid,tier text,level int)
language sql stable security definer set search_path='' as $$
 select a.user_id,
  case when a.balance>=20000 then 'sapphire'
       when a.balance>=15000 then 'platinum'
       when a.balance>=10000 then 'gold'
       when a.balance>=5000 then 'silver'
       else 'bronze' end,
  case when a.balance>=20000 then null
       else ((a.balance%5000)/1000)+1 end
 from public.point_accounts a
 where a.user_id=any(p_user_ids[1:200])
$$;
revoke all on function public.get_point_ranks(uuid[]) from public,anon,authenticated;
grant execute on function public.get_point_ranks(uuid[]) to anon,authenticated;

notify pgrst,'reload schema';
commit;
