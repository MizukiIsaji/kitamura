import Link from 'next/link';
import {ActionForm} from '@/components/action-form';
import {PageTitle,SetupNotice} from '@/components/ui';
import {signUp} from '@/app/actions';
import {isConfigured} from '@/lib/env';
import {getEmailConfirmationMode} from '@/lib/auth-settings';
import {getRegistrationRewardCampaign} from '@/lib/point-queries';
import {RegistrationRewardNotice} from '@/components/point-reward-rules';
export const metadata={title:'会員登録'};
export default async function Signup(){
 if(!isConfigured())return <SetupNotice/>;
 const [mode,campaign]=await Promise.all([getEmailConfirmationMode(),getRegistrationRewardCampaign()]);
 return <div className="auth-page">
  <PageTitle kicker="START YOUR FISHING STORY" title="釣りの記録を、はじめよう" description="メールアドレスとパスワードで会員登録できます。"/>
  {/* 会員登録 FR-01.2: 登録後に使える機能を入力前に案内する。 */}
  <section className="notice" aria-labelledby="signup-benefits-heading">
   <h2 id="signup-benefits-heading">アカウント登録でできること</h2>
   <ul>
    <li><strong>投稿</strong>：釣果の写真やメモを記録・公開できます。</li>
    <li><strong>コーチ利用</strong>：コーチのプランを選んで、相談・依頼できます。</li>
   </ul>
  </section>
  <div className="panel">
   <RegistrationRewardNotice campaign={campaign}/>
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
