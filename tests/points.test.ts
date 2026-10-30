import {test} from 'node:test';import assert from 'node:assert/strict';
import {pointBalanceFromQuery,formatPoints} from '../src/lib/points';
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
