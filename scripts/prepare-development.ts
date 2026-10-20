import fs from 'node:fs';
import path from 'node:path';
import {randomBytes} from 'node:crypto';
import {createClient,type SupabaseClient,type AuthResponse} from '@supabase/supabase-js';
import {z} from 'zod';
import {buildAdminBootstrap,buildDevelopmentBootstrap,fixtureId,seedEmail,seedHandle,seedPeople,seedComment,coachIntroduction} from './lib/development-setup';

const accountSchema=z.object({email:z.email(),password:z.string().min(12),id:z.uuid().optional()});
const manifestSchema=z.object({version:z.literal(1),projectUrl:z.url(),adminEmail:z.email(),scope:z.string().regex(/^[a-f0-9]{8}$/),accounts:z.array(accountSchema).length(5)});
const safeCode=(error:{code?:string})=>/^[a-z0-9_]{1,80}$/.test(error.code||'')?error.code:'unavailable';

async function main(){
 if(process.env.NODE_ENV==='production')throw new Error('Development seeding is disabled in production');
 if(fs.existsSync('.env.local'))process.loadEnvFile('.env.local');
 const emailIndex=process.argv.indexOf('--admin-email');
 if(emailIndex<0)throw new Error('Specify --admin-email for the intended administrator');
 const adminEmail=z.email().parse(process.argv[emailIndex+1]?.trim());
 const url=z.url().parse(process.env.NEXT_PUBLIC_SUPABASE_URL),key=process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
 if(!key||!key.startsWith('sb_publishable_'))throw new Error('Configure the project publishable key first');
 const netFetch:typeof fetch=(input,init)=>fetch(input,{...init,signal:AbortSignal.timeout(20000)});
 const settings=await netFetch(new URL('/auth/v1/settings',url),{headers:{apikey:key}});
 if(!settings.ok)throw new Error('Authentication settings unavailable');
 const authSettings=await settings.json();
 if(authSettings.mailer_autoconfirm!==true||authSettings.external?.email!==true||authSettings.disable_signup===true)throw new Error('Enable development email/password signup without confirmation before creating fixtures');

 const migration=fs.readFileSync('supabase/migrations/202610170002_admin.sql','utf8');
 const projectHost=new URL(url).hostname;
 const projectHeader=`-- Expected Supabase project: ${projectHost}\n`;
 fs.writeFileSync('supabase/enable-admin.local.sql',projectHeader+buildAdminBootstrap(migration,adminEmail));
 fs.mkdirSync('.supabase',{recursive:true});
 const file=path.resolve('.supabase/development-accounts.local.json');
 const scope=randomBytes(4).toString('hex');
 const manifest=fs.existsSync(file)?manifestSchema.parse(JSON.parse(fs.readFileSync(file,'utf8'))):{
  version:1 as const,projectUrl:url,adminEmail,scope,
  accounts:seedPeople.map((_,index)=>({email:seedEmail(scope,index),password:'Tr!9-'+randomBytes(24).toString('base64url'),id:undefined as string|undefined})),
 };
 if(manifest.projectUrl!==url||manifest.adminEmail.toLowerCase()!==adminEmail.toLowerCase())throw new Error('Manifest belongs to another project or administrator; no accounts changed');
 if(manifest.accounts.some((account,index)=>account.email!==seedEmail(manifest.scope,index)))throw new Error('Unexpected seed account email');
 const save=()=>fs.writeFileSync(file,JSON.stringify(manifest,null,2),{mode:0o600});
 save();
 const clients:SupabaseClient[]=[];
 for(const [index,account] of manifest.accounts.entries()){
  const db=createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false},global:{fetch:netFetch}});
  let result:AuthResponse=await db.auth.signInWithPassword({email:account.email,password:account.password});
  if(result.error){
   if(account.id)throw new Error('Existing test account login failed: '+safeCode(result.error));
   result=await db.auth.signUp({email:account.email,password:account.password,options:{data:{display_name:seedPeople[index].name,test_fixture_scope:manifest.scope}}});
  }
  if(result.error)throw new Error('Test account creation failed: '+safeCode(result.error));
  if(!result.data.user||!result.data.session||result.data.user.email?.toLowerCase()!==account.email||result.data.user.user_metadata.test_fixture_scope!==manifest.scope)throw new Error('Test account identity could not be verified');
  if(account.id&&account.id!==result.data.user.id)throw new Error('Test account ID changed; refusing to overwrite it');
  account.id=result.data.user.id;save();clients.push(db);
  const profile=await db.from('profiles').update({display_name:seedPeople[index].name,handle:seedHandle(manifest.scope,index),bio:coachIntroduction(index),prefecture:seedPeople[index].prefecture}).eq('id',account.id);
  if(profile.error)throw new Error('Test profile update failed: '+safeCode(profile.error));
  const existing=await db.from('coach_profiles').select('user_id').eq('user_id',account.id).maybeSingle();
  if(existing.error)throw new Error('Test coach lookup failed: '+safeCode(existing.error));
  if(!existing.data){
   const coach=await db.from('coach_profiles').insert({user_id:account.id,introduction:coachIntroduction(index),category:seedPeople[index].category,area:seedPeople[index].prefecture+'・架空のテストエリア',years_experience:6+index});
   if(coach.error)throw new Error('Test coach application failed: '+safeCode(coach.error));
  }
  const person=seedPeople[index],postId=fixtureId(manifest.scope,'coach-post-'+index);
  const date=new Date(Date.now()-index*86400000);
  const post=await db.from('posts').upsert({id:postId,user_id:account.id,title:'[テスト] '+person.title,species:person.species,size_cm:person.size,category:person.category,fished_on:new Intl.DateTimeFormat('sv-SE',{timeZone:'Asia/Tokyo'}).format(date),area:person.prefecture+'・架空のテスト釣り場',method:'ルアー',rod:'テストロッド',reel:'テストリール',lure:'テストルアー',memo:'架空のテスト釣果です。道具や釣り方を記録して、次の釣行で試したいことを残しました。',is_public:true},{onConflict:'id',ignoreDuplicates:true});
  if(post.error)throw new Error('Test post creation failed: '+safeCode(post.error));
  console.log(`OK test account, profile, coach application and post ${index+1}/5`);
 }
 for(const [index,db] of clients.entries()){
  const userId=manifest.accounts[index].id!,followingId=manifest.accounts[(index+1)%5].id!,postId=fixtureId(manifest.scope,'coach-post-'+((index+1)%5));
  for(const [table,row] of [['post_likes',{user_id:userId,post_id:postId}],['bookmarks',{user_id:userId,post_id:postId}],['follows',{follower_id:userId,following_id:followingId}]] as const){
   const response=await db.from(table).upsert(row,{ignoreDuplicates:true});
   if(response.error)throw new Error('Test relationship creation failed: '+safeCode(response.error));
  }
  const body=seedComment(index);
  const existing=await db.from('comments').select('id').eq('post_id',postId).eq('user_id',userId).eq('body',body).limit(1);
  if(existing.error)throw new Error('Test comment lookup failed: '+safeCode(existing.error));
  if(!existing.data?.length){const response=await db.from('comments').insert({user_id:userId,post_id:postId,body});if(response.error)throw new Error('Test comment creation failed: '+safeCode(response.error));}
 }
 const accounts=manifest.accounts.map(account=>({id:account.id!,email:account.email}));
 fs.writeFileSync('supabase/setup-development.local.sql',projectHeader+buildDevelopmentBootstrap(migration,adminEmail,manifest.scope,accounts));
 console.log('READY supabase/setup-development.local.sql');
 console.log('READY supabase/enable-admin.local.sql');
 console.log('Test login credentials are stored only in the ignored .supabase directory.');
 if(projectHost.endsWith('.supabase.co'))console.log('SQL Editor: https://supabase.com/dashboard/project/'+projectHost.split('.')[0]+'/sql/new');
}
main().catch(error=>{console.error('Development setup stopped: '+(error instanceof z.ZodError?'invalid setup input':error instanceof Error?error.message:'unknown failure'));process.exitCode=1;});
