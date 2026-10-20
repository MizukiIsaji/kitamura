import Link from 'next/link';
import {ActionForm} from '@/components/action-form';
import {PageTitle,SetupNotice} from '@/components/ui';
import {signUp} from '@/app/actions';
import {isConfigured} from '@/lib/env';
import {getEmailConfirmationMode} from '@/lib/auth-settings';
export const metadata={title:'会員登録'};
export default async function Signup(){
 if(!isConfigured())return <SetupNotice/>;
 const mode=await getEmailConfirmationMode();
 return <div className="auth-page">
  <PageTitle kicker="START YOUR FISHING STORY" title="釣りの記録を、はじめよう" description="メールアドレスとパスワードで会員登録できます。"/>
  <div className="panel">
   {mode==='disabled'&&<p className="notice positive">登録後、そのままプロフィール設定へ進めます。</p>}
   {process.env.NODE_ENV!=='production'&&mode==='required'&&<p className="notice">現在はメール確認が必要です。メールを使わずに開発を進めるには、<Link className="text-link" href="/setup#email-registration">開発用の登録設定</Link>を確認してください。</p>}
   <ActionForm action={signUp} label="会員登録する">
    <label>表示名<input name="display_name" required maxLength={40} autoComplete="nickname"/></label>
    <label>メールアドレス<input type="email" name="email" required maxLength={254} autoComplete="email"/></label>
    <label>パスワード<input type="password" name="password" required minLength={12} maxLength={128} autoComplete="new-password"/><small>12文字以上で設定してください。</small></label>
    <p className="field-help">開発中のサービスです。正式公開時の利用条件は、運営が公開前にご案内します。</p>
   </ActionForm>
   <div className="auth-links"><Link href="/login">すでに登録済みの方はこちら</Link></div>
  </div>
 </div>;
}
