import Link from 'next/link';
import {ArrowRight,Compass,ShieldCheck,Store} from 'lucide-react';
import {SetupNotice} from '@/components/ui';
import {FeedList} from '@/components/feed-list';
import {getFeed,getCoaches,getFishingMap,getFacilities} from '@/lib/queries';
import {FishingMap} from '@/components/fishing-map';
import {isConfigured} from '@/lib/env';
import {categories,money} from '@/lib/domain';
export default async function Home({searchParams}:{searchParams:Promise<Record<string,string|undefined>>}){
 const title=<h1 className="sr-only">釣りマップと釣果</h1>;
 if(!isConfigured())return <>{title}{process.env.NODE_ENV!=='production'&&<section className="panel demo-entry"><div><p className="kicker">TEST DATA READY</p><h2>テストデータでアプリを試す</h2><p>架空の釣果・コーチ・相談履歴を使って、検索や記録の追加を確認できます。</p></div><Link className="button primary" href="/demo">テスト画面を開く<ArrowRight size={15}/></Link></section>}<SetupNotice/></>;
 const params=await searchParams,category=params.category&&Object.hasOwn(categories,params.category)?params.category:undefined,q=params.q?.slice(0,80)||'',page=Math.max(1,Math.min(1000,Number.parseInt(params.page||'1')||1)),following=params.tab==='following';
 const [{posts,count},coaches,map,shops]=await Promise.all([getFeed({category,q,page,following}),getCoaches(),getFishingMap(),getFacilities({kind:'shop'})]);
 return <>{title}<FishingMap entries={map.entries} totalCatches={map.totalCatches} compact/><div className="feed-layout"><FeedList posts={posts} count={count} category={category} q={q} page={page} following={following}/><aside className="feed-rail"><section className="rail-card"><p className="kicker">COACHING</p><h2>経験から、学ぼう。</h2><p>釣りの記録から、その人の得意分野や工夫を知る。</p>{coaches.slice(0,3).map(c=><Link href={'/anglers/'+c.user_id} key={c.user_id} className="mini-coach"><strong>{c.profile?.display_name}</strong><span>{c.area} / {categories[c.category]}</span>{c.plans[0]&&<b>{money(Math.min(...c.plans.map(p=>p.price_yen)))}〜</b>}</Link>)}<Link href="/coaches" className="text-link">コーチを探す<ArrowRight size={15}/></Link></section><section className="rail-card tinted"><Compass size={30}/><h2>はじめての一尾を、<br/>一緒に。</h2><p>道具の選び方も、キャストのコツも。自分のペースで学ぼう。</p><Link href="/coaches" className="text-link">プランを見てみる<ArrowRight size={15}/></Link></section>{/* トップページ（釣具屋紹介） FR-01（docs/ai-dlc/specs/02-records/home-screen） */}
{shops.length>0&&<section className="rail-card"><p className="kicker">TACKLE SHOPS</p><h2>道具は、ここから。</h2><p>運営が確認した釣具店を紹介します。</p>{shops.slice(0,3).map(shop=><div key={shop.id} className="mini-coach"><strong>{shop.name}</strong><span>{[shop.prefecture,shop.municipality].filter(Boolean).join(' ')}</span></div>)}<Link href="/explore?type=shop" className="text-link"><Store size={15}/>釣具店を探す<ArrowRight size={15}/></Link></section>}<p className="rail-note"><ShieldCheck size={17}/>ライフジャケットを着用し、現地のルールを確認してから釣りを楽しみましょう。</p></aside></div></>;
}
