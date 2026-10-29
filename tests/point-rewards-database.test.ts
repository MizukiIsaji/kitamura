import {test} from 'node:test';
import assert from 'node:assert/strict';
import {existsSync,readFileSync} from 'node:fs';
import {PGlite} from '@electric-sql/pglite';

const A='11111111-1111-4111-8111-111111111111',B='22222222-2222-4222-8222-222222222222',C='33333333-3333-4333-8333-333333333333';
const migrationPath='supabase/migrations/202610250001_point_rewards.sql';
async function setup(){
 const db=new PGlite();
 await db.exec(`create role anon;create role authenticated;create role service_role bypassrls;create schema auth;create schema storage;
 create table auth.users(id uuid primary key,created_at timestamptz not null default now(),raw_user_meta_data jsonb default '{}');
 create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
 grant usage on schema auth to anon,authenticated;grant execute on function auth.uid() to anon,authenticated;
 create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);
 create table storage.objects(id uuid default gen_random_uuid(),bucket_id text references storage.buckets(id),name text);
 create function storage.foldername(text) returns text[] language sql immutable as $$select string_to_array(regexp_replace($1,'/[^/]+$',''),'/')$$;
 alter table storage.objects enable row level security;grant usage on schema storage to anon,authenticated;grant select,insert,delete on storage.objects to anon,authenticated;`);
 for(const file of ['202610170001_initial.sql','202610170002_admin.sql','202610200001_post_photos.sql','202610200003_user_points.sql'])await db.exec(readFileSync('supabase/migrations/'+file,'utf8'));
 await db.exec(`insert into auth.users(id,created_at) values('${A}','2026-10-01T00:00:00+09'),('${B}','2027-03-30T23:59:59.999999+09'),('${C}','2027-03-31T00:00:00+09');update public.point_accounts set balance=120 where user_id='${A}';
 insert into public.posts(id,user_id,title,category,fished_on,area,memo) values('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','${A}','導入前','trout','2026-10-01','岐阜県','以前の記録');`);
 if(existsSync(migrationPath))await db.exec(readFileSync(migrationPath,'utf8'));
 return db;
}
async function asUser(db:PGlite,id:string|null){await db.exec(`reset role;set role ${id?'authenticated':'anon'};select set_config('request.jwt.claim.sub','${id||''}',false);`);}
async function balance(db:PGlite,id=A){return (await db.query<{balance:number}>('select balance from public.point_accounts where user_id=$1',[id])).rows[0]?.balance;}

test('ポイント FR-02: 残高更新失敗は付与履歴も残さず、会員が対象期間や対象フラグを改ざんできない',async()=>{
 const db=await setup();try{
  const post='99999999-9999-4999-8999-999999999999';
  await asUser(db,A);
  await assert.rejects(()=>db.exec(`update public.posts set points_eligible=true where user_id='${A}'`));
  await assert.rejects(()=>db.exec(`select app_private.grant_registration_reward('${A}')`));
  await assert.rejects(()=>db.exec(`update auth.users set created_at='2026-10-01' where id='${C}'`));
  await db.query(`insert into public.posts(id,user_id,title,category,fished_on,area,memo) values($1,$2,'残高上限','trout','2026-10-01','岐阜県','')`,[post,A]);
  await db.exec(`reset role;update public.point_accounts set balance=2147483647 where user_id='${A}'`);
  await asUser(db,A);await assert.rejects(()=>db.query('select public.finalize_post_points($1)',[post]));
  assert.equal((await db.query('select id from public.point_transactions where source_id=$1',[post])).rows.length,0);
  assert.equal(await balance(db),2147483647);
  await db.exec(`reset role;update public.point_accounts set balance=5120 where user_id='${A}'`);
  await asUser(db,A);await db.query('select public.finalize_post_points($1)',[post]);
  assert.equal((await db.query<{sum:number}>('select sum(amount)::integer as sum from public.point_transactions where user_id=$1',[A])).rows[0].sum,await balance(db));
  await asUser(db,null);assert.equal((await db.query<{value:{amount:number}}>('select public.registration_reward_campaign() as value')).rows[0].value.amount,5000);
 }finally{await db.close();}
});

