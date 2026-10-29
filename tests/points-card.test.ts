import {test} from 'node:test';import assert from 'node:assert/strict';import React from 'react';import {renderToStaticMarkup} from 'react-dom/server';
import {PointBalanceCard} from '../src/components/point-balance-card';
test('ポイント FR-01: 残高は読み取り専用で表示し、未設定・取得失敗と区別する',()=>{
 for(const [balance,label] of [[0,'0'],[1250,'1,250']] as const){
  const html=renderToStaticMarkup(React.createElement(PointBalanceCard,{state:{status:'ready',balance},showDetails:false}));
  assert(html.includes('保有ポイント'));assert(html.includes('<strong>'+label+'</strong>'));assert(html.includes('pt'));assert(!/<(?:form|input|button)\b/.test(html));
 }
 for(const status of ['setup-required','unavailable'] as const){
  const html=renderToStaticMarkup(React.createElement(PointBalanceCard,{state:{status},showDetails:false}));
  assert(html.includes('role="status"'));assert(!html.includes('class="point-balance"'));assert(html.includes(status==='setup-required'?'準備中':'取得できませんでした'));
 }
});
