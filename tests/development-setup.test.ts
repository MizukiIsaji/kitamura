import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {PGlite} from '@electric-sql/pglite';
import {buildAdminBootstrap,buildDevelopmentBootstrap,fixtureId,seedEmail} from '../scripts/lib/development-setup';

test('email-based admin repair and five related fixtures preserve real records and remain repeatable',async()=>{
 const db=new PGlite();
 const owner='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',other='bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
 const email="owner.o'reilly@example.com",scope='aabbccdd';
 const accounts=Array.from({length:5},(_,index)=>({id:fixtureId(scope,'account-'+index),email:seedEmail(scope,index)}));
 const migration=readFileSync('supabase/migrations/202610170002_admin.sql','utf8');
 try{
  await db.exec(`create role anon; create role authenticated; create role service_role bypassrls;
   create schema auth; create schema storage;
   create table auth.users(id uuid primary key,email text,encrypted_password text not null default 'unchanged-hash',raw_user_meta_data jsonb default '{}');
   create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
   grant usage on schema auth to anon,authenticated; grant execute on function auth.uid() to anon,authenticated;
   create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);
   create table storage.objects(id uuid default gen_random_uuid(),bucket_id text references storage.buckets(id),name text);
   create function storage.foldername(text) returns text[] language sql immutable as $$select string_to_array(regexp_replace($1,'/[^/]+$',''),'/')$$;
   alter table storage.objects enable row level security;
   grant usage on schema storage to anon,authenticated;
   grant select,insert,delete on storage.objects to anon,authenticated;`);
  // Simulate an existing Auth user that predates the profile creation trigger.
  await db.query('insert into auth.users(id,email,raw_user_meta_data) values($1,$2,$3)',[owner,email,JSON.stringify({display_name:'本当の運営者'})]);
  await db.exec(readFileSync('supabase/migrations/202610170001_initial.sql','utf8'));
  await assert.rejects(()=>db.exec(buildAdminBootstrap(migration,'missing@example.com')));
  await db.exec('rollback;');
  assert.equal((await db.query<{relation:string|null}>("select to_regclass('app_private.admin_members') as relation")).rows[0].relation,null);
  await db.query('insert into auth.users(id,email,raw_user_meta_data) values($1,$2,$3)',[other,'real-member@example.com',JSON.stringify({display_name:'既存会員'})]);
  await db.query(`update public.profiles set handle='existing_real_member' where id=$1`,[other]);
  await db.query(`insert into public.posts(user_id,title,category,fished_on,area,memo,is_public) values($1,'既存の実データ','sea',(now() at time zone 'Asia/Tokyo')::date,'実際の地域','変更しないメモ',false)`,[other]);
  for(const account of accounts)await db.query('insert into auth.users(id,email) values($1,$2)',[account.id,account.email]);
  const sql=buildDevelopmentBootstrap(migration,email.toUpperCase(),scope,accounts);
  await db.exec(sql);
  assert.equal((await db.query<{count:number}>('select count(*)::integer as count from app_private.admin_members')).rows[0].count,1);
  assert.equal((await db.query<{user_id:string}>('select user_id from app_private.admin_members')).rows[0].user_id,owner);
  assert.equal((await db.query<{display_name:string}>('select display_name from public.profiles where id=$1',[owner])).rows[0].display_name,'本当の運営者');
  assert.equal((await db.query<{encrypted_password:string}>('select encrypted_password from auth.users where id=$1',[owner])).rows[0].encrypted_password,'unchanged-hash');
  for(const [table,count] of [['profiles',7],['posts',11],['coach_profiles',5],['coaching_plans',5],['coaching_requests',5],['comments',5],['post_likes',10],['bookmarks',10],['follows',10]] as const){
   assert.equal((await db.query<{count:number}>(`select count(*)::integer as count from public.${table}`)).rows[0].count,count,table);
  }
  assert.deepEqual((await db.query<{status:string;count:number}>('select status,count(*)::integer as count from public.coaching_requests group by status order by status')).rows,[{status:'requested',count:2},{status:'accepted',count:1},{status:'declined',count:1},{status:'cancelled',count:1}]);
  assert.equal((await db.query<{count:number}>('select count(*)::integer as count from app_private.coach_review_log')).rows[0].count,4);
  await db.query('update public.posts set memo=$1 where id=$2',['自分が編集したメモ',fixtureId(scope,'owner-post-0')]);
  await db.exec(sql);
  assert.equal((await db.query<{memo:string}>('select memo from public.posts where id=$1',[fixtureId(scope,'owner-post-0')])).rows[0].memo,'自分が編集したメモ');
  assert.equal((await db.query<{count:number}>('select count(*)::integer as count from public.comments')).rows[0].count,5,'re-run does not duplicate comments');
  assert.equal((await db.query<{handle:string}>('select handle from public.profiles where id=$1',[other])).rows[0].handle,'existing_real_member');
  assert.equal((await db.query<{memo:string}>('select memo from public.posts where user_id=$1',[other])).rows[0].memo,'変更しないメモ');
  await db.exec('set role authenticated;');
  await db.query("select set_config('request.jwt.claim.sub',$1,false)",[owner]);
  assert.equal((await db.query<{allowed:boolean}>('select public.is_app_admin() as allowed')).rows[0].allowed,true);
  assert.equal((await db.query('select * from public.bookmarks')).rows.length,5);
  assert.equal((await db.query('select * from public.coaching_requests')).rows.length,5);
  assert.equal((await db.query('select * from public.posts')).rows.length,10,'other real member private post stays private');
  await db.query("select set_config('request.jwt.claim.sub',$1,false)",[other]);
  assert.equal((await db.query('select * from public.coaching_requests')).rows.length,0);
  assert.equal((await db.query('select * from public.bookmarks')).rows.length,0);
 }finally{await db.close();}
});
