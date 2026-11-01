-- DB owner only. Review the connection target and both timestamps before running.
-- This is an operational example, NOT an automatically applied migration.
begin;
update app_private.point_reward_campaign
 set starts_at=null, -- NULL: no lower bound, so existing accounts remain eligible.
     ends_at='2027-03-31T00:00:00+09:00' -- Exclusive; includes all of March 30 in Japan.
 where id='signup';

-- Reconsider unawarded existing accounts using their trusted issuance timestamps.
-- Already awarded bonuses are retained even when the window becomes narrower.
do $$ declare member_id uuid; begin
 for member_id in select user_id from public.point_accounts order by user_id loop
  perform app_private.grant_registration_reward(member_id);
 end loop;
end; $$;
select public.registration_reward_campaign();
commit;
