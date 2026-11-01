import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {createClient} from '@supabase/supabase-js';
import {AVATAR_BUCKET,MAX_AVATAR_BYTES} from '../src/lib/avatar';

async function main(){
 if(process.env.NODE_ENV==='production')throw Error('DEVELOPMENT_SETUP_ONLY');
 if(process.argv.slice(2).some(arg=>arg!=='--apply'))throw Error('USE_APPLY_OR_NO_ARGUMENTS');
 process.loadEnvFile('.env.local');
 const url=process.env.NEXT_PUBLIC_SUPABASE_URL,key=process.env.SUPABASE_SERVICE_ROLE_KEY;
 const manifest=JSON.parse(fs.readFileSync('.supabase/development-accounts.local.json','utf8')) as {projectUrl:string};
 if(!url||!key||new URL(url).origin!==new URL(manifest.projectUrl).origin)throw Error('DEVELOPMENT_PROJECT_MISMATCH');
 const db=createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false},global:{fetch:(input,init)=>fetch(input,{...init,signal:AbortSignal.timeout(20000)})}});
 const before=await db.storage.listBuckets();if(before.error)throw Error('BUCKET_READ_FAILED');
 let bucket=before.data.find(row=>row.id===AVATAR_BUCKET);
 if(bucket&&(!bucket.public||Number(bucket.file_size_limit)!==MAX_AVATAR_BYTES||bucket.allowed_mime_types?.length!==1||bucket.allowed_mime_types[0]!=='image/webp'))throw Error('EXISTING_BUCKET_SETTINGS_DIFFER_NO_CHANGE');
 if(!process.argv.includes('--apply')){console.log(JSON.stringify({bucket:AVATAR_BUCKET,ready:!!bucket,missing:!bucket}));return;}
 if(!bucket){const created=await db.storage.createBucket(AVATAR_BUCKET,{public:true,fileSizeLimit:MAX_AVATAR_BYTES,allowedMimeTypes:['image/webp']});if(created.error)throw Error('AVATAR_BUCKET_CREATE_FAILED');}
 const after=await db.storage.listBuckets();if(after.error)throw Error('BUCKET_VERIFY_FAILED');
 bucket=after.data.find(row=>row.id===AVATAR_BUCKET);
 if(!bucket?.public||Number(bucket.file_size_limit)!==MAX_AVATAR_BYTES||bucket.allowed_mime_types?.[0]!=='image/webp')throw Error('AVATAR_BUCKET_VERIFY_FAILED');
 for(const original of before.data){if(JSON.stringify(original)!==JSON.stringify(after.data.find(row=>row.id===original.id)))throw Error('EXISTING_BUCKET_CHANGED');}
 const receipt={configuredAt:new Date().toISOString(),bucket:AVATAR_BUCKET,created:!before.data.some(row=>row.id===AVATAR_BUCKET),publicRead:true,maxBytes:MAX_AVATAR_BYTES,allowedMimeTypes:['image/webp'],otherBucketsUnchanged:true,projectFingerprint:createHash('sha256').update(new URL(url).origin).digest('hex')};
 fs.writeFileSync('.supabase/avatar-storage.local.json',JSON.stringify(receipt,null,2)+'\n',{mode:0o600});
 console.log(JSON.stringify({ready:true,bucket:AVATAR_BUCKET,created:receipt.created,otherBucketsUnchanged:true}));
}
main().catch(error=>{console.error(error instanceof Error&&/^[A-Z0-9_]+$/.test(error.message)?error.message:'AVATAR_STORAGE_SETUP_FAILED');process.exitCode=1;});
