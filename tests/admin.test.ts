import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {PGlite} from '@electric-sql/pglite';

const A='11111111-1111-4111-8111-111111111111',B='22222222-2222-4222-8222-222222222222',C='33333333-3333-4333-8333-333333333333';

test('administrator membership cannot be forged; moderation is authorized and audited in the database',async()=>{
 const db=new PGlite();
 try{
  await db.exec(`create role anon; create role authenticated; create role service_role bypassrls;
   create schema auth; create schema storage;
   create table auth.users(id uuid primary key,raw_user_meta_data jsonb default '{}');
   create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
   grant usage on schema auth to anon,authenticated; grant execute on function auth.uid() to anon,authenticated;
   create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);
   create table storage.objects(id uuid default gen_random_uuid(),bucket_id text references storage.buckets(id),name text);
   create function storage.foldername(text) returns text[] language sql immutable as $$select string_to_array(regexp_replace($1,'/[^/]+$',''),'/')$$;
   alter table storage.objects enable row level security;
   grant usage on schema storage to anon,authenticated;
   grant select,insert,delete on storage.objects to anon,authenticated;`);
  await db.exec(readFileSync('supabase/migrations/202610170001_initial.sql','utf8'));
  const migration=readFileSync('supabase/migrations/202610170002_admin.sql','utf8');
  await db.exec(migration);
  await db.exec(`insert into auth.users(id,raw_user_meta_data) values('${A}','{"display_name":"運営者","role":"admin"}'),('${B}','{"display_name":"コーチ"}'),('${C}','{}');`);
  const user=async(id:string|null)=>{await db.exec(`reset role; set role ${id?'authenticated':'anon'}; select set_config('request.jwt.claim.sub','${id||''}',false);`);};
  const owner=async()=>{await db.exec(`reset role; select set_config('request.jwt.claim.sub','',false);`);};
  const rejects=async(sql:string)=>{await assert.rejects(()=>db.query(sql));};
  const isAdmin=async()=>(await db.query<{allowed:boolean}>('select public.is_app_admin() as allowed')).rows[0].allowed;

  await user(null);await rejects('select public.admin_dashboard()');await rejects('select public.is_app_admin()');
  await user(A);assert.equal(await isAdmin(),false,'user metadata cannot grant administrator access');
  await rejects(`insert into app_private.admin_members(user_id) values('${A}')`);
  await rejects('select * from app_private.admin_members');
  await rejects('select public.admin_dashboard()');
  await rejects(`select public.admin_set_coach_status('${B}','approved')`);
  await user(B);
  await db.exec(`insert into public.coach_profiles(user_id,introduction,category,area,years_experience) values('${B}','安全確認から始める初心者向けの釣りの指導を行います。','sea','神奈川県',8);`);
  await rejects(`update public.coach_profiles set status='approved' where user_id='${B}'`);
  const date=(await db.query<{today:string}>(`select ((now() at time zone 'Asia/Tokyo')::date)::text as today`)).rows[0].today;
  await db.query(`insert into public.posts(user_id,title,category,fished_on,area,memo,is_public) values($1,'公開記録','sea',$2,'海','公開メモ',true),($1,'非公開記録','sea',$2,'海','非公開メモ',false)`,[B,date]);

  await owner();await db.exec(`insert into app_private.admin_members(user_id) values('${A}');`);
  await user(A);assert.equal(await isAdmin(),true);
  const dashboard=(await db.query<{data:{memberCount:number;publicPostCount:number;pendingCoachCount:number;coaches:{user_id:string}[]}}>('select public.admin_dashboard() as data')).rows[0].data;
  assert.equal(dashboard.memberCount,3);assert.equal(dashboard.publicPostCount,1);assert.equal(dashboard.pendingCoachCount,1);assert.equal(dashboard.coaches[0].user_id,B);
  assert.equal((await db.query('select * from public.posts')).rows.length,1,'admin status does not expose other users private posts');
  await rejects('select * from app_private.coach_review_log');
  await db.query(`select public.admin_set_coach_status($1,'approved')`,[B]);
  await db.query(`select public.admin_set_coach_status($1,'approved')`,[B]);
  await rejects(`select public.admin_set_coach_status('${B}',null)`);
  await rejects(`select public.admin_set_coach_status('${C}','approved')`);
  await user(B);assert.equal(await isAdmin(),false);await rejects(`select public.admin_set_coach_status('${B}','approved')`);
  await rejects(`delete from app_private.admin_members where user_id='${A}'`);
  await owner();
  const audit=await db.query<{actor_id:string;previous_status:string;next_status:string}>('select actor_id,previous_status,next_status from app_private.coach_review_log');
  assert.equal(audit.rows.length,1);assert.deepEqual(audit.rows[0],{actor_id:A,previous_status:'pending',next_status:'approved'});
  await db.exec(migration);
  assert.equal((await db.query('select * from app_private.admin_members')).rows.length,1,'reapplying migration preserves membership');
  assert.equal((await db.query('select * from app_private.coach_review_log')).rows.length,1,'reapplying migration preserves history');
  await user(A);await db.query(`select public.admin_set_coach_status($1,'suspended')`,[B]);
  await owner();await db.exec(`delete from app_private.admin_members where user_id='${A}';`);
  await user(A);assert.equal(await isAdmin(),false);await rejects('select public.admin_dashboard()');await rejects(`select public.admin_set_coach_status('${B}','approved')`);
 }finally{await db.close();}
});

