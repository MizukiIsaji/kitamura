import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import {PGlite} from '@electric-sql/pglite';

test('コーチランク FR-02・相談 FR-03: 本人の完了確認を一度だけ集計し、料金と取り分のスナップショットを保護する',async()=>{
 const db=new PGlite(),A='11111111-1111-4111-8111-111111111111',B='22222222-2222-4222-8222-222222222222',C='33333333-3333-4333-8333-333333333333';
 try{
  await db.exec(`create role anon;create role authenticated;create role service_role bypassrls;create schema auth;create schema storage;
   create table auth.users(id uuid primary key,raw_user_meta_data jsonb default '{}');
   create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
   grant usage on schema auth to anon,authenticated;grant execute on function auth.uid() to anon,authenticated;
   create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);
   create table storage.objects(id uuid default gen_random_uuid(),bucket_id text references storage.buckets(id),name text);
   create function storage.foldername(text) returns text[] language sql immutable as $$select string_to_array(regexp_replace($1,'/[^/]+$',''),'/')$$;
   alter table storage.objects enable row level security;grant usage on schema storage to anon,authenticated;grant select,insert,delete on storage.objects to anon,authenticated;`);
  await db.exec(readFileSync('supabase/migrations/202610170001_initial.sql','utf8'));
  const migrationPath='supabase/migrations/202610280001_coach_ranks.sql';
  if(existsSync(migrationPath)){const sql=readFileSync(migrationPath,'utf8');await db.exec(sql);await db.exec(sql);}
  assert.equal((await db.query<{name:string|null}>("select to_regclass('public.coaching_completions')::text as name")).rows[0].name,'coaching_completions');
  await db.exec(`insert into auth.users(id) values('${A}'),('${B}'),('${C}');
   insert into public.coach_profiles(user_id,status,introduction,category,area,years_experience) values('${B}','approved','安全確認から始める初心者向けの釣りの指導を行います。','sea','神奈川県',10),('${C}','pending','安全確認から始める初心者向けの釣りの指導を行います。','sea','東京都',5);`);
  const today=(await db.query<{date:string}>("select (now() at time zone 'Asia/Tokyo')::date::text as date")).rows[0].date;
  const user=async(id:string|null)=>db.exec(`reset role;set role ${id?'authenticated':'anon'};select set_config('request.jwt.claim.sub','${id||''}',false);`);
  await user(B);
  const plan=(await db.query<{id:string;price_yen:number}>(`insert into public.coaching_plans(coach_id,title,description,duration_minutes,price_yen) values('${B}','ランク料金テスト','安全確認から始める初心者向けの釣りの指導を行います。',120,9999) returning id,price_yen`)).rows[0];
  assert.equal(plan.price_yen,3000);
  await user(A);
  const request=(await db.query<{id:string;price_yen:number}>(`insert into public.coaching_requests(client_token,student_id,plan_id,preferred_date,preferred_time,experience,goal,message) values(gen_random_uuid(),'${A}','${plan.id}','${today}','morning','first','基本を学ぶ','藤沢市で希望します') returning id,price_yen`)).rows[0];
  assert.equal(request.price_yen,3000);
  await assert.rejects(()=>db.query('select public.confirm_coaching_completion($1)',[request.id]));
  await assert.rejects(()=>db.exec(`insert into public.coaching_completions(request_id,coach_id,student_id) values('${request.id}','${B}','${A}')`));
  assert.equal((await db.query('select * from public.coaching_request_compensation')).rows.length,0,'受講者にはコーチ取り分を公開しない');
  await user(B);await db.exec(`update public.coaching_requests set status='accepted' where id='${request.id}'`);
  await assert.rejects(()=>db.query('select public.confirm_coaching_completion($1)',[request.id]));
  assert.deepEqual((await db.query('select rank,coach_payout_yen from public.coaching_request_compensation')).rows,[{rank:'bronze',coach_payout_yen:2000}]);
  await user(C);await assert.rejects(()=>db.query('select public.confirm_coaching_completion($1)',[request.id]));
  assert.equal((await db.query('select * from public.coaching_completions')).rows.length,0);
  await user(A);await db.query('select public.confirm_coaching_completion($1)',[request.id]);await db.query('select public.confirm_coaching_completion($1)',[request.id]);
  assert.equal((await db.query('select * from public.coaching_completions')).rows.length,1);
  await assert.rejects(()=>db.exec(`update public.coaching_requests set status='cancelled' where id='${request.id}'`));
  await user(null);
  const ranks=await db.query(`select rank,completed_lessons::integer from public.get_coach_rankings(array['${B}'::uuid,'${C}'::uuid])`);
  assert.deepEqual(ranks.rows,[{rank:'bronze',completed_lessons:1}]);
  await assert.rejects(()=>db.query('select * from public.coaching_completions'));
  await assert.rejects(()=>db.query('select * from public.coaching_request_compensation'));
  await assert.rejects(()=>db.query('select public.confirm_coaching_completion($1)',[request.id]));
  await db.exec('reset role');
  for(const [count,rank,price,payout] of [[9,'bronze',3000,2000],[10,'silver',4000,3000],[29,'silver',4000,3000],[30,'gold',5000,4000],[99,'gold',5000,4000],[100,'platinum',7000,5000]] as const){
   assert.deepEqual((await db.query('select * from public.coach_rank_rate($1)',[count])).rows,[{rank,price_yen:price,coach_payout_yen:payout}]);
  }
  // Seed history through the normal state transition and student-confirmation operation.
  await db.exec(`do $$declare r uuid;begin for n in 2..10 loop
   insert into public.coaching_requests(client_token,student_id,plan_id,preferred_date,preferred_time,experience,goal,message,created_at) values(gen_random_uuid(),'${A}','${plan.id}','${today}','morning','first','基本を学ぶ','藤沢市で希望します',now()-interval '1 day') returning id into r;
   perform set_config('request.jwt.claim.sub','${B}',true);update public.coaching_requests set status='accepted' where id=r;
   perform set_config('request.jwt.claim.sub','${A}',true);perform public.confirm_coaching_completion(r);
  end loop;end$$;`);
  assert.deepEqual((await db.query(`select rank,completed_lessons::integer from public.get_coach_rankings(array['${B}'::uuid])`)).rows,[{rank:'silver',completed_lessons:10}]);
  assert.equal((await db.query<{price_yen:number}>(`select price_yen from public.coaching_plans where id='${plan.id}'`)).rows[0].price_yen,4000,'昇格を公開プラン料金に反映する');
  await user(A);
  const upgraded=(await db.query<{id:string;price_yen:number}>(`insert into public.coaching_requests(client_token,student_id,plan_id,preferred_date,preferred_time,experience,goal,message) values(gen_random_uuid(),'${A}','${plan.id}','${today}','afternoon','first','基本を学ぶ','藤沢市で希望します') returning id,price_yen`)).rows[0];
  assert.equal(upgraded.price_yen,4000,'昇格後の新しい相談だけに現在料金を使用する');
  assert.equal((await db.query<{price_yen:number}>(`select price_yen from public.coaching_requests where id='${request.id}'`)).rows[0].price_yen,3000);
  await user(B);
  assert.equal((await db.query<{coach_payout_yen:number}>(`select coach_payout_yen from public.coaching_request_compensation where request_id='${request.id}'`)).rows[0].coach_payout_yen,2000);
  await assert.rejects(()=>db.exec(`update public.coaching_request_compensation set coach_payout_yen=99999`));
  await user(A);await assert.rejects(()=>db.query('select public.confirm_coaching_completion($1)',[upgraded.id]));
  await user(B);await db.exec(`update public.coaching_requests set status='accepted' where id='${upgraded.id}'`);
  await db.exec('reset role');
  const future=(await db.query<{id:string}>(`insert into public.coaching_requests(client_token,student_id,plan_id,preferred_date,preferred_time,experience,goal,message,created_at) values(gen_random_uuid(),'${A}','${plan.id}',(now() at time zone 'Asia/Tokyo')::date+1,'morning','first','基本を学ぶ','藤沢市で希望します',now()-interval '1 day') returning id`)).rows[0].id;
  await user(B);await db.exec(`update public.coaching_requests set status='accepted' where id='${future}'`);
  await user(A);await assert.rejects(()=>db.query('select public.confirm_coaching_completion($1)',[future]));
 }finally{await db.close();}
});
