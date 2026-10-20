import type {SupabaseClient} from '@supabase/supabase-js';

/** Also supports recovery links requested outside this browser (e.g. Auth dashboard). */
export async function restoreRecoverySession(
 fragment:string,
 auth:Pick<SupabaseClient['auth'],'setSession'>,
):Promise<'ready'|'invalid'|'rejected'>{
 const params=new URLSearchParams(fragment.replace(/^#/,''));
 const access_token=params.get('access_token'),refresh_token=params.get('refresh_token');
 if(params.has('error')||params.has('error_code')||params.get('type')!=='recovery'||!access_token||!refresh_token)return 'invalid';
 const {data,error}=await auth.setSession({access_token,refresh_token});
 return !error&&data.session&&data.user?'ready':'rejected';
}
