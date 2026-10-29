import {test} from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';import {PGlite} from '@electric-sql/pglite';
test('ポイント FR-01: 既存・新規会員に0ポイントを作成し、本人の閲覧だけを許可する',async()=>{
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
  await db.exec(`insert into auth.users(id,raw_user_meta_data) values('${A}','{"points":999999}'),('${B}','{}');`);
  const migration=readFileSync('supabase/migrations/202610200003_user_points.sql','utf8');await db.exec(migration);
  assert.equal((await db.query(`select tablename from pg_tables where schemaname='public' and tablename='point_accounts'`)).rows.length,1,'ポイントの保存欄が存在する');
  assert.deepEqual((await db.query(`select user_id,balance from public.point_accounts order by user_id`)).rows,[{user_id:A,balance:0},{user_id:B,balance:0}]);
  await db.exec(`update public.point_accounts set balance=1250 where user_id='${A}';`);
  await db.exec(migration);await db.exec(migration);
  assert.equal((await db.query<{balance:number}>(`select balance from public.point_accounts where user_id='${A}'`)).rows[0].balance,1250,'追加SQLを再実行しても残高を初期化しない');
  await db.exec(`insert into auth.users(id,raw_user_meta_data) values('${C}','{"points":999999}');`);
  assert.equal((await db.query<{balance:number}>(`select balance from public.point_accounts where user_id='${C}'`)).rows[0].balance,0,'会員メタデータから残高を採用しない');
  for(const value of ['-1','2147483648','NULL'])await assert.rejects(()=>db.exec(`update public.point_accounts set balance=${value} where user_id='${A}'`));
  const asUser=async(id:string|null)=>db.exec(`reset role;set role ${id?'authenticated':'anon'};select set_config('request.jwt.claim.sub','${id||''}',false);`);
  await asUser(A);assert.deepEqual((await db.query(`select user_id,balance from public.point_accounts`)).rows,[{user_id:A,balance:1250}]);
  assert.equal((await db.query(`select balance from public.point_accounts where user_id='${B}'`)).rows.length,0);
  await assert.rejects(()=>db.exec(`update public.point_accounts set balance=9999 where user_id='${A}'`));
  await assert.rejects(()=>db.exec(`delete from public.point_accounts where user_id='${A}'`));
  await assert.rejects(()=>db.exec(`insert into public.point_accounts(user_id,balance) values('${A}',9999)`));
  await assert.rejects(()=>db.exec(`select public.create_point_account()`));
  await db.exec(`update public.profiles set bio='ポイントは自分では変更できない' where id='${A}'`);
  assert.equal((await db.query<{balance:number}>(`select balance from public.point_accounts`)).rows[0].balance,1250);
  await asUser(B);assert.deepEqual((await db.query(`select user_id,balance from public.point_accounts`)).rows,[{user_id:B,balance:0}]);
  await asUser(null);await assert.rejects(()=>db.query('select * from public.point_accounts'));
  await db.exec(`reset role;delete from auth.users where id='${C}';`);
  assert.equal((await db.query(`select user_id from public.point_accounts where user_id='${C}'`)).rows.length,0,'退会した会員の残高も削除される');
 }finally{await db.close();}
});
