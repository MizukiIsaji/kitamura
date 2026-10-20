import {test} from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';import {PGlite} from '@electric-sql/pglite';
test('相談 FR-01・FR-02: 新項目を当事者だけが読め、過去の相談と返信権限を保持する',async()=>{
 const db=new PGlite();const A='11111111-1111-4111-8111-111111111111',B='22222222-2222-4222-8222-222222222222',C='33333333-3333-4333-8333-333333333333';
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
  await db.exec(`insert into auth.users(id) values('${A}'),('${B}'),('${C}');insert into public.coach_profiles(user_id,status,introduction,category,area,years_experience) values('${B}','approved','安全確認から始める初心者向けの釣りの指導を行います。','sea','岐阜県',10);`);
  const plan=(await db.query<{id:string}>(`insert into public.coaching_plans(coach_id,title,description,duration_minutes,price_yen) values('${B}','釣り入門','安全確認から始める初心者向けの釣りの指導を行います。',120,5000) returning id`)).rows[0].id;
  const date=(await db.query<{date:string}>(`select ((now() at time zone 'Asia/Tokyo')::date)::text as date`)).rows[0].date;
  const legacy=(await db.query<{id:string}>(`insert into public.coaching_requests(client_token,student_id,plan_id,preferred_date,preferred_time,experience,goal,message) values('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','${A}','${plan}','${date}','morning','first','基本を学ぶ','過去の相談内容') returning id`)).rows[0].id;
  const migration=readFileSync('supabase/migrations/202610200002_consultation_details.sql','utf8');
  await db.exec(migration);await db.exec(migration);
  const columns=await db.query(`select column_name from information_schema.columns where table_schema='public' and table_name='coaching_requests' and column_name in ('preferred_area','equipment_status')`);
  assert.equal(columns.rows.length,2,'希望エリアと道具の保存欄が存在する');
  assert.deepEqual((await db.query(`select preferred_area,equipment_status,message from public.coaching_requests where id='${legacy}'`)).rows,[{preferred_area:'',equipment_status:'',message:'過去の相談内容'}]);
  const asUser=async(id:string|null)=>db.exec(`reset role;set role ${id?'authenticated':'anon'};select set_config('request.jwt.claim.sub','${id||''}',false);`);
  await asUser(A);
  const insert=`insert into public.coaching_requests(client_token,student_id,plan_id,preferred_date,preferred_time,experience,goal,message,preferred_area,equipment_status) values(gen_random_uuid(),'${A}','${plan}','${date}','afternoon','first','基本を学ぶ','郡上市の長良川周辺',$1,$2) returning id`;
  for(const [area,gear] of [['海外','owned'],['岐阜県','yes']])await assert.rejects(()=>db.query(insert,[area,gear]));
  const created=(await db.query<{id:string}>(insert,['岐阜県','partial'])).rows[0].id;
  assert.deepEqual((await db.query(`select preferred_area,equipment_status from public.coaching_requests where id='${created}'`)).rows,[{preferred_area:'岐阜県',equipment_status:'partial'}]);
  await assert.rejects(()=>db.exec(`update public.coaching_requests set preferred_area='東京都',status='cancelled' where id='${created}'`));
  await asUser(C);assert.equal((await db.query('select * from public.coaching_requests')).rows.length,0);
  await asUser(null);await assert.rejects(()=>db.query('select * from public.coaching_requests'));
  await asUser(B);assert.equal((await db.query(`select preferred_area,equipment_status from public.coaching_requests where id='${created}'`)).rows.length,1);
  await assert.rejects(()=>db.exec(`update public.coaching_requests set equipment_status='owned',status='accepted' where id='${created}'`));
  await db.exec(`update public.coaching_requests set status='accepted',coach_note='道具の貸し出しを相談しましょう' where id='${created}'`);
  await asUser(A);await db.exec(`update public.coaching_requests set status='cancelled' where id='${created}'`);
  await asUser(B);await db.exec(`update public.coaching_requests set status='declined',coach_note='別の日程をご相談ください' where id='${legacy}'`);
 }finally{await db.close();}
});
