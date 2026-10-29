import Link from 'next/link';
import {Fish,Settings,LogOut,Waves,ArrowRight} from 'lucide-react';
import {getViewer} from '@/lib/auth';
import {getProfile} from '@/lib/queries';
import {signOut} from '@/app/actions';
import {NavLinks} from './nav-links';
import {AdminEntry} from './admin-entry';
export async function Shell({children}:{children:React.ReactNode}){
 const viewer=await getViewer(),profile=viewer?await getProfile(viewer.id):null;
 return <><aside className="sidebar"><Link href="/" className="brand"><Fish size={40}/><span>KNOTs<span className="orange">.</span></span></Link><p className="brand-caption">釣りの記録が、次の出会いに。</p><span className="nav-caption">EXPLORE</span><NavLinks/><div className="sidebar-bottom"><section className="coach-promo"><Waves size={27}/><h3>あなたの経験が、<br/>誰かの一歩になる。</h3><p>得意な釣りを、次の釣り人へ。</p><Link href="/coach">コーチとして活動する <ArrowRight size={14}/></Link></section><Link href="/settings" className="settings-link"><Settings size={16}/>プロフィール設定</Link><span className="version-label"><i/> EARLY ACCESS</span></div></aside><div className="app-shell"><header className="topbar"><Link href="/" className="mobile-brand">KNOTs<span>.</span></Link><span className="header-description"><Waves size={18}/> THE FISHING JOURNAL <i/> 釣果と学びをつなぐ</span><div className="header-actions"><AdminEntry/>{process.env.NODE_ENV!=='production'?<Link href="/demo" className="preview-badge">テスト画面</Link>:<span className="preview-badge">開発版</span>}{viewer?<><Link href="/settings" className="viewer-name">{profile?.display_name||'釣り人'}</Link><form action={signOut}><button className="icon-button" aria-label="ログアウト" title="ログアウト"><LogOut size={18}/></button></form></>:<Link href="/login" className="login-link">ログイン <ArrowRight size={14}/></Link>}</div></header><main>{children}</main><footer><span>© 2026 KNOTs.</span><Link href="/about">サービスについて</Link><span>釣り場のルールを守り、安全な釣行を。</span></footer></div><NavLinks variant="mobile"/></>;
}
