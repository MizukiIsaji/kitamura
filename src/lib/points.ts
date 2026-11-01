export type PointBalance={status:'ready';balance:number}|{status:'setup-required'}|{status:'unavailable'};
export type PointBalanceQuery={data:unknown;error:{code?:string}|null};
export const POINT_HISTORY_PAGE_SIZE=20;
export const pointReasons={opening:'導入前の保有ポイント',signup:'アカウント登録特典',post:'釣行記録の投稿',post_reversal:'釣行記録の削除による取り消し'} as const;
export type PointTransaction={id:string;user_id:string;kind:keyof typeof pointReasons;amount:number;occurred_at:string};
export type PointHistory={status:'ready';entries:PointTransaction[];hasNext:boolean}|{status:'setup-required'}|{status:'unavailable'};
const validDate=(value:unknown):value is string=>typeof value==='string'&&/^\d{4}-\d{2}-\d{2}T/.test(value)&&Number.isFinite(Date.parse(value));
// ポイント FR-04: failures and malformed/cross-member entries never become an empty history.
export function pointHistoryFromQuery(userId:string,result:PointBalanceQuery):PointHistory{
 if(result.error)return ['42P01','PGRST205'].includes(result.error.code||'')?{status:'setup-required'}:{status:'unavailable'};
 if(!userId||!Array.isArray(result.data)||result.data.length>POINT_HISTORY_PAGE_SIZE+1)return {status:'unavailable'};
 for(const value of result.data){
  if(!value||typeof value!=='object')return {status:'unavailable'};
  const row=value as PointTransaction;
  if(row.user_id!==userId||typeof row.id!=='string'||!row.id||!Object.hasOwn(pointReasons,row.kind)||!Number.isInteger(row.amount)||Math.abs(row.amount)>2147483647||row.amount===0||!validDate(row.occurred_at))return {status:'unavailable'};
  if((row.kind==='post_reversal')!==(row.amount<0))return {status:'unavailable'};
 }
 return {status:'ready',entries:result.data.slice(0,POINT_HISTORY_PAGE_SIZE) as PointTransaction[],hasNext:result.data.length>POINT_HISTORY_PAGE_SIZE};
}
export function pointHistoryPage(value:unknown){return typeof value==='string'&&/^\d{1,5}$/.test(value)&&Number(value)>=1&&Number(value)<=10000?Number(value):1;}
export type RegistrationRewardCampaign={starts_at:string|null;ends_at:string;amount:5000};
export function registrationRewardCampaignFromQuery(result:PointBalanceQuery):RegistrationRewardCampaign|null{
 if(result.error||!result.data||typeof result.data!=='object')return null;
 const row=result.data as RegistrationRewardCampaign;
 if(row.amount!==5000||!validDate(row.ends_at)||(row.starts_at!==null&&!validDate(row.starts_at))||(row.starts_at!==null&&Date.parse(row.starts_at)>=Date.parse(row.ends_at)))return null;
 return {starts_at:row.starts_at,ends_at:row.ends_at,amount:5000};
}
export function formatPoints(balance:number):string{return new Intl.NumberFormat('ja-JP').format(balance);}
export type PointsRankingEntry={display_name:string;handle:string;amount:number;rank:number;pointRank?:PointRank|null;userId?:string};
export type PointsRankingSelf={amount:number;rank:number;pointRank?:PointRank|null};
export type PointsRanking={status:'ready';top:PointsRankingEntry[];self:PointsRankingSelf|null}|{status:'empty'}|{status:'unavailable'};
const validRankingEntry=(value:unknown):value is PointsRankingEntry=>{
 if(!value||typeof value!=='object')return false;
 const row=value as PointsRankingEntry;
 return typeof row.display_name==='string'&&typeof row.handle==='string'&&Number.isInteger(row.amount)&&Number.isInteger(row.rank)&&row.rank>=1;
};
const validRankingSelf=(value:unknown):value is PointsRankingSelf|null=>{
 if(value===null)return true;
 if(!value||typeof value!=='object')return false;
 const row=value as PointsRankingSelf;
 return Number.isInteger(row.amount)&&Number.isInteger(row.rank)&&row.rank>=1;
};
// ポイントランキング FR-01.2・FR-01.3: 参加者0人をemptyとして区別し、取得失敗・不正な応答をemptyと混同しない。
export function pointsRankingFromQuery(result:PointBalanceQuery):PointsRanking{
 if(result.error||!result.data||typeof result.data!=='object')return {status:'unavailable'};
 const body=result.data as {top?:unknown;self?:unknown};
 if(!Array.isArray(body.top)||!body.top.every(validRankingEntry))return {status:'unavailable'};
 if(!('self' in body)||!validRankingSelf(body.self))return {status:'unavailable'};
 if(body.top.length===0)return {status:'empty'};
 return {status:'ready',top:body.top,self:(body.self as PointsRankingSelf|null)};
}
export type PointRankTier='bronze'|'silver'|'gold'|'platinum'|'sapphire';
export type PointRank={tier:PointRankTier;level:1|2|3|4|5|null;label:string};
export const pointRankTierLabels:Record<PointRankTier,string>={bronze:'ブロンズ',silver:'シルバー',gold:'ゴールド',platinum:'プラチナ',sapphire:'サファイア'};
export const POINT_RANK_LEVEL_SPAN=1000,POINT_RANK_TIER_SPAN=POINT_RANK_LEVEL_SPAN*5;
const buildPointRank=(tier:PointRankTier,level:1|2|3|4|5|null):PointRank=>tier==='sapphire'?{tier,level:null,label:pointRankTierLabels.sapphire}:{tier,level:level!,label:`${pointRankTierLabels[tier]}Lv${level}`};
// ポイントランク: 1000ptごとに1レベル上がり、ブロンズ〜プラチナを各Lv1〜5（合計20000pt）、以降はサファイア。
export function pointRankFromBalance(balance:number):PointRank{
 if(!Number.isInteger(balance)||balance<0)throw new Error('Balance must be a non-negative integer');
 const tiers:PointRankTier[]=['bronze','silver','gold','platinum'];
 const tierIndex=Math.floor(balance/POINT_RANK_TIER_SPAN);
 if(tierIndex>=tiers.length)return buildPointRank('sapphire',null);
 const tier=tiers[tierIndex],level=(Math.floor((balance%POINT_RANK_TIER_SPAN)/POINT_RANK_LEVEL_SPAN)+1) as 1|2|3|4|5;
 return buildPointRank(tier,level);
}
// ADR-012: get_point_ranksは残高を返さず階級・Lvだけを返す。不正・未知の値はnullにして誤表示を避ける。
export function pointRankFromTierLevel(value:unknown):PointRank|null{
 if(!value||typeof value!=='object')return null;
 const row=value as {tier?:unknown;level?:unknown};
 if(typeof row.tier!=='string'||!Object.hasOwn(pointRankTierLabels,row.tier))return null;
 const tier=row.tier as PointRankTier;
 if(tier==='sapphire')return row.level===null?buildPointRank(tier,null):null;
 if(!Number.isInteger(row.level)||(row.level as number)<1||(row.level as number)>5)return null;
 return buildPointRank(tier,row.level as 1|2|3|4|5);
}
// ポイント FR-01: 準備中・取得失敗を0ポイントとして表示しない。
export function pointBalanceFromQuery(userId:string,result:PointBalanceQuery):PointBalance{
 if(result.error)return ['42P01','PGRST205'].includes(result.error.code||'')?{status:'setup-required'}:{status:'unavailable'};
 if(!userId||!result.data||typeof result.data!=='object')return {status:'unavailable'};
 const account=result.data as {user_id?:unknown;balance?:unknown};
 if(account.user_id!==userId||typeof account.balance!=='number'||!Number.isInteger(account.balance)||account.balance<0||account.balance>2147483647)return {status:'unavailable'};
 return {status:'ready',balance:account.balance};
}
