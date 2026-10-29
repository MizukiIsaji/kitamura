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
// ポイント FR-01: 準備中・取得失敗を0ポイントとして表示しない。
export function pointBalanceFromQuery(userId:string,result:PointBalanceQuery):PointBalance{
 if(result.error)return ['42P01','PGRST205'].includes(result.error.code||'')?{status:'setup-required'}:{status:'unavailable'};
 if(!userId||!result.data||typeof result.data!=='object')return {status:'unavailable'};
 const account=result.data as {user_id?:unknown;balance?:unknown};
 if(account.user_id!==userId||typeof account.balance!=='number'||!Number.isInteger(account.balance)||account.balance<0||account.balance>2147483647)return {status:'unavailable'};
 return {status:'ready',balance:account.balance};
}
