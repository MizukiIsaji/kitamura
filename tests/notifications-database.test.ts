import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {PGlite} from '@electric-sql/pglite';

test('通知 FR-01・NFR-01: 状態変化ごとに相手へ通知を作成し、本人以外には見せない',async()=>{
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
  const sql=readFileSync('supabase/migrations/202610300001_notifications.sql','utf8');
  await db.exec(sql);await db.exec(sql);
  assert.equal((await db.query<{name:string|null}>("select to_regclass('public.notifications')::text as name")).rows[0].name,'notifications');

  await db.exec(`insert into auth.users(id) values('${A}'),('${B}'),('${C}');
   insert into public.coach_profiles(user_id,status,introduction,category,area,years_experience) values('${B}','approved','安全確認から始める初心者向けの釣りの指導を行います。','sea','神奈川県',10);`);
  const user=async(id:string|null)=>db.exec(`reset role;set role ${id?'authenticated':'anon'};select set_config('request.jwt.claim.sub','${id||''}',false);`);
  await user(B);
  const plan=(await db.query<{id:string}>(`insert into public.coaching_plans(coach_id,title,description,duration_minutes,price_yen) values('${B}','通知テスト','安全確認から始める初心者向けの釣りの指導を行います。',120,6000) returning id`)).rows[0];

  // 新規相談 → コーチへ通知
  await user(A);
  const request=(await db.query<{id:string}>(`insert into public.coaching_requests(client_token,student_id,plan_id,preferred_date,preferred_time,experience,goal,message) values(gen_random_uuid(),'${A}','${plan.id}',(now() at time zone 'Asia/Tokyo')::date,'morning','first','基本を学ぶ','藤沢市で希望します') returning id`)).rows[0];
  await user(B);
  assert.deepEqual((await db.query<{kind:string;consultation_id:string}>('select kind,consultation_id from public.notifications')).rows,[{kind:'new_consultation',consultation_id:request.id}]);
  await user(C);
  assert.equal((await db.query('select * from public.notifications')).rows.length,0,'本人以外には通知が見えない');

  // 列に相談の本文・金額を複製していないことを確認する
  const columns=(await db.query<{column_name:string}>("select column_name from information_schema.columns where table_schema='public' and table_name='notifications'")).rows.map(r=>r.column_name);
  for(const forbidden of ['message','goal','price_yen','coach_note'])assert.ok(!columns.includes(forbidden),`notificationsに${forbidden}列を持たない`);

  // 承認 → 相談者へ通知
  await user(B);await db.exec(`update public.coaching_requests set status='accepted' where id='${request.id}'`);
  await user(A);
  assert.deepEqual((await db.query<{kind:string}>('select kind from public.notifications order by created_at')).rows,[{kind:'accepted'}]);

  // 取り下げ → コーチへ通知
  await user(A);await db.exec(`update public.coaching_requests set status='cancelled' where id='${request.id}'`);
  await user(B);
  assert.deepEqual((await db.query<{kind:string}>('select kind from public.notifications order by created_at')).rows,[{kind:'new_consultation'},{kind:'cancelled'}]);

  // 既読化：本人は自分の通知だけread_atを更新できる（coachNotification = Bの"new_consultation"通知）
  const coachNotification=(await db.query<{id:string}>("select id from public.notifications where kind='new_consultation'")).rows[0].id;
  const ownUpdate=await db.query(`update public.notifications set read_at=now() where id='${coachNotification}' returning id`);
  assert.equal(ownUpdate.rows.length,1,'本人の通知は既読にできる');
  assert.ok((await db.query<{read_at:string|null}>(`select read_at from public.notifications where id='${coachNotification}'`)).rows[0].read_at);

  // 本人以外は他人の通知を更新できない（AはBの通知を更新できない）
  await user(A);
  const blocked=await db.query(`update public.notifications set read_at=now() where id='${coachNotification}' returning id`);
  assert.equal(blocked.rows.length,0,'本人以外は他人の通知を更新できない');

  // 重複作成を防ぐ一意制約
  await db.exec('reset role');
  await assert.rejects(()=>db.exec(`insert into public.notifications(recipient_id,consultation_id,kind) values('${B}','${request.id}','new_consultation')`));

  // 一般会員はnotificationsへ直接挿入できない
  await user(A);
  await assert.rejects(()=>db.query(`insert into public.notifications(recipient_id,consultation_id,kind) values('${A}','${request.id}','accepted') returning id`));
 }finally{await db.close();}
});
