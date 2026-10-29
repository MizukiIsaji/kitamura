import Link from 'next/link';
import {pointReasons,type PointHistory} from '@/lib/points';

const dateFormat=new Intl.DateTimeFormat('ja-JP',{timeZone:'Asia/Tokyo',dateStyle:'medium',timeStyle:'short'});
// ポイント FR-04: read-only personal history with explicit empty and failure states.
export function PointHistoryList({state,page=1}:{state:PointHistory;page?:number}){
 return <section className="panel point-history" aria-labelledby="point-history-title">
  <h2 id="point-history-title">ポイント履歴</h2><p className="field-help">新しい順・20件ずつ表示（日本時間）</p>
  {state.status!=='ready'?<p role="status">{state.status==='setup-required'?'ポイント履歴は準備中です。':'履歴を取得できませんでした。時間をおいて再読み込みしてください。'}</p>:<>
   {state.entries.length?<ol className="point-history-list">{state.entries.map(entry=><li key={entry.id}>
    <div><span>{pointReasons[entry.kind]}</span><time dateTime={entry.occurred_at}>{dateFormat.format(new Date(entry.occurred_at))}</time></div>
    <strong className={entry.amount<0?'point-debit':'point-credit'}>{entry.amount>0?'+':''}{new Intl.NumberFormat('ja-JP').format(entry.amount)}<small> pt</small></strong>
   </li>)}</ol>:<p>{page===1?'ポイント履歴はまだありません。':'このページの履歴はありません。'}</p>}
   <nav className="point-history-pager" aria-label="ポイント履歴のページ送り">
    {page>1&&<Link href={page===2?'/points':`/points?page=${page-1}`} className="text-link">← 新しい履歴</Link>}
    {state.hasNext&&page<10000&&<Link href={`/points?page=${page+1}`} className="text-link">以前の履歴 →</Link>}
   </nav>
  </>}
 </section>;
}
