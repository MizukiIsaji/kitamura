import React from 'react';
import Link from 'next/link';
import {Coins,ArrowUpRight} from 'lucide-react';
import type {PointBalance} from '@/lib/points';

// ポイント FR-01: 保有残高と取得状態を表示し、利用者から変更する操作は設けない。
export function PointBalanceCard({state,showDetails=true}:{state:PointBalance;showDetails?:boolean}){
 return <section className="panel point-card" aria-label="保有ポイント">
  <div className="point-card-main"><span className="point-card-icon" aria-hidden="true"><Coins size={23}/></span><div>
   <p className="point-card-title">保有ポイント</p>
   {state.status==='ready'?<p className="point-balance"><strong>{new Intl.NumberFormat('ja-JP').format(state.balance)}</strong><span>pt</span></p>:<p className="point-card-status" role="status">{state.status==='setup-required'?'ポイント機能は準備中です。':'ポイントを取得できませんでした。時間をおいて再読み込みしてください。'}</p>}
  </div></div>
  {showDetails&&<Link href="/points" className="point-card-link">ポイントを確認<ArrowUpRight size={16}/></Link>}
 </section>;
}
