import {test} from 'node:test';
import assert from 'node:assert/strict';
import {summarizeNotification} from '@/lib/notifications';

test('通知 FR-02: 種別・相手の表示名から要約文を作る',()=>{
 assert.equal(summarizeNotification({kind:'new_consultation',counterpart_name:'釣り人A'}),'釣り人Aさんから新しい相談が届きました');
 assert.equal(summarizeNotification({kind:'accepted',counterpart_name:'コーチB'}),'コーチBさんが相談を承認しました');
 assert.equal(summarizeNotification({kind:'declined',counterpart_name:'コーチB'}),'コーチBさんが相談をお見送りしました');
 assert.equal(summarizeNotification({kind:'cancelled',counterpart_name:'釣り人A'}),'釣り人Aさんが相談を取り下げました');
});

test('通知 FR-02: 相手の表示名が無い場合は「相手」とする',()=>{
 assert.equal(summarizeNotification({kind:'accepted',counterpart_name:null}),'相手さんが相談を承認しました');
});
