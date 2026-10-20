'use client';

import {useEffect,useRef,useState} from 'react';
import Link from 'next/link';
import {createClient} from '@/lib/supabase/client';
import {restoreRecoverySession} from '@/lib/recovery';

export function RecoveryLanding(){
 const [failed,setFailed]=useState(false);
 const attempt=useRef<Promise<'ready'|'invalid'|'rejected'>|null>(null);
 useEffect(()=>{
  let active=true;
  if(!attempt.current){
   const fragment=window.location.hash;
   // Remove credentials from the address bar before making any API requests.
   window.history.replaceState(null,'',window.location.pathname);
   attempt.current=restoreRecoverySession(fragment,createClient().auth);
  }
  attempt.current.then(result=>{
   if(!active)return;
   if(result==='ready')window.location.replace('/reset-password');
   else setFailed(true);
  }).catch(()=>{if(active)setFailed(true);});
  return ()=>{active=false;};
 },[]);
 return <div className="auth-page"><section className="panel prose">
  <h1>パスワードの再設定</h1>
  {failed?<><p role="alert">再設定リンクを確認できませんでした。リンクの有効期限が切れている場合は、再設定メールをもう一度お申し込みください。</p><Link className="button primary" href="/forgot-password">再設定メールを申し込む</Link></>:<p role="status">再設定リンクを確認しています…</p>}
 </section></div>;
}