test('ポイント FR-02: 削除は元の獲得額だけを一度取り消し、失敗時は削除も履歴も巻き戻す',async()=>{
 const db=await setup();try{
  const post='eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee';await asUser(db,A);
  await db.query(`insert into public.posts(id,user_id,title,category,fished_on,area,memo) values($1,$2,'削除対象','trout','2026-10-01','岐阜県','')`,[post,A]);
  await db.query('select public.finalize_post_points($1)',[post]);assert.equal(await balance(db),5220);
  await asUser(db,B);assert.equal((await db.query('delete from public.posts where id=$1 returning id',[post])).rows.length,0);
  await asUser(db,A);await db.query('delete from public.posts where id=$1',[post]);
  assert.equal(await balance(db),5120,'投稿の100Pだけを取り消す');
  await db.query('delete from public.posts where id=$1',[post]);
  assert.deepEqual((await db.query<{kind:string;amount:number}>('select kind,amount from public.point_transactions where source_id=$1 order by amount',[post])).rows,[{kind:'post_reversal',amount:-100},{kind:'post',amount:100}]);
  await db.query(`insert into public.posts(id,user_id,title,category,fished_on,area,memo) values($1,$2,'同じIDを再利用','trout','2026-10-01','岐阜県','')`,[post,A]);
  await db.query('select public.finalize_post_points($1)',[post]);await db.query('delete from public.posts where id=$1',[post]);assert.equal(await balance(db),5120);
  const rollback='ffffffff-ffff-4fff-8fff-ffffffffffff';
  await db.query(`insert into public.posts(id,user_id,title,category,fished_on,area,memo) values($1,$2,'巻き戻し対象','trout','2026-10-01','岐阜県','')`,[rollback,A]);
  await db.query('select public.finalize_post_points($1)',[rollback]);
  await db.exec(`reset role;update public.point_accounts set balance=0 where user_id='${A}'`);
  await asUser(db,A);await assert.rejects(()=>db.query('delete from public.posts where id=$1',[rollback]));
  assert.equal((await db.query('select id from public.posts where id=$1',[rollback])).rows.length,1);
  assert.equal((await db.query("select id from public.point_transactions where source_id=$1 and kind='post_reversal'",[rollback])).rows.length,0);
  await db.exec(`reset role;update public.point_accounts set balance=5220 where user_id='${A}';delete from auth.users where id='${A}'`);
  assert.equal((await db.query('select * from public.point_transactions where user_id=$1',[A])).rows.length,0,'退会時の連鎖削除を妨げない');
 }finally{await db.close();}
});

