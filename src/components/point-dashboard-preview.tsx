'use client';

import {useState} from 'react';
import type {PointBalance} from '@/lib/points';
import {PointOverview} from './point-overview';

export function PointDashboardPreview(){
 const [sample,setSample]=useState('5250');
 const state:PointBalance=sample==='setup-required'||sample==='unavailable'?{status:sample}:{status:'ready',balance:Number(sample)};
 return <>
  <section className="panel points-preview-controls"><p className="field-help">開発用の架空データです。実会員の残高や実績を変更しません。</p>
   <label>表示する状態<select value={sample} onChange={event=>setSample(event.target.value)}>
    <option value="0">0pt / ブロンズLv1</option><option value="999">999pt / あと1ptでレベルアップ</option>
    <option value="4999">4,999pt / あと1ptでシルバー</option><option value="5250">5,250pt / シルバーLv1</option>
    <option value="15000">15,000pt / プラチナLv1</option><option value="19999">19,999pt / あと1ptでサファイア</option>
    <option value="20000">20,000pt / 最高ランク</option><option value="setup-required">ポイント機能の準備中</option><option value="unavailable">残高の取得失敗</option>
   </select></label>
  </section>
  <PointOverview state={state} campaign={null}/>
 </>;
}
