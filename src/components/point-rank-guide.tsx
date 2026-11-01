import {formatPoints,POINT_RANK_LEVEL_SPAN,type PointRankTier} from '@/lib/points';
import {pointRankGuide} from '@/lib/point-progress';
import {PointRankIcon} from './rank-icons';

// ポイント FR-06: ポイントランクは保有残高で決まり、コーチランクとは独立する。
export function PointRankGuide({currentTier}:{currentTier?:PointRankTier}){
 return <section className="panel point-rank-guide"><h2>ポイントランクのしくみ</h2>
  <p className="field-help">保有ポイントが{formatPoints(POINT_RANK_LEVEL_SPAN)}pt増えるごとに1レベルアップ。Lv5の次は上の階級のLv1へ進みます。コーチの指導実績による「コーチランク」とは別のランクです。</p>
  <ol className="point-rank-ladder">{pointRankGuide.map(row=><li key={row.tier} data-rank-theme={row.tier} aria-current={row.tier===currentTier?'true':undefined}>
   <PointRankIcon tier={row.tier} size={42}/><div><strong>{row.label}</strong><small>{row.tier==='sapphire'?'最高ランク・レベルなし':'Lv1〜5'}</small></div>
   <span className="point-rank-range">{formatPoints(row.min)}{row.max===null?'pt以上':`〜${formatPoints(row.max)}pt`}</span>
   {row.tier===currentTier&&<span className="point-rank-here">現在</span>}
  </li>)}</ol>
  <p className="field-help">ランクは現在の保有ポイントで決まります。投稿の削除でポイントが取り消されると、ランクが下がる場合があります。</p>
 </section>;
}
