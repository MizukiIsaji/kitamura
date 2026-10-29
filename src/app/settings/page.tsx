import {requireViewer} from '@/lib/auth';
import {getProfile} from '@/lib/queries';
import {ActionForm} from '@/components/action-form';
import {PageTitle} from '@/components/ui';
import {updateProfile} from '@/app/actions';
import {PointSummary} from '@/components/point-summary';
export const metadata={title:'プロフィール設定'};
export default async function Settings(){const user=await requireViewer('/settings'),profile=await getProfile(user.id);return <div className="narrow"><PageTitle kicker="YOUR PROFILE" title="プロフィール設定" description="釣りのスタイルや好きなことを伝えよう。"/><PointSummary/><section className="panel"><ActionForm action={updateProfile} label="プロフィールを保存する"><label>表示名<input name="display_name" defaultValue={profile?.display_name} maxLength={40} required autoComplete="nickname"/></label><label>ユーザー名<input name="handle" defaultValue={profile?.handle} pattern="[a-z0-9_]{3,30}" minLength={3} maxLength={30} required/><small>半角英小文字・数字・_で3〜30文字</small></label><label>都道府県<input name="prefecture" defaultValue={profile?.prefecture} maxLength={20} placeholder="例：神奈川県"/><small>他の利用者に表示されます。住所や具体的な場所は入力しないでください。</small></label><label>自己紹介<textarea name="bio" defaultValue={profile?.bio} maxLength={1000} rows={6} placeholder="好きな釣り、よく使うタックル、挑戦したいこと…"/></label></ActionForm></section></div>;}
