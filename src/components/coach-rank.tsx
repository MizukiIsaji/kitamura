import {coachRankRates,type CoachRankInfo,type CoachRank} from '@/lib/coach-ranks';
import {money} from '@/lib/domain';

export function CoachRankBadge({info}:{info?:CoachRankInfo|null}){
 if(!info)return <span className="tag">ランク情報は準備中</span>;
 return <span className={'coach-rank '+info.rank} title={'受講者が完了確認した指導 '+info.completedLessons+'件'}>{coachRankRates[info.rank].label}</span>;
}
// コーチ一覧 FR-02: 全ランクの条件と2時間・1人あたりの料金を案内する。
export function CoachRankGuide(){return <section className="panel"><h2>コーチランクと2時間の料金</h2><p className="field-help">受講者が完了を確認した指導の累計件数で自動判定します。同じランク内では完了件数の多い順に表示します。</p><div className="coach-rank-rates">{(Object.keys(coachRankRates) as CoachRank[]).map(rank=>{const rate=coachRankRates[rank];return <div key={rank}><CoachRankBadge info={{rank,completedLessons:rate.minLessons}}/><strong>{money(rate.priceYen)}</strong><span>{rank==='platinum'?'100件以上':rank==='gold'?'30〜99件':rank==='silver'?'10〜29件':'0〜9件'}</span></div>;})}</div><p className="field-help">料金は2時間・1人あたりです。ほかの時間のプランは、プランごとの表示料金をご確認ください。</p></section>;}
