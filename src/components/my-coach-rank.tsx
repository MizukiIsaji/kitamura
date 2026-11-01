import Link from 'next/link';
import {ArrowRight,Crown} from 'lucide-react';
import {coachRankRates} from '@/lib/coach-ranks';
import {money,type Coach} from '@/lib/domain';
import {CoachRankIcon} from './rank-icons';

// コーチ管理 FR-03・コーチ一覧 FR-04: 一覧の他会員ではなく、ログイン中の本人の状態を示す。
export function MyCoachRank({coach,showManagementLink=true}:{coach:Coach|null;showManagementLink?:boolean}){
 const info=coach?.status==='approved'?coach.rankInfo:null;
 const rate=info?coachRankRates[info.rank]:null;
 const status=!coach?'コーチ未登録':coach.status==='pending'?'承認待ち':coach.status==='suspended'?'掲載停止中':'ランク情報は準備中です';
 return <section className="panel my-coach-rank member-surface" data-rank-theme={coach?.pointRank?.tier} aria-label="自分のコーチランク">
  <div className="my-coach-rank-heading">{info?<CoachRankIcon rank={info.rank} size={54}/>:<Crown size={38} aria-hidden="true"/>}<div><p className="kicker">MY COACH RANK</p><h2>自分のコーチランク</h2><p className="my-coach-rank-name">{rate?rate.label:status}</p></div></div>
  {info&&rate?<><dl className="my-coach-rank-stats"><div><dt>指導完了</dt><dd>{info.completedLessons}<small> 件</small></dd></div><div><dt>2時間・1人の料金</dt><dd>{money(rate.priceYen)}</dd></div><div><dt>コーチ取り分</dt><dd>{money(rate.coachPayoutYen)}</dd></div></dl><p className="field-help">受講者が完了を確認した指導件数で決まるランクです。ポイントランクとは別の仕組みです。</p></>:<p className="field-help">{!coach?'コーチ登録が承認されると、ここで自分のランクを確認できます。':coach.status==='pending'?'登録内容を運営が確認しています。承認後にランクを表示します。':coach.status==='suspended'?'現在コーチの掲載を停止しています。詳しくは運営へお問い合わせください。':'ランク情報を取得できるようになると、現在のランクと指導完了件数を表示します。実績0件としては扱いません。'}</p>}
  {showManagementLink&&<Link href="/coach" className="text-link">{coach?'自分のコーチ情報・プランを確認する':'コーチ登録を申請する'}<ArrowRight size={16}/></Link>}
 </section>;
}