test('facilities: only administrators can write; everyone can read only published rows',async()=>{
 const db=new PGlite();
 try{
  await db.exec(`create role anon; create role authenticated; create role service_role bypassrls;
   create schema auth; create schema storage;
   create table auth.users(id uuid primary key,raw_user_meta_data jsonb default '{}');
   create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
   grant usage on schema auth to anon,authenticated; grant execute on function auth.uid() to anon,authenticated;
   create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);
   create table storage.objects(id uuid default gen_random_uuid(),bucket_id text references storage.buckets(id),name text);
   create function storage.foldername(text) returns text[] language sql immutable as $$select string_to_array(regexp_replace($1,'/[^/]+$',''),'/')$$;
   alter table storage.objects enable row level security;
   grant usage on schema storage to anon,authenticated;
   grant select,insert,delete on storage.objects to anon,authenticated;`);
  await db.exec(readFileSync('supabase/migrations/202610170001_initial.sql','utf8'));
  await db.exec(readFileSync('supabase/migrations/202610170002_admin.sql','utf8'));
  await db.exec(readFileSync('supabase/migrations/202610190001_facility_listing.sql','utf8'));
  await db.exec(`insert into auth.users(id,raw_user_meta_data) values('${A}','{}'),('${B}','{}');`);
  const user=async(id:string|null)=>{await db.exec(`reset role; set role ${id?'authenticated':'anon'}; select set_config('request.jwt.claim.sub','${id||''}',false);`);};
  const owner=async()=>{await db.exec(`reset role; select set_config('request.jwt.claim.sub','',false);`);};
  const rejects=async(sql:string)=>{await assert.rejects(()=>db.query(sql));};

  await user(B);
  await rejects(`insert into public.facilities(kind,name,description,prefecture) values('shop','無断登録の釣具店','管理者でない会員からの登録です。','岐阜県')`);

  await owner();await db.exec(`insert into app_private.admin_members(user_id) values('${A}');`);
  await user(A);
  const published=(await db.query<{id:string}>(`insert into public.facilities(kind,name,description,prefecture,municipality) values('shop','多治見つり具店','ルアー・エサを扱う釣具店です。','岐阜県','多治見市') returning id`)).rows[0].id;
  const draft=(await db.query<{id:string}>(`insert into public.facilities(kind,name,description,prefecture,is_published) values('pond','準備中の釣り堀','開業準備中です。','岐阜県',false) returning id`)).rows[0].id;
  assert.equal((await db.query('select id from public.facilities')).rows.length,2,'admin reads both published and unpublished rows');

  await user(B);
  const visible=await db.query<{id:string}>('select id from public.facilities');
  assert.equal(visible.rows.length,1);assert.equal(visible.rows[0].id,published);
  assert.equal((await db.query(`update public.facilities set is_published=false where id='${published}' returning id`)).rows.length,0,'a non-admin update matches no visible rows, it is not silently allowed');
  assert.equal((await db.query(`delete from public.facilities where id='${draft}' returning id`)).rows.length,0,'a non-admin cannot even see the unpublished row to delete it');

  await user(null);
  assert.equal((await db.query('select id from public.facilities')).rows.length,1,'anonymous visitors see only published facilities');

  await user(A);await db.query(`update public.facilities set is_published=false where id='${published}'`);
  await user(null);assert.equal((await db.query('select id from public.facilities')).rows.length,0,'unpublishing removes it from public view');
 }finally{await db.close();}
});
