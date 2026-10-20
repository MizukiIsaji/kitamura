import {PageTitle,SetupNotice} from '@/components/ui';
import {ActionForm} from '@/components/action-form';
import {requestPasswordReset} from '@/app/actions';
import {isConfigured} from '@/lib/env';
export const metadata={title:'パスワード再設定'};
export default function Forgot(){if(!isConfigured())return <SetupNotice/>;return <div className="auth-page"><PageTitle kicker="ACCOUNT RECOVERY" title="パスワードを再設定" description="登録したメールアドレスを入力してください。"/><div className="panel"><ActionForm action={requestPasswordReset} label="再設定メールを送る"><label>メールアドレス<input name="email" type="email" autoComplete="email" required maxLength={254}/></label></ActionForm></div></div>;}