test('ポイント FR-02: 保存済みの投稿内容から一度だけ付与し、未保存写真・過去投稿・他人への付与を拒否する',async()=>{
 const db=await setup();try{
  assert((await db.query<{fn:string|null}>("select to_regprocedure('public.finalize_post_points(uuid)')::text as fn")).rows[0].fn,'投稿を確定する操作がある');
  const post='bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
  await asUser(db,A);
  await db.query(`insert into public.posts(id,user_id,title,category,fished_on,area,memo,rod,reel,lure,is_public) values($1,$2,'加算対象','trout','2026-10-01','岐阜県',$3,'ロッド','リール','ジギング',false)`,[post,A,'魚'.repeat(99)+' \n　魚']);
  const paths=Array.from({length:5},(_,i)=>`${A}/${post}/${i}.webp`);
  await db.query('update public.posts set image_paths=$1 where id=$2',[paths,post]);
  await assert.rejects(()=>db.query('select public.finalize_post_points($1)',[post]));
  assert.equal(await balance(db),5120);
  for(const path of paths)await db.query("insert into storage.objects(bucket_id,name) values('catch-photos',$1)",[path]);
  await asUser(db,B);await assert.rejects(()=>db.query('select public.finalize_post_points($1)',[post]));
  await asUser(db,A);
  assert.equal((await db.query<{amount:number}>('select public.finalize_post_points($1) as amount',[post])).rows[0].amount,210);
  await db.query('select public.finalize_post_points($1)',[post]);assert.equal(await balance(db),5330);
  await db.query('update public.posts set memo=$1,rod=$2,image_paths=$3 where id=$4',['','',[],post]);
  await db.query('select public.finalize_post_points($1)',[post]);assert.equal(await balance(db),5330,'編集しても再計算・追加付与しない');
  await assert.rejects(()=>db.query("select public.finalize_post_points('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa')"));
  const short='cccccccc-cccc-4ccc-8ccc-cccccccccccc';
  await db.query(`insert into public.posts(id,user_id,title,category,fished_on,area,memo,rod) values($1,$2,'短いメモ','trout','2026-10-01','岐阜県',$3,$4)`,[short,A,'😀'.repeat(99)+' \n　\u00a0','　\t\u00a0']);
  assert.equal((await db.query<{amount:number}>('select public.finalize_post_points($1) as amount',[short])).rows[0].amount,100,'Unicodeの99文字に空白を足しても詳細加算しない');
  const empty='dddddddd-dddd-4ddd-8ddd-dddddddddddd';
  await db.query(`insert into public.posts(id,user_id,title,category,fished_on,area,memo) values($1,$2,'メモなし','trout','2026-10-01','岐阜県','')`,[empty,A]);
  await Promise.all([db.query('select public.finalize_post_points($1)',[empty]),db.query('select public.finalize_post_points($1)',[empty])]);
  assert.equal(await balance(db),5530);
  await assert.rejects(()=>db.exec(`update public.point_transactions set amount=99999 where user_id='${A}'`));
  await assert.rejects(()=>db.exec(`delete from public.point_transactions where user_id='${A}'`));
  await asUser(db,null);await assert.rejects(()=>db.query('select public.finalize_post_points($1)',[post]));
 }finally{await db.close();}
});

test('ポイント FR-03: 登録特典は発行日時で期間を判定し、既存残高を保って一度だけ付与する',async()=>{
 const db=await setup();try{
  assert.equal((await db.query<{name:string|null}>("select to_regclass('public.point_transactions')::text as name")).rows[0].name,'point_transactions');
  assert.equal(await balance(db),5120);assert.equal(await balance(db,B),5000);assert.equal(await balance(db,C),0);
  assert.deepEqual((await db.query<{kind:string;amount:number}>('select kind,amount from public.point_transactions where user_id=$1 order by amount',[A])).rows,[{kind:'opening',amount:120},{kind:'signup',amount:5000}]);
  await db.exec(readFileSync(migrationPath,'utf8'));assert.equal(await balance(db),5120);
  await db.exec(`update app_private.point_reward_campaign set starts_at='2026-11-01T00:00:00+09',ends_at='2026-12-01T00:00:00+09' where id='signup';`);
  const ids=['44444444-4444-4444-8444-444444444444','55555555-5555-4555-8555-555555555555','66666666-6666-4666-8666-666666666666'];
  for(const [i,at] of ['2026-10-31T23:59:59.999999+09','2026-11-01T00:00:00+09','2026-12-01T00:00:00+09'].entries())await db.query('insert into auth.users(id,created_at) values($1,$2)',[ids[i],at]);
  assert.equal(await balance(db,ids[0]),0);assert.equal(await balance(db,ids[1]),5000);assert.equal(await balance(db,ids[2]),0);
  await assert.rejects(()=>db.exec("update app_private.point_reward_campaign set ends_at=starts_at"));
  for(let i=0;i<2;i++)await db.exec(readFileSync('supabase/configure-registration-reward.sql','utf8'));
  assert.equal(await balance(db),5120,'対象期間の設定を再実行しても付与済みを増やさない');
  await asUser(db,A);await assert.rejects(()=>db.exec("update app_private.point_reward_campaign set ends_at='2999-01-01'"));
  await assert.rejects(()=>db.exec(`insert into public.point_transactions(user_id,kind,source_id,amount) values('${A}','signup','${A}',5000)`));
  assert.equal((await db.query('select * from public.point_transactions')).rows.length,2);
  await asUser(db,B);assert.equal((await db.query('select * from public.point_transactions where user_id=$1',[A])).rows.length,0);
  await asUser(db,null);await assert.rejects(()=>db.query('select * from public.point_transactions'));
 }finally{await db.close();}
});
