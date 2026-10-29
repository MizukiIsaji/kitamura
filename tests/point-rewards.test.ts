import {test} from 'node:test';
import assert from 'node:assert/strict';
import {postSchema} from '../src/lib/validation';
import {japanDate} from '../src/lib/domain';
import {savePhotoBatch} from '../src/lib/post-photos';
import {pointHistoryFromQuery,pointHistoryPage,registrationRewardCampaignFromQuery} from '../src/lib/points';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {PointHistoryList} from '../src/components/point-history';
import {PointRewardRules} from '../src/components/point-reward-rules';

test('ポイント FR-03, FR-04: 登録特典期間・履歴のページ送りと増減を日本時間で案内する',()=>{
 const campaign={starts_at:null,ends_at:'2027-03-30T15:00:00Z',amount:5000 as const};
 assert.deepEqual(registrationRewardCampaignFromQuery({data:campaign,error:null}),campaign);
 for(const data of [null,{}, {...campaign,amount:1000},{...campaign,starts_at:'bad'},{...campaign,starts_at:campaign.ends_at}])assert.equal(registrationRewardCampaignFromQuery({data,error:null}),null);
 for(const input of [undefined,[],['2'],'0','-1','1.5','999999999999','bad'])assert.equal(pointHistoryPage(input),1);
 assert.equal(pointHistoryPage('2'),2);
 const html=renderToStaticMarkup(React.createElement(PointHistoryList,{state:{status:'ready',hasNext:true,entries:[{id:'id',user_id:'user',kind:'post_reversal',amount:-210,occurred_at:'2026-10-24T15:01:00Z'}]},page:2}));
 for(const expected of ['取り消し','-210','2026/10/25','href="/points"','page=3'])assert(html.includes(expected),expected);
 const empty=renderToStaticMarkup(React.createElement(PointHistoryList,{state:{status:'ready',entries:[],hasNext:false}}));assert(empty.includes('まだありません'));
 const failed=renderToStaticMarkup(React.createElement(PointHistoryList,{state:{status:'unavailable'}}));assert(failed.includes('取得できません'));assert(!failed.includes('まだありません'));
 const rules=renderToStaticMarkup(React.createElement(PointRewardRules,{campaign}));for(const expected of ['5,000pt','100pt','10pt','50pt','2027年3月31日','より前'])assert(rules.includes(expected),expected);
});

test('ポイント FR-04: 履歴の空・未設定・失敗を区別し、別会員や不正な履歴を表示しない',()=>{
 const parse=pointHistoryFromQuery;
 const user='11111111-1111-4111-8111-111111111111';
 const row={id:'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',user_id:user,kind:'signup',amount:5000,occurred_at:'2026-10-25T00:00:00Z'};
 assert.deepEqual(parse(user,{data:[],error:null}),{status:'ready',entries:[],hasNext:false});
 assert.deepEqual(parse(user,{data:[row],error:null}),{status:'ready',entries:[row],hasNext:false});
 for(const data of [null,[{...row,user_id:'other'}],[{...row,amount:-5000}],[{...row,kind:'unknown'}],[{...row,occurred_at:'bad'}]])assert.deepEqual(parse(user,{data,error:null}),{status:'unavailable'});
 assert.deepEqual(parse(user,{data:[],error:{code:'PGRST205'}}),{status:'setup-required'});
 assert.deepEqual(parse(user,{data:[],error:{code:'503'}}),{status:'unavailable'});
 assert.equal((parse(user,{data:Array.from({length:21},()=>row),error:null}) as {hasNext:boolean}).hasNext,true);
});

test('ポイント FR-02: 写真の有無によらず保存の最後に付与を確定し、失敗時は片付ける',async()=>{
 for(const paths of [[],['one','two']]){
  const events:string[]=[];
  const store={upload:async(path:string)=>{events.push('upload:'+path);},link:async()=>{events.push('link');},remove:async()=>{events.push('remove');},deletePost:async()=>{events.push('delete');},finalize:async()=>{events.push('finalize');throw Error('award failed');}};
  assert.equal((await savePhotoBatch(paths,store)).ok,false);
  assert.deepEqual(events,paths.length?['upload:one','upload:two','link','finalize','remove','delete']:['finalize','delete']);
 }
});

test('ポイント FR-02: メモを任意にし、上限3,000文字は維持する',()=>{
 const input={title:'釣行',species:'',size_cm:'',category:'trout',fished_on:japanDate(),area:'岐阜県',rod:'',reel:'',lure:'',is_public:false};
 for(const memo of ['', '  \n　', 'あ'.repeat(3000)])assert(postSchema.safeParse({...input,memo}).success);
 assert(!postSchema.safeParse({...input,memo:'あ'.repeat(3001)}).success);
});
