import Link from 'next/link';
import {Plus} from 'lucide-react';
import {requireViewer} from '@/lib/auth';
import {getFeed} from '@/lib/queries';
import {PageTitle,EmptyState} from '@/components/ui';
import {PostCard} from '@/components/post-card';
export const metadata={title:'マイレコード'};
export default async function Records({searchParams}:{searchParams:Promise<Record<string,string|undefined>>}){const user=await requireViewer('/records'),params=await searchParams,saved=params.tab==='saved',page=Math.max(1,Math.min(1000,parseInt(params.page||'1')||1)),{posts,count}=await getFeed({saved,userId:saved?undefined:user.id,page});return <><PageTitle kicker="MY FISHING JOURNAL" title="マイレコード" description="一尾の記憶も、釣行の発見も。" action={<Link href="/posts/new" className="button primary"><Plus size={17}/>釣果を記録</Link>}/><div className="tabs"><Link className={!saved?'active':''} href="/records">自分の記録</Link><Link className={saved?'active':''} href="/records?tab=saved">保存した記録</Link><span>{count}件</span></div><div className="post-grid wide-grid">{posts.length?posts.map(p=><PostCard key={p.id} post={p}/>):<EmptyState title={saved?'気になる記録を、手元に。':'最初の釣行を残してみよう'} description={saved?'釣果フィードのブックマークから記録を保存できます。':'写真やメモを、あなただけの釣りノートに残せます。'} href={saved?'/':'/posts/new'} label={saved?'みんなの釣果を見る':'記録を作成する'}/>}</div><div className="pagination">{page>1&&<Link href={`/records?tab=${saved?'saved':'posts'}&page=${page-1}`}>前へ</Link>}<span>{page}ページ</span>{page*12<count&&<Link href={`/records?tab=${saved?'saved':'posts'}&page=${page+1}`}>次へ</Link>}</div></>;}
