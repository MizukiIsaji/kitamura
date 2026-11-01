import {pointRankFromBalance} from '@/lib/points';
import {PointRankBadge} from './point-rank';
import {Fish,UserRound} from 'lucide-react';

// Development-only samples cover every point-rank palette without changing real accounts.
export function RankColorGuide(){
 return <section className="panel rank-color-guide" aria-label="ポイントランク別の配色見本">
  <h2>ポイントランクとヘッダー・フッターの配色</h2>
  <p className="field-help">5階級の確認用データです。実際の画面では、ログイン中の会員のポイントランクに合わせて配色が変わります。</p>
  <div className="rank-palette-grid">{[0,5000,10000,15000,20000].map(balance=>{
   const rank=pointRankFromBalance(balance);
   return <div key={rank.tier} className="rank-palette" data-rank-theme={rank.tier}>
    <div className="rank-chrome-sample rank-chrome-icons" aria-label="ヘッダーのアイコン見本"><Fish size={20}/><UserRound size={18}/><PointRankBadge rank={rank} iconOnly/></div>
    <div className="rank-palette-body"><PointRankBadge rank={rank}/><span>{rank.label}</span></div>
    <div className="rank-chrome-sample">フッター・スマホ下部ナビ</div>
   </div>;
  })}</div>
 </section>;
}
