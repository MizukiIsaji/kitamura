import Link from 'next/link';
import {requireViewer} from '@/lib/auth';
import {getOwnPointBalance,getOwnPointHistory,getRegistrationRewardCampaign} from '@/lib/point-queries';
import {pointHistoryPage} from '@/lib/points';
import {PointHistoryList} from '@/components/point-history';
import {PointOverview} from '@/components/point-overview';
import {PageTitle} from '@/components/ui';
export const metadata={title:'保有ポイント'};

// ポイント FR-01: ログイン済みの会員だけが自分の残高を確認する。
export default async function Points({searchParams}:{searchParams:Promise<{page?:string|string[]}>}){
 await requireViewer('/points');
 const page=pointHistoryPage((await searchParams).page);
 const [state,history,campaign]=await Promise.all([getOwnPointBalance(),getOwnPointHistory(page),getRegistrationRewardCampaign()]);
 return <div className="narrow points-page"><PageTitle kicker="YOUR POINTS" title="ポイント" description="今のランクと、次のステップを確認しよう。"/>
  <PointOverview state={state} campaign={campaign}/>
  <PointHistoryList state={history} page={page}/>
  <nav className="points-page-links" aria-label="ポイント関連の画面"><Link href="/points/ranking" className="text-link">今月のポイントランキングを見る →</Link>
  <Link href="/records" className="text-link">記録一覧へ戻る →</Link>
  </nav>
 </div>;
}
