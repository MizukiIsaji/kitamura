import Link from 'next/link';
import {Plus} from 'lucide-react';
import {FeedList} from '@/components/feed-list';
import {PageTitle,SetupNotice} from '@/components/ui';
import {getFeed} from '@/lib/queries';
import {getPointsRanking} from '@/lib/point-queries';
import {isConfigured} from '@/lib/env';
import {categories} from '@/lib/domain';

export const metadata={title:'みんなの釣果'};
// Catch feed FR-01 / FR-02: the mobile catch destination contains only the public feed.
// 釣果一覧 FR-03: ランキングタブでは投稿を取得せず、既存のランキング集計を取得する。
export default async function Posts({searchParams}:{searchParams:Promise<Record<string,string|undefined>>}){
 if(!isConfigured())return <SetupNotice/>;
 const params=await searchParams,category=params.category&&Object.hasOwn(categories,params.category)?params.category:undefined,q=params.q?.slice(0,80)||'',page=Math.max(1,Math.min(1000,Number.parseInt(params.page||'1')||1)),following=params.tab==='following',ranking=params.tab==='ranking';
 const [{posts,count},rankingState]=await Promise.all([ranking?Promise.resolve({posts:[],count:0}):getFeed({category,q,page,following}),ranking?getPointsRanking():Promise.resolve(undefined)]);
 return <><PageTitle kicker="FISHING FEED" title="みんなの釣果" description="一尾の記録から、次の釣りのヒントを。" action={<Link href="/posts/new" className="button primary"><Plus size={16}/>記録する</Link>}/><FeedList posts={posts} count={count} category={category} q={q} page={page} following={following} basePath="/posts" showHeading={false} showRankingTab ranking={ranking} rankingState={rankingState}/></>;
}
