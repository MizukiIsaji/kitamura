import Link from 'next/link';
import {ArrowRight,Camera,NotebookPen,Sparkles,Trophy} from 'lucide-react';
import {formatPoints,POINT_RANK_LEVEL_SPAN,pointRankTierLabels,type PointBalance} from '@/lib/points';
import {MAX_POST_POINTS,POST_POINT_REWARDS,pointEarningAdvice,pointRankProgress} from '@/lib/point-progress';
import {PointRankIcon} from './rank-icons';

// ポイント FR-07・FR-08: 取得できた本人の残高だけから進捗と獲得アドバイスを示す。
export function PointRankProgressCard({state}:{state:PointBalance}){
 if(state.status!=='ready')return <section className="panel point-progress-card">
  <h2>今のランクとランクアップ</h2>
  <p className="field-help" role="status">{state.status==='setup-required'?'ポイント機能の準備ができると、現在のランクと次の目標を表示します。':'残高を取得できないため、ランクと進捗は表示できません。時間をおいて再読み込みしてください。'}</p>
 </section>;
 const progress=pointRankProgress(state.balance),advice=pointEarningAdvice(progress.remaining);
 return <section className="panel point-progress-card" data-rank-theme={progress.current.tier} aria-label="現在のランクと次の目標">
  <div className="point-rank-current"><PointRankIcon tier={progress.current.tier} size={60}/><div><p className="kicker">YOUR RANK</p><h2>{progress.current.label}</h2><p>今のポイントランク</p></div></div>
  {progress.next?<>
   <div className="point-progress-heading"><p><strong>{progress.next.label}</strong>まで</p><p>あと <strong>{formatPoints(progress.remaining)}</strong> pt</p></div>
   <progress className="point-level-gauge" max={POINT_RANK_LEVEL_SPAN} value={progress.earned} aria-label="次のランクへの進捗" aria-valuetext={`${progress.next.label}まであと${formatPoints(progress.remaining)}ポイント、このレベルの進捗${progress.percent}%`}/>
   <div className="point-progress-scale"><span>このレベルで {formatPoints(progress.earned)} / {formatPoints(POINT_RANK_LEVEL_SPAN)} pt</span><span>到達残高 {formatPoints(progress.target!)} pt</span></div>
   {progress.nextTier&&progress.nextTier.threshold!==progress.target&&<p className="point-next-tier">次の階級「{pointRankTierLabels[progress.nextTier.rank.tier]}」へは、あと <strong>{formatPoints(progress.nextTier.remaining)} pt</strong></p>}
   <div className="point-earning-advice"><h3><Sparkles size={18} aria-hidden="true"/>ランクアップに向けてできること</h3>
    <div className="point-advice-options">
     <div><NotebookPen size={21} aria-hidden="true"/><h4>釣行を記録する</h4><p>新しい記録の保存で <strong>+{POST_POINT_REWARDS.post}pt</strong></p><p className="point-advice-count">あと <strong>{advice.standardPosts}件</strong> が目安</p></div>
     <div><Camera size={21} aria-hidden="true"/><h4>写真・道具・メモも残す</h4><p>写真5枚・タックル・空白を除く100文字以上のメモを添えた投稿で <strong>+{MAX_POST_POINTS}pt</strong></p><p className="point-advice-count">あと <strong>{advice.completePosts}件</strong> が目安</p></div>
    </div>
    <p className="field-help">これから新しく保存する記録での目安です。既存の記録を編集しても追加のポイントは付きません。</p>
    <Link href="/posts/new" className="button primary">釣行を記録する<ArrowRight size={16}/></Link>
   </div>
  </>:<div className="point-rank-complete"><p><Trophy size={20} aria-hidden="true"/><strong>最高ランクに到達しています</strong></p><progress className="point-level-gauge" max={100} value={100} aria-label="最高ランク達成"/><p>20,000pt以上でサファイアです。これからも釣行の思い出を記録していきましょう。</p><Link href="/posts/new" className="text-link">次の釣行を記録する<ArrowRight size={15}/></Link></div>}
 </section>;
}
