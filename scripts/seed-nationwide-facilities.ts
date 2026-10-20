import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {createHash} from 'node:crypto';
import {createClient,type SupabaseClient} from '@supabase/supabase-js';
import {nationwideFacilities,nationwideFixtureScope,planNationwideFacilities,type NationwideFacility} from './lib/nationwide-facilities';
import {facilityLocality,localAreaForMunicipality} from '../src/lib/localities';

// Server-side development CLI only. Credentials are never included in fixture data or receipts.
type StoredFacility=NationwideFacility&Record<string,unknown>;
const columns=Object.keys(nationwideFacilities[0]);
const ids=new Set(nationwideFacilities.map(row=>row.id));
function checked<T>(result:{data:T|null;error:{code?:string}|null}):T{
 if(result.error)throw new Error(`DATABASE_${/^[A-Z0-9_]+$/.test(result.error.code??'')?result.error.code:'UNAVAILABLE'}`);
 if(result.data===null)throw new Error('DATABASE_NO_RESULT');
 return result.data;
}
function canonical(value:unknown):unknown{
 if(Array.isArray(value))return value.map(canonical);
 if(value&&typeof value==='object')return Object.fromEntries(Object.entries(value).sort(([a],[b])=>a.localeCompare(b)).map(([key,item])=>[key,canonical(item)]));
 return value;
}
function digest(rows:StoredFacility[]){
 return createHash('sha256').update(JSON.stringify(canonical([...rows].sort((a,b)=>a.id.localeCompare(b.id))))).digest('hex');
}
async function readAll(db:SupabaseClient){
 const rows:StoredFacility[]=[];
 for(let offset=0;;offset+=1000){
  const page=checked(await db.from('facilities').select('*').order('id').range(offset,offset+999).abortSignal(AbortSignal.timeout(20000))) as StoredFacility[];
  rows.push(...page);
  if(page.length<1000)return rows;
 }
}
async function main(){
 if(process.env.NODE_ENV==='production')throw new Error('DEVELOPMENT_ONLY');
 const args=process.argv.slice(2);
 if(args.some(arg=>arg!=='--apply'))throw new Error('USAGE_USE_APPLY_OR_NO_ARGUMENTS');
 const apply=args.includes('--apply');
 process.loadEnvFile(resolve('.env.local'));
 const url=process.env.NEXT_PUBLIC_SUPABASE_URL;
 const key=process.env.SUPABASE_SERVICE_ROLE_KEY;
 const publicKey=process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY||process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
 if(!url||!key||!publicKey)throw new Error('MISSING_SERVER_OR_PUBLIC_CONFIGURATION');
 const expected=JSON.parse(await readFile(resolve('.supabase/development-accounts.local.json'),'utf8')) as {projectUrl?:string};
 if(!expected.projectUrl||new URL(expected.projectUrl).origin!==new URL(url).origin)throw new Error('DEVELOPMENT_PROJECT_MISMATCH');
 const options={auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false}};
 const db=createClient(url,key,options);
 const before=await readAll(db);
 const plan=planNationwideFacilities(before);
 console.log(JSON.stringify({mode:apply?'apply':'dry-run',fixtures:nationwideFacilities.length,missing:plan.missing.length,alreadyPresent:plan.existingCount,unrelated:before.filter(row=>!ids.has(row.id)).length}));
 if(!apply)return;
 if(plan.missing.length){
  // INSERT ... ON CONFLICT DO NOTHING: one statement; never UPDATE or DELETE existing rows.
  checked(await db.from('facilities').upsert(plan.missing,{onConflict:'id',ignoreDuplicates:true}).select('id').abortSignal(AbortSignal.timeout(30000)));
 }
 const after=await readAll(db);
 const byId=new Map(after.map(row=>[row.id,row]));
 if(planNationwideFacilities(after).missing.length)throw new Error('FIXTURE_READBACK_MISSING');
 for(const row of plan.missing){
  const stored=byId.get(row.id)!;
  if(columns.some(column=>stored[column]!==row[column as keyof NationwideFacility]))throw new Error('FIXTURE_READBACK_MISMATCH');
 }
 const otherBefore=before.filter(row=>!ids.has(row.id)),otherAfter=after.filter(row=>!ids.has(row.id));
 if(digest(otherBefore)!==digest(otherAfter))throw new Error('UNRELATED_DATA_CHANGED_DURING_RUN');
 const publicDb=createClient(url,publicKey,options);
 const visible:string[]=[];
 for(let offset=0;offset<nationwideFacilities.length;offset+=40){
  const batch=nationwideFacilities.slice(offset,offset+40).map(row=>row.id);
  const result=checked(await publicDb.from('facilities').select('id').in('id',batch).abortSignal(AbortSignal.timeout(20000)));
  visible.push(...result.map(row=>row.id as string));
 }
 if(new Set(visible).size!==nationwideFacilities.length)throw new Error('PUBLIC_READBACK_MISSING');
 const stored=after.filter(row=>ids.has(row.id));
 const countBy=(select:(row:StoredFacility)=>string)=>Object.fromEntries([...new Set(stored.map(select))].sort().map(group=>[group,stored.filter(row=>select(row)===group).length]));
 const receipt={scope:nationwideFixtureScope,completedAt:new Date().toISOString(),projectFingerprint:createHash('sha256').update(new URL(url).origin).digest('hex').slice(0,16),newlyInserted:plan.missing.length,total:stored.length,prefectures:new Set(stored.map(row=>row.prefecture)).size,municipalities:new Set(stored.map(row=>row.prefecture+row.municipality)).size,byKind:countBy(row=>row.kind),byPrefecture:countBy(row=>row.prefecture),gifuAreas:countBy(row=>localAreaForMunicipality(facilityLocality(row.prefecture,row.municipality,row.address)?.id??'')?.name??'other'),publiclyVisible:visible.length,unrelatedRowsUnchanged:true,unrelatedRows:otherAfter.length,fixtureIds:stored.map(row=>row.id)};
 await mkdir(resolve('.supabase'),{recursive:true});
 await writeFile(resolve('.supabase/nationwide-facilities.local.json'),JSON.stringify(receipt,null,2)+'\n',{mode:0o600});
 console.log(JSON.stringify({...receipt,fixtureIds:undefined,byPrefecture:undefined,projectFingerprint:undefined}));
}
main().catch(error=>{
 // Never print client configuration, response bodies, keys, or unrelated records.
 const message=error instanceof Error&&/^[A-Z0-9_]+$/.test(error.message)?error.message:'SEED_FAILED_CHECK_CONNECTION_AND_CONFIGURATION';
 console.error(message);
 process.exitCode=1;
});
