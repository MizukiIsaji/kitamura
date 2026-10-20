import {test} from 'node:test';
import assert from 'node:assert/strict';
import {registerAccount} from '../src/lib/registration';
import {authErrorDetails,authErrorMessage} from '../src/lib/auth-errors';

const input={email:'test@example.com',password:'test-password-only-123',display_name:'テスト会員'};
const redirectTo='http://127.0.0.1:3000/auth/callback?next=/settings';
type AuthClient=Parameters<typeof registerAccount>[0];

test('registration proceeds immediately when Supabase returns an authenticated session',async()=>{
 let called=false;
 const auth={signUp:async(values:unknown)=>{called=true;assert.deepEqual(values,{email:input.email,password:input.password,options:{data:{display_name:input.display_name},emailRedirectTo:redirectTo}});return{data:{session:{access_token:'test-only'},user:{id:'test-user'}},error:null};}} as unknown as AuthClient;
 assert.deepEqual(await registerAccount(auth,input,redirectTo),{kind:'signed-in'});
 assert(called);
});

test('registration never assumes authentication when confirmation is still required',async()=>{
 const auth={signUp:async()=>({data:{session:null,user:{id:'pending-user'}},error:null})} as unknown as AuthClient;
 assert.deepEqual(await registerAccount(auth,input,redirectTo),{kind:'confirmation-required'});
});

test('mail errors are reported as failures instead of successful mail delivery',async()=>{
 const error={code:'over_email_send_rate_limit',status:429};
 const auth={signUp:async()=>({data:{session:null,user:null},error})} as unknown as AuthClient;
 assert.deepEqual(await registerAccount(auth,input,redirectTo),{kind:'error',error});
 assert.match(authErrorMessage(error,'signup'),/回数制限/);
 assert.match(authErrorMessage(error,'recovery'),/回数制限/);
 assert.match(authErrorMessage({code:'email_address_not_authorized'},'signup'),/送信できません/);
 assert.match(authErrorMessage({code:'email_not_confirmed'},'signin'),/確認が完了していません/);
 assert.match(authErrorMessage({},'recovery'),/送信できませんでした/);
});

test('authentication diagnostics never include provider messages or credentials',()=>{
 const providerError={code:'unexpected_failure',status:500,message:'test@example.com sb_secret_do_not_log'};
 assert.deepEqual(authErrorDetails(providerError),{code:'unexpected_failure',status:500});
 assert(!JSON.stringify(authErrorDetails(providerError)).includes('test@example.com'));
 assert(!authErrorMessage(providerError,'signup').includes('sb_secret'));
 assert.equal(authErrorDetails({code:'test@example.com'}).code,'unknown');
});

test('duplicate registrations lead to existing-account login and password recovery',()=>{
 for(const code of ['user_already_exists','email_exists']){
  const message=authErrorMessage({code,status:422},'signup');
  assert.match(message,/登録済み/);assert.match(message,/ログイン/);assert.match(message,/再設定/);
 }
 assert.match(authErrorMessage({code:'invalid_credentials'},'signin'),/一致しません/);
});
