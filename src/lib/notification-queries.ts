import 'server-only';
import {cache} from 'react';
import {getViewer} from './auth';
import {getPointRanks} from './queries';
import {createClient} from './supabase/server';
import {NOTIFICATION_PAGE_SIZE,type Notification,type NotificationList} from './notifications';

// 通知 FR-02.1・FR-02.2: 本人宛の通知を新しい順に取得し、対象の相手の表示名を付ける。
export const getOwnNotifications=cache(async(page=1):Promise<NotificationList>=>{
 const viewer=await getViewer();if(!viewer)return {status:'unavailable'};
 try{
  const db=await createClient(),offset=(page-1)*NOTIFICATION_PAGE_SIZE;
  const {data,error}=await db.from('notifications').select('id,kind,consultation_id,read_at,created_at')
   .order('created_at',{ascending:false}).order('id',{ascending:false}).range(offset,offset+NOTIFICATION_PAGE_SIZE);
  if(error||!data)return {status:'unavailable'};
  const hasNext=data.length>NOTIFICATION_PAGE_SIZE,page_=data.slice(0,NOTIFICATION_PAGE_SIZE);
  if(!page_.length)return {status:'ready',entries:[],hasNext:false};
  const ids=[...new Set(page_.map(n=>n.consultation_id))];
  const requests=await db.from('coaching_requests').select('id,student_id,coach_id').in('id',ids);
  if(requests.error)return {status:'unavailable'};
  const counterpartIds=[...new Set(requests.data.map(r=>r.student_id===viewer.id?r.coach_id:r.student_id))];
  const [profiles,pointRanks]=await Promise.all([db.from('profiles').select('id,display_name').in('id',counterpartIds),getPointRanks(counterpartIds).catch(()=>null)]);
  if(profiles.error)return {status:'unavailable'};
  const entries:Notification[]=page_.map(n=>{
   const r=requests.data.find(x=>x.id===n.consultation_id);
   const counterpartId=r?(r.student_id===viewer.id?r.coach_id:r.student_id):null;
   const profile=profiles.data.find(p=>p.id===counterpartId);
   return {...n,counterpart_name:profile?.display_name||null,counterpart_id:counterpartId,pointRank:pointRanks?.get(counterpartId??'')??null};
  });
  return {status:'ready',entries,hasNext};
 }catch{return {status:'unavailable'};}
});

// 通知 FR-03.1: 未読件数を本人限定で取得する。
export const getOwnUnreadNotificationCount=cache(async():Promise<number|null>=>{
 const viewer=await getViewer();if(!viewer)return null;
 try{
  const db=await createClient();
  const {count,error}=await db.from('notifications').select('id',{count:'exact',head:true}).is('read_at',null);
  return error?null:count??0;
 }catch{return null;}
});
