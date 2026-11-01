import Link from 'next/link';
import {Fish,Settings,LogOut,Waves,ArrowRight,LogIn,FlaskConical,Home} from 'lucide-react';
import {getViewer} from '@/lib/auth';
import {getProfile,getCoach} from '@/lib/queries';
import {getOwnPointBalance} from '@/lib/point-queries';
import {pointRankFromBalance} from '@/lib/points';
import {signOut} from '@/app/actions';
import {NavLinks} from './nav-links';
import {AdminEntry} from './admin-entry';
import {NotificationBell} from './notification-bell';
import {CoachRankBadge} from './coach-rank';
import {PointRankBadge} from './point-rank';
import {Avatar} from './avatar';
export async function Shell({children}:{children:React.ReactNode}){
 const viewer=await getViewer();
 const [profile,coach,points]=viewer?await Promise.all([getProfile(viewer.id),getCoach(viewer.id),getOwnPointBalance()]):[null,null,null];
 const rankInfo=coach?.status==='approved'?coach.rankInfo:null;
 const pointRank=points?.status==='ready'?pointRankFromBalance(points.balance):null;
 return <div className="rank-shell" data-rank-theme={pointRank?.tier}><aside className="sidebar"><Link href="/" className="brand"><Fish size={40}/><span>KNOTs<span className="orange">.</span></span></Link><p className="brand-caption">釣りの記録が、次の出会いに。</p><span className="nav-caption">EXPLORE</span><NavLinks/><div className="sidebar-bottom"><section className="coach-promo"><Waves size={27}/><h3>あなたの経験が、<br/>誰かの一歩になる。</h3><p>得意な釣りを、次の釣り人へ。</p><Link href="/coach">コーチとして活動する <ArrowRight size={14}/></Link></section><Link href="/settings" className="settings-link"><Settings size={16}/>プロフィール設定</Link><span className="version-label"><i/> EARLY ACCESS</span></div></aside><div className="app-shell"><header className="topbar topbar-icons"><Link href="/" className="mobile-brand" aria-label="KNOTs. ホーム" title="KNOTs.">KNOTs<span>.</span></Link><div className="header-actions"><Link href="/" className="mobile-home-link icon-button" aria-label="トップページ" title="トップページ"><Home size={20}/></Link><AdminEntry iconOnly/>{process.env.NODE_ENV!=='production'&&<Link href="/demo" className="icon-button" aria-label="テスト画面" title="テスト画面"><FlaskConical size={20}/></Link>}{viewer?<><NotificationBell iconOnly/>{/* 共通ヘッダーの会員情報表示 FR-01 */}<span className="viewer-identity"><Link href="/settings" className="icon-button viewer-profile" aria-label={(profile?.display_name||'釣り人')+'のプロフィール設定'} title={(profile?.display_name||'釣り人')+'のプロフィール設定'}><Avatar name={profile?.display_name||'釣り人'} userId={viewer.id}/></Link>{rankInfo&&<CoachRankBadge info={rankInfo} iconOnly/>}{pointRank&&<PointRankBadge rank={pointRank} iconOnly/>}</span><form action={signOut}><button className="icon-button" aria-label="ログアウト" title="ログアウト"><LogOut size={18}/></button></form></>:<Link href="/login" className="icon-button" aria-label="ログイン" title="ログイン"><LogIn size={20}/></Link>}</div></header><main>{children}</main><footer><span>© 2026 KNOTs.</span><Link href="/about">サービスについて</Link><span>釣り場のルールを守り、安全な釣行を。</span></footer></div><NavLinks variant="mobile"/></div>;
}
