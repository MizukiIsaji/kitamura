import Link from 'next/link';
import {getPointsRanking} from '@/lib/point-queries';
import {PointsRankingBoard} from '@/components/points-ranking';
import {PageTitle} from '@/components/ui';
export const metadata={title:'ポイントランキング'};

// ポイントランキング: 未ログインでも閲覧できる。本人の順位はDB関数がログイン・参加状況から判定する。
export default async function PointsRanking(){
 const state=await getPointsRanking();
 return <div className="narrow"><PageTitle kicker="MONTHLY RANKING" title="ポイントランキング" description="今月の投稿で獲得したポイント量のランキングです。"/>
  <PointsRankingBoard state={state}/>
  <Link href="/points" className="text-link">ポイントへ戻る →</Link>
 </div>;
}
