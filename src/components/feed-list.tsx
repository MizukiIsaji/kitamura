import Link from 'next/link';
import {Search,Plus} from 'lucide-react';
import {EmptyState} from '@/components/ui';
import {PostCard} from '@/components/post-card';
import {PointsRankingBoard} from '@/components/points-ranking';
import {categories,type PostCardData} from '@/lib/domain';
import type {PointsRanking} from '@/lib/points';

type Props={posts:PostCardData[];count:number;category?:string;q:string;page:number;following:boolean;basePath?:'/'|'/posts';showHeading?:boolean;compact?:boolean;showRankingTab?:boolean;ranking?:boolean;rankingState?:PointsRanking};
// FR-02: use the same feed on the home and catch-only pages; links stay in the current view.
// トップページ FR-03.1・FR-03.2: compactでは検索・絞り込み・タブ・ページ送りを省き、釣果専用画面への案内に代える。
// 釣果一覧 FR-03: ランキングタブでは投稿一覧・検索・絞り込み・ページ送りを隠し、既存のランキング表示に代える。
export function FeedList({posts,count,category,q,page,following,basePath='/',showHeading=true,compact=false,showRankingTab=false,ranking=false,rankingState}:Props){
 function url(values:Record<string,string|undefined>){const p=new URLSearchParams();Object.entries({category,q:q||undefined,tab:following?'following':undefined,...values}).forEach(([k,v])=>{if(v)p.set(k,v);});return basePath+'?'+p.toString();}
 return <section>{showHeading&&<div className="section-heading"><h2>みんなの釣果 <small>FISHING FEED</small></h2><Link href="/posts/new" className="text-link"><Plus size={14}/>記録する</Link></div>}{!compact&&<>{!ranking&&<><form className="search-form" action={basePath}><Search size={17}/><input name="q" defaultValue={q} maxLength={80} placeholder="記録のタイトルで検索" aria-label="釣果のタイトルで検索"/>{category&&<input type="hidden" name="category" value={category}/>}<button>検索</button></form><div className="filter-row"><Link className={!category?'filter-chip active':'filter-chip'} href={url({category:undefined,page:undefined})}>すべて</Link>{Object.entries(categories).map(([k,v])=><Link key={k} className={category===k?'filter-chip active':'filter-chip'} href={url({category:k,page:undefined})}>{v}</Link>)}</div></>}<div className="tabs"><Link href={url({tab:undefined,page:undefined,category:undefined,q:undefined})} className={!following&&!ranking?'active':''}>新しい記録</Link><Link href={url({tab:'following',page:undefined,category:undefined,q:undefined})} className={following?'active':''}>フォロー中</Link>{showRankingTab&&<Link href={url({tab:'ranking',page:undefined,category:undefined,q:undefined})} className={ranking?'active':''}>ランキング</Link>}{!ranking&&<span>{count}件</span>}</div></>}{ranking?<PointsRankingBoard state={rankingState||{status:'unavailable'}}/>:<><div className="post-grid">{posts.length?posts.map(post=><PostCard key={post.id} post={post}/>):<EmptyState title={q?'記録が見つかりません':'これから始まる、釣りの記録。'} description={following?'気になる釣り人をフォローすると、ここで記録を読めます。':'釣れた一尾や釣行中の発見を、最初の記録として残してみましょう。'} href={q?basePath+'?':'/posts/new'} label={q?'すべての記録を見る':'釣果を記録する'}/>}</div>{compact?<Link href="/posts" className="text-link">すべての釣果を見る →</Link>:<div className="pagination">{page>1&&<Link href={url({page:String(page-1)})}>前のページ</Link>}<span>{page}ページ</span>{page*12<count&&<Link href={url({page:String(page+1)})}>次のページ</Link>}</div>}</>}</section>;
}
