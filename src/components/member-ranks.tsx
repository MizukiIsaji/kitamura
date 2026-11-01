import type {CoachRankInfo} from '@/lib/coach-ranks';
import type {PointRank} from '@/lib/points';
import {CoachRankBadge} from './coach-rank';
import {PointRankBadge} from './point-rank';

export function MemberRanks({coachRank,pointRank,isCoach=false}:{coachRank?:CoachRankInfo|null;pointRank?:PointRank|null;isCoach?:boolean}){
 if(!isCoach&&!coachRank&&!pointRank)return null;
 return <span className="member-ranks" aria-label="ランク">{(isCoach||coachRank)&&<CoachRankBadge info={coachRank}/>} {pointRank&&<PointRankBadge rank={pointRank}/>}</span>;
}
