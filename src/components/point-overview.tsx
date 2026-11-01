import {pointRankFromBalance,type PointBalance,type RegistrationRewardCampaign} from '@/lib/points';
import {PointBalanceCard} from './point-balance-card';
import {PointRankProgressCard} from './point-rank-progress';
import {PointRankGuide} from './point-rank-guide';
import {PointRewardRules} from './point-reward-rules';

export function PointOverview({state,campaign}:{state:PointBalance;campaign:RegistrationRewardCampaign|null}){
 const rank=state.status==='ready'?pointRankFromBalance(state.balance):null;
 return <div className="points-overview" data-rank-theme={rank?.tier}>
  <div className="point-introduction"><p>釣行を記録するとポイントが貯まり、保有ポイントに応じてランクが上がります。</p><p className="field-help">ポイントの使用・交換は現在ご利用いただけません。保有ポイントと履歴は本人だけが確認できます。</p></div>
  <PointBalanceCard state={state} showDetails={false}/>
  <PointRankProgressCard state={state}/>
  <PointRewardRules campaign={campaign}/>
  <PointRankGuide currentTier={rank?.tier}/>
 </div>;
}
