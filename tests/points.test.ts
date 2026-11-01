import {test} from 'node:test';import assert from 'node:assert/strict';
import {pointBalanceFromQuery,formatPoints,pointsRankingFromQuery,pointRankFromBalance,pointRankFromTierLevel} from '../src/lib/points';
const userId='11111111-1111-4111-8111-111111111111';
test('ポイント FR-01: 本人の0ポイントを正常な残高として表示できる',()=>{
 assert.deepEqual(pointBalanceFromQuery(userId,{data:{user_id:userId,balance:0},error:null}),{status:'ready',balance:0});
});
test('ポイント FR-01: 本人の整数残高を保持し、別会員・欠損・不正値を表示しない',()=>{
 for(const balance of [1250,2147483647])assert.deepEqual(pointBalanceFromQuery(userId,{data:{user_id:userId,balance},error:null}),{status:'ready',balance});
 for(const data of [null,{}, {user_id:'other-user',balance:100}, ...[-1,1.5,2147483648,NaN,Infinity,'100',null].map(balance=>({user_id:userId,balance}))])assert.deepEqual(pointBalanceFromQuery(userId,{data,error:null}),{status:'unavailable'});
});
test('ポイント FR-01: DB未設定と通信エラーを0ポイントと区別する',()=>{
 for(const code of ['42P01','PGRST205'])assert.deepEqual(pointBalanceFromQuery(userId,{data:null,error:{code}}),{status:'setup-required'});
 for(const code of ['42501','503','unavailable'])assert.deepEqual(pointBalanceFromQuery(userId,{data:{user_id:userId,balance:0},error:{code}}),{status:'unavailable'});
});
test('ポイント FR-01: 残高を桁区切りの表示用文字列にする',()=>{
 assert.equal(formatPoints(0),'0');
 assert.equal(formatPoints(1250),'1,250');
 assert.equal(formatPoints(2147483647),'2,147,483,647');
});
test('ポイントランキング: 正常な上位一覧をready、参加者0人をempty、不正応答をunavailableとして区別する',()=>{
 const top=[{display_name:'釣り人A',handle:'angler_a',amount:500,rank:1}];
 assert.deepEqual(pointsRankingFromQuery({data:{top,self:null},error:null}),{status:'ready',top,self:null});
 assert.deepEqual(pointsRankingFromQuery({data:{top,self:{amount:100,rank:3}},error:null}),{status:'ready',top,self:{amount:100,rank:3}});
 assert.deepEqual(pointsRankingFromQuery({data:{top:[],self:null},error:null}),{status:'empty'});
 for(const data of [null,{},{top:[]},{top:null,self:null},{top:[{display_name:'x'}],self:null},{top:[],self:{amount:'1',rank:1}},{top:[],self:{amount:1,rank:0}}])
  assert.deepEqual(pointsRankingFromQuery({data,error:null}),{status:'unavailable'});
 assert.deepEqual(pointsRankingFromQuery({data:{top,self:null},error:{code:'42501'}}),{status:'unavailable'});
});
test('ポイントランク: 1000ptごとに1レベル上がり、ブロンズ〜プラチナを各Lv1〜5、20000pt以上をサファイアとする',()=>{
 const cases:[number,ReturnType<typeof pointRankFromBalance>][]=[
  [0,{tier:'bronze',level:1,label:'ブロンズLv1'}],
  [999,{tier:'bronze',level:1,label:'ブロンズLv1'}],
  [1000,{tier:'bronze',level:2,label:'ブロンズLv2'}],
  [4999,{tier:'bronze',level:5,label:'ブロンズLv5'}],
  [5000,{tier:'silver',level:1,label:'シルバーLv1'}],
  [5999,{tier:'silver',level:1,label:'シルバーLv1'}],
  [6000,{tier:'silver',level:2,label:'シルバーLv2'}],
  [9999,{tier:'silver',level:5,label:'シルバーLv5'}],
  [10000,{tier:'gold',level:1,label:'ゴールドLv1'}],
  [14999,{tier:'gold',level:5,label:'ゴールドLv5'}],
  [15000,{tier:'platinum',level:1,label:'プラチナLv1'}],
  [19999,{tier:'platinum',level:5,label:'プラチナLv5'}],
  [20000,{tier:'sapphire',level:null,label:'サファイア'}],
  [25000,{tier:'sapphire',level:null,label:'サファイア'}],
 ];
 for(const [balance,expected] of cases)assert.deepEqual(pointRankFromBalance(balance),expected);
});
test('ポイントランク: 負数・非整数を拒否する',()=>{
 for(const balance of [-1,1.5,NaN])assert.throws(()=>pointRankFromBalance(balance));
});
test('ポイントランク: DB関数の応答（階級・Lvのみ、残高は含まない）を安全に解析する',()=>{
 assert.deepEqual(pointRankFromTierLevel({tier:'bronze',level:1}),{tier:'bronze',level:1,label:'ブロンズLv1'});
 assert.deepEqual(pointRankFromTierLevel({tier:'silver',level:2}),{tier:'silver',level:2,label:'シルバーLv2'});
 assert.deepEqual(pointRankFromTierLevel({tier:'sapphire',level:null}),{tier:'sapphire',level:null,label:'サファイア'});
 for(const value of [null,{},{tier:'unknown',level:1},{tier:'bronze',level:0},{tier:'bronze',level:6},{tier:'bronze',level:null},{tier:'sapphire',level:1},{tier:'bronze',level:'1'}])
  assert.equal(pointRankFromTierLevel(value),null);
});
