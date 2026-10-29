import Link from 'next/link';
import {requireViewer} from '@/lib/auth';
import {getOwnPointBalance,getOwnPointHistory,getRegistrationRewardCampaign} from '@/lib/point-queries';
import {pointHistoryPage} from '@/lib/points';
import {PointHistoryList} from '@/components/point-history';
import {PointRewardRules} from '@/components/point-reward-rules';
import {PointBalanceCard} from '@/components/point-balance-card';
import {PageTitle} from '@/components/ui';
export const metadata={title:'保有ポイント'};

// ポイント FR-01: ログイン済みの会員だけが自分の残高を確認する。
export default async function Points({searchParams}:{searchParams:Promise<{page?:string|string[]}>}){
 await requireViewer('/points');
 const page=pointHistoryPage((await searchParams).page);
 const [state,history,campaign]=await Promise.all([getOwnPointBalance(),getOwnPointHistory(page),getRegistrationRewardCampaign()]);
 return <div className="narrow"><PageTitle kicker="YOUR POINTS" title="保有ポイント" description="あなたのポイント残高を確認できます。"/>
  <PointBalanceCard state={state} showDetails={false}/>
  <PointHistoryList state={history} page={page}/>
  <PointRewardRules campaign={campaign}/>
  <Link href="/records" className="text-link">記録一覧へ戻る →</Link>
 </div>;
}
