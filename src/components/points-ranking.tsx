import type {PointsRanking} from '@/lib/points';
import {formatPoints} from '@/lib/points';
import {Avatar} from './avatar';
import {MemberRanks} from './member-ranks';

// ポイントランキング: 当月の参加者上位20件と、参加中の本人の順位を表示する。
export function PointsRankingBoard({state}:{state:PointsRanking}){
 return <section className="panel points-ranking" aria-labelledby="points-ranking-title">
  <h2 id="points-ranking-title">今月のポイントランキング</h2>
  <p className="field-help">ランキングに参加している会員の、今月の投稿で獲得したポイント量です。残高そのものは表示されません。</p>
  {state.status==='unavailable'&&<p role="status">ランキングを取得できませんでした。時間をおいて再読み込みしてください。</p>}
  {state.status==='empty'&&<p>まだランキングに参加している会員はいません。</p>}
  {state.status==='ready'&&<>
   <ol className="points-ranking-list">{state.top.map(entry=><li key={entry.handle} className="member-surface" data-rank-theme={entry.pointRank?.tier}>
    <span className="points-ranking-rank">{entry.rank}</span>
    <span className="points-ranking-name"><span className="member-identity"><Avatar name={entry.display_name} userId={entry.userId} size="small"/><span><span>{entry.display_name}</span><MemberRanks pointRank={entry.pointRank}/></span></span></span>
    <strong>{formatPoints(entry.amount)}<small> pt</small></strong>
   </li>)}</ol>
   {state.self&&!state.top.some(entry=>entry.rank===state.self!.rank)&&<p className="points-ranking-self member-surface" data-rank-theme={state.self.pointRank?.tier}>あなたの順位: {state.self.rank}位（{formatPoints(state.self.amount)}pt）</p>}
  </>}
 </section>;
}
