import {test} from 'node:test';
import assert from 'node:assert/strict';
import {activeNavigationHref} from '../src/lib/navigation';
test('共通ナビ FR-01: 記録作成と釣果詳細の現在地を区別し、似た名前の経路を誤選択しない',()=>{
 assert.equal(activeNavigationHref('/'),'/');
 assert.equal(activeNavigationHref('/posts/new'),'/posts/new');
 assert.equal(activeNavigationHref('/posts/aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'),'/posts');
 assert.equal(activeNavigationHref('/requests'),'/requests');
 assert.equal(activeNavigationHref('/posts-other'),undefined);
});
test('共通ナビ FR-01.5: ポイント画面を現在地として示し、似た経路と混同しない',()=>{
 assert.equal(activeNavigationHref('/points'),'/points');
 assert.equal(activeNavigationHref('/points-other'),undefined);
});
