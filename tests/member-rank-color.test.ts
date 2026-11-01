import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createDemoData} from '../src/lib/demo-data';
import {makeMapEntries} from '../src/lib/fishing-map';

test('会員名 FR-03: 地図の投稿とコーチ掲載に掲載者自身のポイントランクを渡す',()=>{
 const data=createDemoData('2026-11-01'),post=data.posts[0],coach=data.coaches[0];
 assert.equal(coach.rankInfo?.rank,'platinum');
 assert.equal(coach.pointRank?.tier,'bronze');
 const entries=makeMapEntries([post],[{...coach,profile:data.profiles.find(row=>row.id===coach.user_id)!}]);
 assert.deepEqual(entries.find(row=>row.kind==='catch')?.pointRank,post.pointRank);
 assert.deepEqual(entries.find(row=>row.kind==='coach')?.pointRank,coach.pointRank);
 const unknown=makeMapEntries([{...post,pointRank:null}],[]);
 assert.equal(unknown[0].pointRank,undefined);
});
