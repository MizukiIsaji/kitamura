import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {createClient} from '@supabase/supabase-js';
import {buildCoachRankFixtures,type CoachRankFixture} from './lib/coach-rank-fixtures';
import {seedPeople,seedHandle} from './lib/development-setup';

async function main(){
 if(process.env.NODE_ENV==='production')throw Error('DEVELOPMENT_ONLY');
 process.loadEnvFile('.env.local');
 const url=process.env.NEXT_PUBLIC_SUPABASE_URL,key=process.env.SUPABASE_SERVICE_ROLE_KEY;
 const manifest=JSON.parse(fs.readFileSync('.supabase/development-accounts.local.json','utf8')) as {projectUrl:string;scope:string;accounts:{id:string}[]};
 if(!url||!key||new URL(url).origin!==new URL(manifest.projectUrl).origin||manifest.accounts.length!==5)throw Error('DEVELOPMENT_PROJECT_MISMATCH');
 const db=createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false},global:{fetch:(input,init)=>fetch(input,{...init,signal:AbortSignal.timeout(20000)})}});
 const test02=await db.from('profiles').select('id,display_name,handle').eq('display_name','テストユーザー02');
 const people=await db.from('profiles').select('id,display_name,handle').in('id',manifest.accounts.map(row=>row.id));
 if(test02.error||test02.data?.length!==1||people.error||people.data?.length!==5)throw Error('TEST_IDENTITIES_NOT_UNIQUE');
 const fixtures:CoachRankFixture[]=manifest.accounts.map((account,index)=>{
  const person=people.data.find(row=>row.id===account.id);
  if(!person||person.display_name!==seedPeople[index].name||person.handle!==seedHandle(manifest.scope,index))throw Error('FIXTURE_IDENTITY_MISMATCH');
  return {id:person.id,displayName:person.display_name,handle:person.handle,completedLessons:[100,30,10,0,0][index]};
 });
 const target02=test02.data[0],targets=[...fixtures.slice(0,4),{id:target02.id,displayName:target02.display_name,handle:target02.handle,completedLessons:10}];
 const sql=buildCoachRankFixtures(fs.readFileSync('supabase/migrations/202610280001_coach_ranks.sql','utf8'),manifest.scope,targets,fixtures[4]);
 const sqlPath='.supabase/coach-rank-fixtures.local.sql';
 fs.writeFileSync(sqlPath,sql,{mode:0o600});
 const receipt={preparedAt:new Date().toISOString(),applied:false,sqlPath,sqlSha256:createHash('sha256').update(sql).digest('hex'),projectFingerprint:createHash('sha256').update(new URL(url).origin).digest('hex'),targets,studentId:fixtures[4].id,totalCompletions:targets.reduce((sum,row)=>sum+row.completedLessons,0)};
 fs.writeFileSync('.supabase/coach-rank-fixtures.local.json',JSON.stringify(receipt,null,2)+'\n',{mode:0o600});
 console.log(JSON.stringify({prepared:true,applied:false,sqlPath,targets:targets.map(row=>({displayName:row.displayName,completedLessons:row.completedLessons})),totalCompletions:receipt.totalCompletions}));
}
main().catch(error=>{console.error(error instanceof Error&&/^[A-Z0-9_]+$/.test(error.message)?error.message:'FIXTURE_PREPARATION_FAILED');process.exitCode=1;});
