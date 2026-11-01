import {test} from 'node:test';
import assert from 'node:assert/strict';
import {pointRankProgress,pointRankGuide,pointEarningAdvice} from '../src/lib/point-progress';
import {pointRankFromBalance} from '../src/lib/points';

test('ポイント FR-07: 現在レベルの進捗と次のレベル・階級までの残りを算出する',()=>{
 assert.deepEqual(pointRankProgress(5250),{
  current:{tier:'silver',level:1,label:'シルバーLv1'},
  next:{tier:'silver',level:2,label:'シルバーLv2'},
  levelStart:5000,target:6000,earned:250,remaining:750,percent:25,
  nextTier:{rank:{tier:'gold',level:1,label:'ゴールドLv1'},threshold:10000,remaining:4750},
 });
});

test('ポイント FR-07: レベル・階級の境界で進捗を切り替え、0ptと残り1ptを区別する',()=>{
 for(const [balance,remaining,percent,next] of [
  [0,1000,0,'ブロンズLv2'],[999,1,99.9,'ブロンズLv2'],[1000,1000,0,'ブロンズLv3'],
  [4999,1,99.9,'シルバーLv1'],[5000,1000,0,'シルバーLv2'],
  [9999,1,99.9,'ゴールドLv1'],[14999,1,99.9,'プラチナLv1'],[19999,1,99.9,'サファイア'],
 ] as const){
  const progress=pointRankProgress(balance);
  assert.equal(progress.remaining,remaining);
  assert.equal(progress.percent,percent);
  assert.equal(progress.next?.label,next);
  assert(progress.nextTier);
  assert.equal(progress.nextTier.threshold-balance,progress.nextTier.remaining);
 }
});

test('ポイント FR-07: サファイアでは最高ランクとし、次の目標や残りポイントを作らない',()=>{
 for(const balance of [20000,25000,2147483647]){
  const progress=pointRankProgress(balance);
  assert.equal(progress.current.tier,'sapphire');
  assert.equal(progress.next,null);
  assert.equal(progress.target,null);
  assert.equal(progress.nextTier,null);
  assert.equal(progress.remaining,0);
  assert.equal(progress.percent,100);
 }
 for(const balance of [-1,1.5,NaN,Infinity])assert.throws(()=>pointRankProgress(balance));
});

test('ポイント FR-06: 全5階級の説明範囲が既存のランク判定と一致する',()=>{
 assert.equal(pointRankGuide.length,5);
 for(const row of pointRankGuide){
  assert.equal(pointRankFromBalance(row.min).tier,row.tier);
  if(row.max!==null)assert.equal(pointRankFromBalance(row.max).tier,row.tier);
 }
 assert.equal(pointRankGuide.at(-1)?.max,null);
});

test('ポイント FR-08: 投稿100ptと全条件を満たす210ptから、到達までの投稿数を切り上げる',()=>{
 for(const [remaining,standardPosts,completePosts] of [[0,0,0],[1,1,1],[100,1,1],[210,3,1],[211,3,2],[750,8,4],[1000,10,5]])
  assert.deepEqual(pointEarningAdvice(remaining),{standardPosts,completePosts});
 for(const value of [-1,1.5,NaN,Infinity])assert.throws(()=>pointEarningAdvice(value));
});
