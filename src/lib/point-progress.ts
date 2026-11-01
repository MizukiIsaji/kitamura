import {POINT_RANK_LEVEL_SPAN,POINT_RANK_TIER_SPAN,pointRankFromBalance,pointRankTierLabels,type PointRank,type PointRankTier} from './points';

export const pointRankGuide=(Object.keys(pointRankTierLabels) as PointRankTier[]).map((tier,index)=>({
 tier,label:pointRankTierLabels[tier],min:index*POINT_RANK_TIER_SPAN,
 max:tier==='sapphire'?null:(index+1)*POINT_RANK_TIER_SPAN-1,
}));

export type PointRankProgress={
 current:PointRank;next:PointRank|null;levelStart:number;target:number|null;
 earned:number;remaining:number;percent:number;
 nextTier:{rank:PointRank;threshold:number;remaining:number}|null;
};

// ポイント FR-07: 残高の累計ではなく、現在の1レベル分に対する進捗を返す。
export function pointRankProgress(balance:number):PointRankProgress{
 const current=pointRankFromBalance(balance);
 if(current.tier==='sapphire')return {current,next:null,levelStart:POINT_RANK_TIER_SPAN*4,target:null,earned:0,remaining:0,percent:100,nextTier:null};
 const levelStart=Math.floor(balance/POINT_RANK_LEVEL_SPAN)*POINT_RANK_LEVEL_SPAN,target=levelStart+POINT_RANK_LEVEL_SPAN;
 const tierTarget=(Math.floor(balance/POINT_RANK_TIER_SPAN)+1)*POINT_RANK_TIER_SPAN;
 const earned=balance-levelStart;
 return {
  current,next:pointRankFromBalance(target),levelStart,target,earned,remaining:target-balance,percent:earned/POINT_RANK_LEVEL_SPAN*100,
  nextTier:{rank:pointRankFromBalance(tierTarget),threshold:tierTarget,remaining:tierTarget-balance},
 };
}

// Display values mirror the fixed award rules enforced by the database.
export const POST_POINT_REWARDS={post:100,photo:10,maxPhotos:5,tackle:10,memo:50,memoMinCharacters:100} as const;
export const MAX_POST_POINTS=POST_POINT_REWARDS.post+POST_POINT_REWARDS.photo*POST_POINT_REWARDS.maxPhotos+POST_POINT_REWARDS.tackle+POST_POINT_REWARDS.memo;

// ポイント FR-08: 付与済みの記録の編集ではなく、新しい記録で到達する件数の目安。
export function pointEarningAdvice(pointsNeeded:number){
 if(!Number.isSafeInteger(pointsNeeded)||pointsNeeded<0)throw new Error('Points needed must be a non-negative safe integer');
 return {standardPosts:Math.ceil(pointsNeeded/POST_POINT_REWARDS.post),completePosts:Math.ceil(pointsNeeded/MAX_POST_POINTS)};
}
