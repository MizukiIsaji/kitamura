import {test} from 'node:test';
import assert from 'node:assert/strict';
import {restoreRecoverySession} from '../src/lib/recovery';

type RecoveryAuth=Parameters<typeof restoreRecoverySession>[1];

test('recovery links restore a server-validated session before proceeding to password changes',async()=>{
 const auth={setSession:async(tokens:unknown)=>{
  assert.deepEqual(tokens,{access_token:'test-access',refresh_token:'test-refresh'});
  return {data:{session:{},user:{id:'test-user'}},error:null};
 }} as unknown as RecoveryAuth;
 assert.equal(await restoreRecoverySession('#access_token=test-access&refresh_token=test-refresh&type=recovery',auth),'ready');
});

test('missing, expired and non-recovery fragments never establish a session',async()=>{
 let called=false;
 const auth={setSession:async()=>{called=true;}} as unknown as RecoveryAuth;
 for(const fragment of ['', '#type=recovery', '#access_token=x&refresh_token=y&type=signup','#access_token=x&type=recovery','#access_token=x&refresh_token=y&type=recovery&error_code=otp_expired']){
  assert.equal(await restoreRecoverySession(fragment,auth),'invalid');
 }
 assert.equal(called,false);
});

test('rejected sessions do not permit password recovery',async()=>{
 const auth={setSession:async()=>({data:{session:null,user:null},error:{code:'bad_jwt'}})} as unknown as RecoveryAuth;
 assert.equal(await restoreRecoverySession('#access_token=invalid&refresh_token=invalid&type=recovery',auth),'rejected');
});
