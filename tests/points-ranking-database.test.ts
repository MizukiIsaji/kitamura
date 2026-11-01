import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {PGlite} from '@electric-sql/pglite';

const A='11111111-1111-4111-8111-111111111111',B='22222222-2222-4222-8222-222222222222',C='33333333-3333-4333-8333-333333333333';
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
 for(const file of ['202610170001_initial.sql','202610170002_admin.sql','202610200001_post_photos.sql','202610200003_user_points.sql','202610250001_point_rewards.sql','202610310001_points_ranking.sql'])
  await db.exec(readFileSync('supabase/migrations/'+file,'utf8'));
 await db.exec(`insert into auth.users(id,raw_user_meta_data) values('${A}','{"display_name":"釣り人A"}'),('${B}','{"display_name":"釣り人B"}'),('${C}','{"display_name":"釣り人C"}');`);
 return db;
}
async function asUser(db:PGlite,id:string|null){await db.exec(`reset role;set role ${id?'authenticated':'anon'};select set_config('request.jwt.claim.sub','${id||''}',false);`);}
async function grant(db:PGlite,user:string,amount:number){
 await db.exec(`reset role;insert into public.point_transactions(user_id,kind,source_id,amount) values('${user}','post',gen_random_uuid(),${amount});`);
}
async function optIn(db:PGlite,user:string,value:boolean){await asUser(db,user);await db.query('select public.set_points_ranking_opt_in($1)',[value]);}

test('ポイントランキング: 参加設定は本人だけが変更でき、残高・履歴件数は変わらない',async()=>{
 const db=await setup();try{
  await asUser(db,A);
  const before=(await db.query<{ranking_opt_in:boolean;balance:number}>('select ranking_opt_in,balance from public.point_accounts where user_id=$1',[A])).rows[0];
  assert.equal(before.ranking_opt_in,false);
  const txCountBefore=(await db.query('select id from public.point_transactions where user_id=$1',[A])).rows.length;
  await db.query('select public.set_points_ranking_opt_in($1)',[true]);
  const after=(await db.query<{ranking_opt_in:boolean;balance:number}>('select ranking_opt_in,balance from public.point_accounts where user_id=$1',[A])).rows[0];
  assert.equal(after.ranking_opt_in,true);
  assert.equal(after.balance,before.balance);
  const txCountAfter=(await db.query('select id from public.point_transactions where user_id=$1',[A])).rows.length;
  assert.equal(txCountAfter,txCountBefore,'参加設定の変更自体は履歴を増やさない');
  await assert.rejects(()=>db.exec(`update public.point_accounts set ranking_opt_in=true where user_id='${B}'`));
  await asUser(db,B);
  assert.equal((await db.query<{ranking_opt_in:boolean}>('select ranking_opt_in from public.point_accounts where user_id=$1',[B])).rows[0].ranking_opt_in,false,'他会員の設定は変わらない');
  await asUser(db,null);await assert.rejects(()=>db.query('select public.set_points_ranking_opt_in($1)',[true]));
 }finally{await db.close();}
});

test('ポイントランキング: 参加設定ONの会員だけを当月分の獲得量で集計し、上位20件を順位付けする',async()=>{
 const db=await setup();try{
  await optIn(db,A,true);await optIn(db,B,true);
  await grant(db,A,500);await grant(db,B,1200);await grant(db,C,9999);
  await asUser(db,null);
  const result=(await db.query<{value:{top:{display_name:string;handle:string;amount:number;rank:number}[];self:unknown}}>('select public.get_points_ranking() as value')).rows[0].value;
  assert.deepEqual(result.top.map(row=>({display_name:row.display_name,amount:row.amount,rank:row.rank})),[
   {display_name:'釣り人B',amount:1200,rank:1},
   {display_name:'釣り人A',amount:500,rank:2},
  ],'参加設定OFFのCは集計・表示されない');
  assert.equal(result.self,null);
 }finally{await db.close();}
});

test('ポイントランキング: 上位20件を超える参加者は21番目以降を一覧から除く',async()=>{
 const db=await setup();try{
  const ids:string[]=[];
  for(let i=0;i<25;i++){
   const id=`44444444-4444-4444-8${String(i).padStart(3,'0')}-444444444444`;ids.push(id);
   await db.exec(`insert into auth.users(id,raw_user_meta_data) values('${id}','{"display_name":"参加者${i}"}');`);
   await optIn(db,id,true);await grant(db,id,100+i);
  }
  await asUser(db,null);
  const result=(await db.query<{value:{top:{rank:number;amount:number}[]}}>('select public.get_points_ranking() as value')).rows[0].value;
  assert.equal(result.top.length,20);
  assert.equal(result.top[0].amount,124);assert.equal(result.top[0].rank,1);
  assert.equal(result.top[19].rank,20);
 }finally{await db.close();}
});

test('ポイントランキング: 参加者本人は上位20件外でも自分の順位・当月獲得量を取得でき、未参加・未ログインには返さない',async()=>{
 const db=await setup();try{
  await optIn(db,A,true);await optIn(db,B,true);
  await grant(db,A,100);await grant(db,B,99999);
  await asUser(db,A);
  const asA=(await db.query<{value:{self:{amount:number;rank:number}|null}}>('select public.get_points_ranking() as value')).rows[0].value;
  assert.deepEqual(asA.self,{amount:100,rank:2});
  await asUser(db,C);
  const asC=(await db.query<{value:{self:unknown}}>('select public.get_points_ranking() as value')).rows[0].value;
  assert.equal(asC.self,null,'参加していない会員には本人向けの順位を返さない');
  await asUser(db,null);
  const anon=(await db.query<{value:{self:unknown}}>('select public.get_points_ranking() as value')).rows[0].value;
  assert.equal(anon.self,null,'未ログインには本人向けの順位を返さない');
 }finally{await db.close();}
});

test('ポイントランキング: 当月の獲得量が0の参加者も集計対象のまま扱い、本人の順位を返す',async()=>{
 const db=await setup();try{
  await optIn(db,A,true);await optIn(db,B,true);
  await grant(db,B,500);
  await asUser(db,A);
  const asA=(await db.query<{value:{self:{amount:number;rank:number}|null}}>('select public.get_points_ranking() as value')).rows[0].value;
  assert.deepEqual(asA.self,{amount:0,rank:2});
 }finally{await db.close();}
});

test('ポイントランキング: 日本時間の当月分だけを集計し、前月分の取引は当月の順位・獲得量に影響しない',async()=>{
 const db=await setup();try{
  await optIn(db,A,true);
  await grant(db,A,300);
  await db.exec(`reset role;insert into public.point_transactions(user_id,kind,source_id,amount,occurred_at)
   values('${A}','post',gen_random_uuid(),9999,(date_trunc('month', now() at time zone 'Asia/Tokyo') at time zone 'Asia/Tokyo') - interval '1 second');`);
  await asUser(db,null);
  const result=(await db.query<{value:{top:{amount:number}[]}}>('select public.get_points_ranking() as value')).rows[0].value;
  assert.equal(result.top[0].amount,300,'月初より前の取引は当月の集計から除く');
 }finally{await db.close();}
});
