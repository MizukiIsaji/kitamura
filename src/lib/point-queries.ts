import 'server-only';
import {cache} from 'react';
import {getViewer} from './auth';
import {getPointRanks} from './queries';
import {createClient} from './supabase/server';
import {pointBalanceFromQuery,pointHistoryFromQuery,registrationRewardCampaignFromQuery,pointsRankingFromQuery,pointRankFromBalance,POINT_HISTORY_PAGE_SIZE,type PointBalance,type PointHistory,type PointsRanking} from './points';

// ポイント FR-01: 閲覧者本人に限定して残高を取得する。管理者キーは使用しない。
export const getOwnPointBalance=cache(async():Promise<PointBalance>=>{
 const viewer=await getViewer();
 if(!viewer)return {status:'unavailable'};
 try{
  const db=await createClient();
  const result=await db.from('point_accounts').select('user_id,balance').eq('user_id',viewer.id).maybeSingle();
  return pointBalanceFromQuery(viewer.id,result);
 }catch{return {status:'unavailable'};}
});

// ポイント FR-04: user filter plus DB policies; no administrative key.
export const getOwnPointHistory=cache(async(page=1):Promise<PointHistory>=>{
 const viewer=await getViewer();if(!viewer)return {status:'unavailable'};
 try{
  const db=await createClient(),offset=(page-1)*POINT_HISTORY_PAGE_SIZE;
  const result=await db.from('point_transactions').select('id,user_id,kind,amount,occurred_at').eq('user_id',viewer.id).order('occurred_at',{ascending:false}).order('id',{ascending:false}).range(offset,offset+POINT_HISTORY_PAGE_SIZE);
  return pointHistoryFromQuery(viewer.id,result);
 }catch{return {status:'unavailable'};}
});

export const getRegistrationRewardCampaign=cache(async()=>{
 try{const db=await createClient();return registrationRewardCampaignFromQuery(await db.rpc('registration_reward_campaign'));}
 catch{return null;}
});

// プロフィール設定 FR-03.1: 設定画面に表示する本人の現在の参加状態。取得失敗時はOFFとして扱う（残高・履歴とは異なり、本人の意図しない公開を防ぐ安全側の既定値）。
export const getOwnRankingOptIn=cache(async():Promise<boolean>=>{
 const viewer=await getViewer();if(!viewer)return false;
 try{
  const db=await createClient();
  const result=await db.from('point_accounts').select('ranking_opt_in').eq('user_id',viewer.id).maybeSingle();
  return result.data?.ranking_opt_in===true;
 }catch{return false;}
});

// ポイントランキング FR-01・FR-02: 上位20件は未ログインでも取得できる。本人の順位はDB側がログイン・参加状況から判定する。
export const getPointsRanking=cache(async():Promise<PointsRanking>=>{
 try{
  const db=await createClient(),state=pointsRankingFromQuery(await db.rpc('get_points_ranking'));
  if(state.status!=='ready')return state;
  // Backgrounds use the public current tier, never this month's earned amount.
  try{
   const profiles=await db.from('profiles').select('id,handle').in('handle',state.top.map(entry=>entry.handle));
   if(profiles.error)return state;
   const [ranks,ownBalance]=await Promise.all([getPointRanks((profiles.data||[]).map(row=>row.id)),state.self?getOwnPointBalance():Promise.resolve(null)]);
   return {...state,top:state.top.map(entry=>{const profile=profiles.data?.find(row=>row.handle===entry.handle);return {...entry,userId:profile?.id,pointRank:ranks?.get(profile?.id??'')??null};}),self:state.self?{...state.self,pointRank:ownBalance?.status==='ready'?pointRankFromBalance(ownBalance.balance):null}:null};
  }catch{return state;}
 }
 catch{return {status:'unavailable'};}
});

// プロフィール設定 FR-03.1: 本人の参加設定だけをDB関数経由で変更する。
export async function setPointsRankingOptIn(optIn:boolean):Promise<void>{
 const db=await createClient();
 const {error}=await db.rpc('set_points_ranking_opt_in',{p_opt_in:optIn});
 if(error)throw error;
}
