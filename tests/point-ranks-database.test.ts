import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {PGlite} from '@electric-sql/pglite';

const A='11111111-1111-4111-8111-111111111111',B='22222222-2222-4222-8222-222222222222';
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
 for(const file of ['202610170001_initial.sql','202610170002_admin.sql','202610200001_post_photos.sql','202610200003_user_points.sql','202610250001_point_rewards.sql','202611010001_point_ranks_public.sql'])
  await db.exec(readFileSync('supabase/migrations/'+file,'utf8'));
 await db.exec(`insert into auth.users(id,raw_user_meta_data) values('${A}','{}'),('${B}','{}');`);
 return db;
}
async function asUser(db:PGlite,id:string|null){await db.exec(`reset role;set role ${id?'authenticated':'anon'};select set_config('request.jwt.claim.sub','${id||''}',false);`);}
async function setBalance(db:PGlite,user:string,balance:number){await db.exec(`reset role;update public.point_accounts set balance=${balance} where user_id='${user}';`);}

test('ポイントランク公開: 階級・Lvだけを返し、残高は含まない。未ログイン・他会員からも参照できる',async()=>{
 const db=await setup();try{
  await setBalance(db,A,6000);
  await asUser(db,null);
  const anon=(await db.query<{user_id:string;tier:string;level:number|null}>('select * from public.get_point_ranks($1)',[[A,B]])).rows;
  const self=anon.find(row=>row.user_id===A)!;
  assert.deepEqual(self,{user_id:A,tier:'silver',level:2});
  assert.deepEqual(Object.keys(self).sort(),['level','tier','user_id'],'残高の列を含まない');
  await asUser(db,B);
  const asOther=(await db.query<{user_id:string;tier:string;level:number|null}>('select * from public.get_point_ranks($1)',[[A]])).rows[0];
  assert.deepEqual(asOther,{user_id:A,tier:'silver',level:2},'本人以外からも同じ結果が見える');
  assert.equal((await db.query('select balance from public.point_accounts where user_id=$1',[A])).rows.length,0,'他会員は残高そのものを取得できない');
 }finally{await db.close();}
});

test('ポイントランク公開: 1000ptごとに1レベル、ブロンズ〜プラチナ各Lv1〜5、20000pt以上はサファイア（Lvなし）',async()=>{
 const db=await setup();try{
  const cases:[number,string,number|null][]=[
   [0,'bronze',1],[999,'bronze',1],[1000,'bronze',2],[4999,'bronze',5],
   [5000,'silver',1],[5999,'silver',1],[6000,'silver',2],[9999,'silver',5],
   [10000,'gold',1],[14999,'gold',5],[15000,'platinum',1],[19999,'platinum',5],
   [20000,'sapphire',null],[25000,'sapphire',null],
  ];
  for(const [balance,tier,level] of cases){
   await setBalance(db,A,balance);
   const row=(await db.query<{tier:string;level:number|null}>('select tier,level from public.get_point_ranks($1)',[[A]])).rows[0];
   assert.deepEqual(row,{tier,level},`balance=${balance}`);
  }
 }finally{await db.close();}
});
