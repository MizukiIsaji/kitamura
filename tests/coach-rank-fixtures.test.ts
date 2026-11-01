import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {PGlite} from '@electric-sql/pglite';
import {fixtureId} from '../scripts/lib/development-setup';
import {buildCoachRankFixtures,type CoachRankFixture} from '../scripts/lib/coach-rank-fixtures';

test('コーチランク確認データ: 4ランクとテストユーザー02を作成し、再実行と対象外データを保護する',async()=>{
 const db=new PGlite(),scope='11223344';
 const targets:CoachRankFixture[]=[100,30,10,0,10].map((completedLessons,index)=>({id:fixtureId(scope,'coach-'+index),displayName:index===4?'テストユーザー02':`コーチ${index}（テスト）`,handle:`test_rank_${index}`,completedLessons}));
 const student={id:fixtureId(scope,'student'),displayName:'受講者（テスト）',handle:'test_student',completedLessons:0};
 const other=fixtureId(scope,'other');
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
  await db.exec(readFileSync('supabase/migrations/202610200002_consultation_details.sql','utf8'));
  await db.exec(readFileSync('supabase/migrations/202610300001_notifications.sql','utf8'));
  for(const row of [...targets,student]){
   await db.query('insert into auth.users(id) values($1)',[row.id]);
   await db.query('update public.profiles set display_name=$2,handle=$3 where id=$1',[row.id,row.displayName,row.handle]);
  }
  await db.query('insert into auth.users(id) values($1)',[other]);
  await db.query("insert into public.coach_profiles(user_id,status,introduction,category,area,years_experience) values($1,'approved','既存会員の紹介文をそのまま保持するためのテストである。','sea','東京都',5)",[other]);
  const otherPlan=(await db.query<{id:string}>("insert into public.coaching_plans(coach_id,title,description,duration_minutes,price_yen) values($1,'既存のプラン','既存の実データを保持するための指導プランである。',120,6000) returning id",[other])).rows[0].id;
  const sql=buildCoachRankFixtures(readFileSync('supabase/migrations/202610280001_coach_ranks.sql','utf8'),scope,targets,student);
  await db.exec(sql);
  assert.equal((await db.query<{name:string|null}>("select to_regclass('public.coaching_completions')::text as name")).rows[0].name,'coaching_completions');
  const ranks=await db.query<{coach_id:string;rank:string;completed_lessons:number}>('select coach_id,rank,completed_lessons::integer from public.get_coach_rankings($1)',[targets.map(row=>row.id)]);
  assert.deepEqual(targets.map(row=>ranks.rows.find(rank=>rank.coach_id===row.id)?.rank),['platinum','gold','silver','bronze','silver']);
  assert.deepEqual(targets.map(row=>ranks.rows.find(rank=>rank.coach_id===row.id)?.completed_lessons),[100,30,10,0,10]);
  assert.equal((await db.query<{n:number}>('select count(*)::integer as n from public.coaching_completions')).rows[0].n,150);
  await db.exec(sql);
  assert.equal((await db.query<{n:number}>('select count(*)::integer as n from public.coaching_completions')).rows[0].n,150);
  assert.equal((await db.query<{price_yen:number}>('select price_yen from public.coaching_plans where id=$1',[otherPlan])).rows[0].price_yen,6000);
  const before=(await db.query<{n:number}>('select count(*)::integer as n from public.coaching_plans')).rows[0].n;
  await assert.rejects(()=>db.exec(buildCoachRankFixtures('',scope,[{...targets[0],displayName:'別人（テスト）'}],student)));
  await db.exec('rollback');
  assert.equal((await db.query<{n:number}>('select count(*)::integer as n from public.coaching_plans')).rows[0].n,before);
 }finally{await db.close();}
});
