import 'server-only';
import {supabaseEnv} from './env';

export async function getEmailConfirmationMode():Promise<'required'|'disabled'|'unknown'>{
 try{
  const {url,key}=supabaseEnv();
  const response=await fetch(new URL('/auth/v1/settings',url),{
   headers:{apikey:key},cache:'no-store',signal:AbortSignal.timeout(5000),
  });
  if(!response.ok)return 'unknown';
  const settings=await response.json();
  return settings.mailer_autoconfirm===true?'disabled':settings.mailer_autoconfirm===false?'required':'unknown';
 }catch{return 'unknown';}
}
