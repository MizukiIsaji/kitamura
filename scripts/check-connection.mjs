// Read-only checks. Prints statuses only, never credentials or database records.
import fs from 'node:fs';
import {createClient} from '@supabase/supabase-js';

if(fs.existsSync('.env.local'))process.loadEnvFile('.env.local');
const url=process.env.NEXT_PUBLIC_SUPABASE_URL;
const key=process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
if(!url||!key){
 console.error('MISSING: run npm run check:env and configure .env.local first.');
 process.exit(1);
}
let publicKey=key.startsWith('sb_publishable_');
if(key.startsWith('eyJ')){
 try{publicKey=JSON.parse(Buffer.from(key.split('.')[1],'base64url')).role==='anon';}catch{}
}
if(!publicKey){console.error('ERROR: a publishable or legacy anon key is required.');process.exit(1);}
let valid=true;
try{
 const db=createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false}});
 const tables=['profiles','posts','post_likes','follows','comments','coach_profiles','coaching_plans','post_stats'];
 const results=await Promise.all(tables.map(async table=>{
  try{
   const column=table==='post_stats'?'post_id':table==='post_likes'?'post_id':table==='follows'?'follower_id':table==='coach_profiles'?'user_id':'id';
   const {error}=await db.from(table).select(column,{head:true}).limit(1).abortSignal(AbortSignal.timeout(15000));
   return {table,ok:!error,code:error?.code};
  }catch{return {table,ok:false,code:'NETWORK_ERROR'};}
 }));
 for(const result of results){
  console.log(`${result.ok?'OK':'FAIL'} database ${result.table}${result.ok?'':` (${/^[A-Z0-9_]+$/.test(result.code||'')?result.code:'UNAVAILABLE'})`}`);
  if(!result.ok)valid=false;
 }
 for(const [table,column] of [['bookmarks','post_id'],['coaching_requests','id']]){
  const {error}=await db.from(table).select(column).limit(1).abortSignal(AbortSignal.timeout(15000));
  const denied=error?.code==='42501';
  console.log(`${denied?'OK':'FAIL'} anonymous access blocked: ${table}`);
  if(!denied)valid=false;
 }
 const response=await fetch(new URL('/auth/v1/settings',url),{headers:{apikey:key},signal:AbortSignal.timeout(15000)});
 if(!response.ok){console.error('FAIL authentication settings');valid=false;}
 else{
  const settings=await response.json();
  const emailEnabled=settings.external?.email===true&&settings.disable_signup!==true;
  console.log(`${emailEnabled?'OK':'FAIL'} email registration available`);
  if(!emailEnabled)valid=false;
  if(settings.mailer_autoconfirm===false)console.log('INFO email confirmation enabled');
  else if(settings.mailer_autoconfirm===true)console.log('INFO email confirmation disabled (email/password registration)');
  else{console.error('FAIL email confirmation mode unavailable');valid=false;}
 }
}catch{
 console.error('FAIL connection: check project availability and configuration.');valid=false;
}
if(!valid)process.exitCode=1;
