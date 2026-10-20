import type {SupabaseClient} from '@supabase/supabase-js';
import type {AuthFailure} from './auth-errors';

type RegistrationResult={kind:'signed-in'}|{kind:'confirmation-required'}|{kind:'error';error:AuthFailure};

/** Handles both Supabase email-confirmation modes without bypassing authentication. */
export async function registerAccount(
 auth:Pick<SupabaseClient['auth'],'signUp'>,
 input:{email:string;password:string;display_name:string},
 redirectTo:string,
):Promise<RegistrationResult>{
 const {data,error}=await auth.signUp({
  email:input.email,password:input.password,
  options:{data:{display_name:input.display_name},emailRedirectTo:redirectTo},
 });
 if(error)return {kind:'error',error};
 if(data.session)return {kind:'signed-in'};
 return {kind:'confirmation-required'};
}
