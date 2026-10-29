'use client';
import {useState} from 'react';
import {coachRankRates,type CoachRankInfo} from '@/lib/coach-ranks';
import {money} from '@/lib/domain';

export function PlanPricingFields({duration=120,price=3000,rankInfo}:{duration?:number;price?:number;rankInfo?:CoachRankInfo|null}){
 const [minutes,setMinutes]=useState(String(duration)),[customPrice,setCustomPrice]=useState(String(price));
 const rate=rankInfo?coachRankRates[rankInfo.rank]:null,ranked=Number(minutes)===120&&!!rate;
 return <><div className="form-grid"><label>時間（分）<input name="duration_minutes" type="number" min={30} max={720} value={minutes} onChange={event=>setMinutes(event.target.value)} required/></label><label>1人あたりの表示料金（円）<input name="price_yen" type="number" min={0} max={1000000} value={ranked?rate.priceYen:customPrice} readOnly={ranked} onChange={event=>setCustomPrice(event.target.value)} required/></label></div>{ranked&&<p className="field-help">2時間の料金は{rate.label}の料金です。コーチ取り分は{money(rate.coachPayoutYen)}です。指導完了件数に応じて自動で更新されます。</p>}</>;
}
