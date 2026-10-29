import {test} from 'node:test';
import assert from 'node:assert/strict';
import {coachRankForLessons,coachRankRates,priceRankedPlan} from '../src/lib/coach-ranks';
import {createDemoData,completeDemoLesson} from '../src/lib/demo-data';

test('コーチランク FR-02: 完了確認の累計件数からランクを判定し、2時間料金と取り分を対応させる',()=>{
 for(const [count,rank] of [[0,'bronze'],[9,'bronze'],[10,'silver'],[29,'silver'],[30,'gold'],[99,'gold'],[100,'platinum'],[1000,'platinum']] as const)
  assert.equal(coachRankForLessons(count),rank);
 assert.deepEqual(Object.values(coachRankRates).map(rate=>[rate.label,rate.priceYen,rate.coachPayoutYen]),[
  ['プラチナ',7000,5000],['ゴールド',5000,4000],['シルバー',4000,3000],['ブロンズ',3000,2000],
 ]);
 for(const count of [-1,0.5,NaN,Infinity,Number.MAX_SAFE_INTEGER+1])assert.throws(()=>coachRankForLessons(count));
 assert.equal(priceRankedPlan({duration_minutes:120,price_yen:9999},'gold').price_yen,5000);
 assert.equal(priceRankedPlan({duration_minutes:30,price_yen:0},'gold').price_yen,0);
 assert.equal(priceRankedPlan({duration_minutes:180,price_yen:9000},'gold').price_yen,9000);
 assert.equal(priceRankedPlan({duration_minutes:120,price_yen:6000},null).price_yen,6000);
});

test('コーチランク FR-02: テスト画面に4ランクの公開コーチと各2時間プラン、審査待ちの非公開例を用意する',()=>{
 const data=createDemoData('2026-10-28'),coaches=data.coaches.filter(coach=>coach.status==='approved');
 assert.deepEqual(coaches.map(coach=>coach.rankInfo?.rank),['platinum','gold','silver','bronze']);
 for(const coach of coaches){
  assert.equal(coachRankForLessons(coach.rankInfo!.completedLessons),coach.rankInfo!.rank);
  const plan=data.plans.find(plan=>plan.coach_id===coach.user_id&&plan.is_active&&plan.duration_minutes===120);
  assert(plan);assert.equal(plan.price_yen,coachRankRates[coach.rankInfo!.rank].priceYen);
 }
 assert(data.coaches.some(coach=>coach.status==='pending'&&!coach.rankInfo));
});

test('コーチランク FR-02: テスト画面で完了確認を試すと9件から10件へ昇格し、過去の相談料金は保持する',()=>{
 const data=createDemoData('2026-10-28'),request=data.requests.find(request=>request.status==='accepted')!;
 request.preferred_date='2026-10-28';
 const next=completeDemoLesson(data,request.id,'2026-10-28');
 assert.equal(next.coaches.find(coach=>coach.user_id===request.coach_id)?.rankInfo?.rank,'silver');
 assert.equal(next.coaches.find(coach=>coach.user_id===request.coach_id)?.rankInfo?.completedLessons,10);
 assert.equal(next.plans.find(plan=>plan.id===request.plan_id)?.price_yen,4000);
 assert.equal(next.requests.find(item=>item.id===request.id)?.price_yen,3000);
 assert.equal(next.requests.find(item=>item.id===request.id)?.compensation?.coach_payout_yen,2000);
 assert.equal(data.coaches.find(coach=>coach.user_id===request.coach_id)?.rankInfo?.completedLessons,9);
 assert.deepEqual(completeDemoLesson(next,request.id,'2026-10-28'),next);
 const future=createDemoData('2026-10-28');future.requests.find(item=>item.status==='accepted')!.preferred_date='2026-10-29';
 assert.throws(()=>completeDemoLesson(future,request.id,'2026-10-28'));
 const other=structuredClone(data);other.viewerId=other.coaches[0].user_id;
 assert.throws(()=>completeDemoLesson(other,request.id,'2026-10-28'));
});
