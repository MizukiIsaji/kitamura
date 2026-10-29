export type CoachRank='platinum'|'gold'|'silver'|'bronze';
export type CoachRankInfo={rank:CoachRank;completedLessons:number};
export const coachRankRates:Record<CoachRank,{label:string;minLessons:number;priceYen:number;coachPayoutYen:number}>={
 platinum:{label:'プラチナ',minLessons:100,priceYen:7000,coachPayoutYen:5000},
 gold:{label:'ゴールド',minLessons:30,priceYen:5000,coachPayoutYen:4000},
 silver:{label:'シルバー',minLessons:10,priceYen:4000,coachPayoutYen:3000},
 bronze:{label:'ブロンズ',minLessons:0,priceYen:3000,coachPayoutYen:2000},
};
// コーチ一覧 FR-02: 受講者が完了確認した累計件数だけを対象とする。
export function coachRankForLessons(count:number):CoachRank{
 if(!Number.isSafeInteger(count)||count<0)throw new Error('Completed lessons must be a non-negative integer');
 return (Object.keys(coachRankRates) as CoachRank[]).find(rank=>count>=coachRankRates[rank].minLessons)!;
}
// 2時間以外の既存プランと、ランク機能未設定時の料金を保持する。
export function priceRankedPlan<T extends {duration_minutes:number;price_yen:number}>(plan:T,rank:CoachRank|null):T{
 return rank&&plan.duration_minutes===120?{...plan,price_yen:coachRankRates[rank].priceYen}:plan;
}
