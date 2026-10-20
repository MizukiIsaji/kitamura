import {PageTitle} from '@/components/ui';
import {ActionForm} from '@/components/action-form';
import {resetPassword} from '@/app/actions';
import {requireViewer} from '@/lib/auth';
export default async function Reset(){await requireViewer('/reset-password');return <div className="auth-page"><PageTitle kicker="NEW PASSWORD" title="新しいパスワードを設定"/><div className="panel"><ActionForm action={resetPassword} label="パスワードを更新する"><label>新しいパスワード<input name="password" type="password" autoComplete="new-password" required minLength={12} maxLength={128}/></label></ActionForm></div></div>;}
