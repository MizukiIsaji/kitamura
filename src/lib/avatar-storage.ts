import 'server-only';
import {createClient} from '@supabase/supabase-js';
import {supabaseEnv} from './env';
import {AVATAR_BUCKET,avatarObjectPath} from './avatar';

// Called only after requireViewer. The form never supplies an owner, bucket, or path.
function avatarStorage(){
 const {url}=supabaseEnv(),key=process.env.SUPABASE_SERVICE_ROLE_KEY;
 if(!key)throw new Error('AVATAR_STORAGE_UNAVAILABLE');
 return createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false},global:{fetch:(input,init)=>fetch(input,{...init,signal:AbortSignal.timeout(20000)})}}).storage.from(AVATAR_BUCKET);
}
export async function saveOwnAvatar(userId:string,image:Buffer){
 const path=avatarObjectPath(userId),result=await avatarStorage().upload(path,image,{contentType:'image/webp',cacheControl:'0',upsert:true});
 if(result.error)throw new Error('AVATAR_SAVE_FAILED');
}
export async function removeOwnAvatar(userId:string){
 const path=avatarObjectPath(userId),result=await avatarStorage().remove([path]);
 if(result.error)throw new Error('AVATAR_REMOVE_FAILED');
}
