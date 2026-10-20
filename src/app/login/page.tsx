import Link from 'next/link';
import {ActionForm} from '@/components/action-form';
import {PageTitle,SetupNotice} from '@/components/ui';
import {signIn} from '@/app/actions';
import {isConfigured} from '@/lib/env';
import {safeReturnTo} from '@/lib/domain';
export const metadata={title:'ログイン'};
export default async function Login({searchParams}:{searchParams:Promise<Record<string,string|undefined>>}){if(!isConfigured())return <SetupNotice/>;const params=await searchParams;return <div className="auth-page"><PageTitle kicker="WELCOME BACK" title="おかえりなさい" description="あなたの釣りの記録を、続けよう。"/><div className="panel">{params.error&&<p className="form-error" role="alert">メールの確認ができませんでした。再度登録または再設定メールからお試しください。</p>}<ActionForm action={signIn} label="ログインする"><input type="hidden" name="next" value={safeReturnTo(params.next)}/><label>メールアドレス<input type="email" name="email" required autoComplete="email" maxLength={254}/></label><label>パスワード<input type="password" name="password" required autoComplete="current-password" maxLength={128}/></label></ActionForm><div className="auth-links"><Link href="/forgot-password">パスワードを忘れた方</Link><Link href="/signup">会員登録はこちら</Link></div></div></div>;}
