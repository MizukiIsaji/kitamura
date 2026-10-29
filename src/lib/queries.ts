import 'server-only';
import {createClient} from '@/lib/supabase/server';
import {getViewer} from './auth';
import type {Post,Profile,PostCardData,Coach,Plan,Consultation,Comment,Facility,FacilityKind} from './domain';
import {makeMapEntries} from './fishing-map';
import {getPostPhotoPaths} from './post-photos';
import {priceRankedPlan,type CoachRankInfo} from './coach-ranks';

function rankSetupMissing(error:{code?:string}|null){return !!error&&['PGRST202','PGRST205','42P01','42883'].includes(error.code||'');}
// コーチ一覧 FR-02: 未適用のDBを実績0件・ブロンズとして扱わない。
async function getCoachRanks(ids:string[]):Promise<Map<string,CoachRankInfo>|null>{
 if(!ids.length)return new Map();
 const db=await createClient(),ranks=new Map<string,CoachRankInfo>();
 for(let offset=0;offset<ids.length;offset+=200){
  const result=await db.rpc('get_coach_rankings',{p_coach_ids:ids.slice(offset,offset+200)});
  if(rankSetupMissing(result.error))return null;assertQuery(result.error);
  for(const row of result.data||[])ranks.set(row.coach_id,{rank:row.rank,completedLessons:Number(row.completed_lessons)});
 }
 return ranks;
}
export function assertQuery(error:{message:string}|null){if(error){console.error('Database query failed:',error.message);throw new Error('データの取得に失敗しました。接続設定とDBの初期設定を確認してください。');}}
export async function getProfile(id:string){const db=await createClient();const {data,error}=await db.from('profiles').select('*').eq('id',id).maybeSingle();assertQuery(error);return data as Profile|null;}
// 施設掲載 FR-01（docs/ai-dlc/specs/05-admin/facility-screen）: onlyPublished=false は管理画面専用（RLSは管理者にだけ未掲載も返す）
export async function getFacilities({kind,onlyPublished=true}:{kind?:FacilityKind;onlyPublished?:boolean}={}){
 const db=await createClient();
 let query=db.from('facilities').select('*').order('created_at',{ascending:false});
 if(kind)query=query.eq('kind',kind);
 if(onlyPublished)query=query.eq('is_published',true);
 const {data,error}=await query;assertQuery(error);return (data||[]) as Facility[];
}
export async function getFishingMap(){
 const db=await createClient();
 const [posts,coaches,facilities]=await Promise.all([
  db.from('posts').select('id,title,area,is_public,category,species,fished_on,size_cm,memo,method,rod,reel,lure',{count:'exact'}).eq('is_public',true).order('created_at',{ascending:false}).order('id').limit(200),
  getCoaches(),
  getFacilities(),
 ]);
 assertQuery(posts.error);
 return {entries:makeMapEntries(posts.data||[],coaches,facilities),totalCatches:posts.count||0};
}
export async function enrichPosts(posts:Post[]):Promise<PostCardData[]>{
 if(!posts.length)return [];const db=await createClient(),viewer=await getViewer(),ids=posts.map(p=>p.id);
 const [profiles,stats,likes,bookmarks]=await Promise.all([
   db.from('profiles').select('*').in('id',[...new Set(posts.map(p=>p.user_id))]),
   db.from('post_stats').select('*').in('post_id',ids),
   viewer?db.from('post_likes').select('post_id').eq('user_id',viewer.id).in('post_id',ids):Promise.resolve({data:[],error:null}),
   viewer?db.from('bookmarks').select('post_id').eq('user_id',viewer.id).in('post_id',ids):Promise.resolve({data:[],error:null})
 ]);[profiles,stats,likes,bookmarks].forEach(r=>assertQuery(r.error));
 const paths=[...new Set(posts.flatMap(getPostPhotoPaths))];
 const images=paths.length?await db.storage.from('catch-photos').createSignedUrls(paths,3600):{data:[],error:null};
 if(images.error)console.error('Photo URLs could not be created:',images.error.message);
 return posts.map(p=>({...p,profile:(profiles.data as Profile[]).find(x=>x.id===p.user_id)||null,imageUrl:images.data?.find(x=>x.path===getPostPhotoPaths(p)[0])?.signedUrl||null,imageUrls:getPostPhotoPaths(p).map(path=>images.data?.find(x=>x.path===path)?.signedUrl).filter((url):url is string=>Boolean(url)),likeCount:stats.data?.find(x=>x.post_id===p.id)?.like_count||0,commentCount:stats.data?.find(x=>x.post_id===p.id)?.comment_count||0,liked:!!likes.data?.some(x=>x.post_id===p.id),bookmarked:!!bookmarks.data?.some(x=>x.post_id===p.id)}));
}
export async function getFeed({category,q,page=1,userId,following=false,saved=false}:{category?:string;q?:string;page?:number;userId?:string;following?:boolean;saved?:boolean}={}){
 const db=await createClient(),viewer=await getViewer();let query=db.from('posts').select('*',{count:'exact'}).order('created_at',{ascending:false}).order('id');
 if(userId)query=query.eq('user_id',userId);else if(!saved)query=query.eq('is_public',true);
 if(category)query=query.eq('category',category);
 // Search uses a single bound ilike operand. Never interpolate into PostgREST .or().
 if(q)query=query.ilike('title','%'+q.replace(/[%_\\]/g,'\\$&').slice(0,80)+'%');
 if(following||saved){if(!viewer)return {posts:[],count:0};const relation=following?await db.from('follows').select('following_id').eq('follower_id',viewer.id):await db.from('bookmarks').select('post_id').eq('user_id',viewer.id);assertQuery(relation.error);const ids=(relation.data||[]).map(x=>'following_id' in x?x.following_id:x.post_id);if(!ids.length)return{posts:[],count:0};query=query.in(following?'user_id':'id',ids);}
 const {data,error,count}=await query.range((page-1)*12,page*12-1);
 // Feed FR-02.3: an empty/out-of-range page is a valid empty view, not a connection failure.
 if(error?.code==='PGRST103'&&page>1){
  const total=await query.range(0,0);assertQuery(total.error);
  return {posts:[],count:total.count||0};
 }
 assertQuery(error);return{posts:await enrichPosts(data as Post[]),count:count||0};
}
export async function getPost(id:string){const db=await createClient();const {data,error}=await db.from('posts').select('*').eq('id',id).maybeSingle();assertQuery(error);return data?(await enrichPosts([data as Post]))[0]:null;}
export async function getComments(postId:string){const db=await createClient();const {data,error}=await db.from('comments').select('*').eq('post_id',postId).order('created_at').limit(100);assertQuery(error);if(!data?.length)return[];const profiles=await db.from('profiles').select('*').in('id',[...new Set(data.map(x=>x.user_id))]);assertQuery(profiles.error);return(data as Comment[]).map(c=>({...c,profile:(profiles.data as Profile[]).find(p=>p.id===c.user_id)||null}));}
export async function getCoaches(category?:string){
 const db=await createClient();let query=db.from('coach_profiles').select('*').eq('status','approved').order('created_at',{ascending:false});if(category)query=query.eq('category',category);
 const coaches=await query;assertQuery(coaches.error);if(!coaches.data?.length)return[];
 const ids=coaches.data.map(c=>c.user_id),[profiles,plans,ranks]=await Promise.all([db.from('profiles').select('*').in('id',ids),db.from('coaching_plans').select('*').eq('is_active',true).in('coach_id',ids),getCoachRanks(ids)]);
 assertQuery(profiles.error);assertQuery(plans.error);
 return (coaches.data as Coach[]).map(coach=>{
  const rankInfo=ranks?.get(coach.user_id)||null;
  return {...coach,rankInfo,profile:(profiles.data as Profile[]).find(p=>p.id===coach.user_id)||null,plans:(plans.data as Plan[]).filter(p=>p.coach_id===coach.user_id).map(plan=>priceRankedPlan(plan,rankInfo?.rank||null))};
 }).sort((a,b)=>(b.rankInfo?.completedLessons??-1)-(a.rankInfo?.completedLessons??-1)||a.user_id.localeCompare(b.user_id));
}
export async function getCoach(id:string){const db=await createClient();const {data,error}=await db.from('coach_profiles').select('*').eq('user_id',id).maybeSingle();assertQuery(error);if(!data)return null;const ranks=await getCoachRanks([id]);return {...data,rankInfo:ranks?.get(id)||null} as Coach;}
export async function getPlans(id:string){const db=await createClient();const [{data,error},ranks]=await Promise.all([db.from('coaching_plans').select('*').eq('coach_id',id).order('created_at'),getCoachRanks([id])]);assertQuery(error);return (data as Plan[]).map(plan=>priceRankedPlan(plan,ranks?.get(id)?.rank||null));}
export async function getPlan(id:string){const db=await createClient();const {data,error}=await db.from('coaching_plans').select('*').eq('id',id).eq('is_active',true).maybeSingle();assertQuery(error);if(!data)return null;const ranks=await getCoachRanks([data.coach_id]);return priceRankedPlan(data as Plan,ranks?.get(data.coach_id)?.rank||null);}
export async function getRequests(userId:string):Promise<Consultation[]>{
 const db=await createClient(),{data,error}=await db.from('coaching_requests').select('*').or(`student_id.eq.${userId},coach_id.eq.${userId}`).order('created_at',{ascending:false}).limit(100);assertQuery(error);if(!data?.length)return [];
 const ids=data.map(request=>request.id),[completed,compensation]=await Promise.all([db.from('coaching_completions').select('request_id,confirmed_at').in('request_id',ids),db.from('coaching_request_compensation').select('request_id,rank,coach_payout_yen').eq('coach_id',userId).in('request_id',ids)]);
 if(!rankSetupMissing(completed.error))assertQuery(completed.error);if(!rankSetupMissing(compensation.error))assertQuery(compensation.error);
 return (data as Consultation[]).map(request=>({...request,completed_at:completed.data?.find(row=>row.request_id===request.id)?.confirmed_at||null,compensation:compensation.data?.find(row=>row.request_id===request.id)||null}));
}
