import {fixtureId,sqlText} from './development-setup';
import {coachRankForLessons,coachRankRates} from '../../src/lib/coach-ranks';

export type CoachRankFixture={id:string;displayName:string;handle:string;completedLessons:number};
const uuid=/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i;

// Generates a single transaction. Only pinned test identities and deterministic fixture IDs are writable.
export function buildCoachRankFixtures(migration:string,scope:string,targets:CoachRankFixture[],student:CoachRankFixture):string{
 if(!/^[a-f0-9]{8}$/.test(scope)||!targets.length||new Set(targets.map(row=>row.id)).size!==targets.length)throw Error('INVALID_FIXTURE_SCOPE');
 for(const row of [...targets,student]){
  if(!uuid.test(row.id)||!row.displayName.includes('テスト')||!row.handle||!Number.isSafeInteger(row.completedLessons)||row.completedLessons<0||row.completedLessons>100)throw Error('INVALID_TEST_IDENTITY');
 }
 if(targets.some(row=>row.id===student.id))throw Error('STUDENT_MUST_DIFFER_FROM_COACH');
 const identities=[...targets,student].map(row=>`(${sqlText(row.id)}::uuid,${sqlText(row.displayName)},${sqlText(row.handle)})`).join(',\n');
 const values=targets.map(row=>{
  const planId=fixtureId(scope,'rank-plan-'+row.id),label=coachRankRates[coachRankForLessons(row.completedLessons)].label;
  const ids=Array.from({length:row.completedLessons},(_,index)=>sqlText(fixtureId(scope,'rank-request-'+row.id+'-'+index))).join(',');
  return `(${sqlText(row.id)}::uuid,${row.completedLessons},${sqlText(planId)}::uuid,${sqlText('[テスト] '+label+'の2時間レッスン')},array[${ids}]::uuid[])`;
 }).join(',\n');
 // Avoid repricing unrelated existing plans when setting up test data on the shared project.
 const setup=migration.replace(/^begin;\r?\n/m,'').replace(/^commit;\s*$/m,'')
  .replace('update public.coaching_plans set price_yen=price_yen where duration_minutes=120;','-- Existing unrelated plans are not backfilled by this fixture setup.');
 return `-- Development fixtures only. No passwords, privileges, or real lesson histories are changed.
begin;
select pg_advisory_xact_lock(hashtextextended(${sqlText('coach-rank-fixtures:'+scope)},29));
do $check$ declare expected record;begin
 for expected in select * from (values ${identities}) as x(id,display_name,handle) loop
  if not exists(select 1 from public.profiles p where p.id=expected.id and p.display_name=expected.display_name and p.handle=expected.handle) then
   raise exception 'Test identity mismatch. Nothing applied.' using errcode='22023';
  end if;
 end loop;
end;$check$;
${setup}
do $seed$ declare target record; seeded_request_id uuid; completed bigint; today date=(now() at time zone 'Asia/Tokyo')::date;begin
 for target in select * from (values ${values}) as x(coach_id,total,plan_id,title,request_ids) loop
  insert into public.coach_profiles(user_id,status,introduction,category,area,years_experience)
  values(target.coach_id,'approved','[コーチランク確認用] 架空のテストコーチです。安全確認と釣りの基本を練習するための確認用データです。','sea','東京都・架空のテストエリア',5)
  on conflict(user_id) do nothing;
  if not exists(select 1 from public.coach_profiles where user_id=target.coach_id and status='approved') then raise exception 'Test coach is not approved';end if;
  if exists(select 1 from public.coaching_plans where id=target.plan_id and (coach_id<>target.coach_id or title not like '[テスト] %' or duration_minutes<>120 or not is_active)) then raise exception 'Test plan ID collision';end if;
  insert into public.coaching_plans(id,coach_id,title,description,duration_minutes,price_yen,is_active)
  values(target.plan_id,target.coach_id,target.title,'[コーチランク確認用] 架空の2時間プランです。持ち物と安全確認から釣りの基本を一緒に練習します。',120,3000,true)
  on conflict(id) do nothing;
  select count(*) into completed from public.coaching_completions where coach_id=target.coach_id;
  if completed>target.total then raise exception 'Test coach has more completions than requested; existing history preserved';end if;
  foreach seeded_request_id in array target.request_ids loop
   exit when completed>=target.total;
   if exists(select 1 from public.coaching_completions where request_id=seeded_request_id) then continue;end if;
   if exists(select 1 from public.coaching_requests where id=seeded_request_id and (coach_id<>target.coach_id or student_id<>${sqlText(student.id)}::uuid or plan_id<>target.plan_id or message not like '[コーチランク確認用]%')) then raise exception 'Test request ID collision';end if;
   insert into public.coaching_requests(id,client_token,student_id,plan_id,preferred_date,preferred_time,experience,preferred_area,equipment_status,goal,message,created_at)
   values(seeded_request_id,seeded_request_id,${sqlText(student.id)}::uuid,target.plan_id,today,'morning','first','東京都','none','[テスト] ランク表示の確認','[コーチランク確認用] 架空の指導完了データです。実際の受講実績ではありません。',now()-interval '30 days')
   on conflict(id) do nothing;
   perform set_config('request.jwt.claim.sub',target.coach_id::text,true);
   update public.coaching_requests set status='accepted' where id=seeded_request_id and status='requested';
   perform set_config('request.jwt.claim.sub',${sqlText(student.id)},true);
   perform public.confirm_coaching_completion(seeded_request_id);
   completed=completed+1;
  end loop;
 end loop;
 perform set_config('request.jwt.claim.sub','',true);
end;$seed$;
commit;
select p.display_name,r.rank,r.completed_lessons from public.get_coach_rankings(array[${targets.map(row=>sqlText(row.id)).join(',')}]::uuid[]) r join public.profiles p on p.id=r.coach_id;
`;
}
