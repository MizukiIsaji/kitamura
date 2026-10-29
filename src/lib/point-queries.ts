import 'server-only';
import {cache} from 'react';
import {getViewer} from './auth';
import {createClient} from './supabase/server';
import {pointBalanceFromQuery,pointHistoryFromQuery,registrationRewardCampaignFromQuery,POINT_HISTORY_PAGE_SIZE,type PointBalance,type PointHistory} from './points';

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
