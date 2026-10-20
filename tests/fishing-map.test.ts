import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createDemoData} from '../src/lib/demo-data';
import {filterMapEntries,findPrefectures,groupMapEntries,makeMapEntries,mapKinds,prefectureBoundaries,prefectures,regionCounts,regions,type MapEntry} from '../src/lib/fishing-map';

function fixtures(){
 const data=createDemoData('2026-10-17');
 const coaches=data.coaches.map(c=>({...c,profile:data.profiles.find(p=>p.id===c.user_id)||null}));
 return {data,coaches,entries:makeMapEntries(data.posts,coaches)};
}
test('the map exposes public catches and approved coaches, without private records or pending applications',()=>{
 const {data,entries}=fixtures();
 assert.equal(entries.filter(e=>e.kind==='catch').length,12);
 assert.equal(entries.filter(e=>e.kind==='coach').length,3);
 for(const post of data.posts.filter(p=>!p.is_public))assert(!entries.some(e=>e.href==='/posts/'+post.id));
 for(const coach of data.coaches.filter(c=>c.status!=='approved'))assert(!entries.some(e=>e.href==='/anglers/'+coach.user_id));
 assert(entries.every(e=>!('memo' in e)&&!('user_id' in e)&&!('image_path' in e)));
});
test('only explicit prefectures place pins; a catch never inherits the author residence',()=>{
 const {data,coaches}=fixtures();
 assert.deepEqual(findPrefectures('神奈川県 湘南・三浦エリア').map(p=>p.name),['神奈川県']);
 assert.deepEqual(findPrefectures('東京都・千葉県のエリア').map(p=>p.name),['千葉県','東京都']);
 assert.equal(findPrefectures('関東の秘密の釣り場').length,0);
 const unknown=makeMapEntries([{...data.posts[0],area:'場所を公開しません'}],coaches)[0];
 assert.deepEqual(unknown.prefectures,[]);
 assert.equal(groupMapEntries([unknown]).length,0);
 assert.equal(filterMapEntries([unknown]).length,1,'unplaced records remain readable in the nationwide list');
 assert.equal(filterMapEntries([unknown],{region:'関東'}).length,0);
});
test('kind, region, prefecture and search filters intersect; a cross-prefecture coach stays one list item',()=>{
 const {entries}=fixtures();
 const matching=filterMapEntries(entries,{kind:'catch',region:'甲信越・北陸',prefecture:'長野県',q:'ニジマス'});
 assert.equal(matching.length,1);
 assert.equal(filterMapEntries(entries,{kind:'pond'}).length,0);
 assert.equal(filterMapEntries(entries,{kind:'coach',q:'存在しない人'}).length,0);
 const multi:MapEntry={id:'coach-multi',kind:'coach',title:'広域コーチ',area:'東京都・神奈川県',description:'複数県で活動',href:'/anglers/multi',prefectures:['東京都','神奈川県']};
 assert.equal(groupMapEntries([multi]).length,2);
 assert.equal(filterMapEntries([multi],{region:'関東'}).length,1);
});
test('all prefectures fit the illustration and Okinawa is in the southwest-islands inset',()=>{
 assert.equal(prefectures.length,47);
 assert.equal(new Set(prefectures.map(p=>p.name)).size,47);
 for(const p of prefectures){assert(p.x>0&&p.x<650,p.name);assert(p.y>0&&p.y<620,p.name);}
 const okinawa=prefectures.find(p=>p.name==='沖縄県')!;
 assert(okinawa.x>65&&okinawa.x<245&&okinawa.y>100&&okinawa.y<315);
});

test('mapKinds includes the tackle-shop kind alongside catch, coach, pond and spot',()=>{
 assert('shop' in mapKinds);
 assert.equal(mapKinds.shop.label,'釣具店');
});

test('makeMapEntries includes published facilities (pond, spot, shop) and excludes unpublished ones',()=>{
 const facilities=[
  {id:'f1',kind:'shop' as const,name:'多治見つり具店',description:'ルアー・エサを扱う釣具店です。',prefecture:'岐阜県',municipality:'多治見市',address:'多治見市本町1-1',phone:'0572-00-0000',business_hours:'9:00-18:00 水曜定休',price_info:'',is_published:true},
  {id:'f2',kind:'pond' as const,name:'恵那フィッシングエリア',description:'管理釣り場。初心者歓迎。',prefecture:'岐阜県',municipality:'恵那市',address:'',phone:'',business_hours:'',price_info:'入場無料',is_published:false},
 ];
 const entries=makeMapEntries([],[],facilities);
 assert.equal(entries.length,1);
 assert.equal(entries[0].kind,'shop');
 assert.equal(entries[0].title,'多治見つり具店');
 assert.deepEqual(entries[0].prefectures,['岐阜県']);
 assert.equal(entries[0].href,undefined);
 assert.match(entries[0].description,/多治見市本町1-1/);
 assert.match(entries[0].description,/0572-00-0000/);
 assert.match(entries[0].description,/9:00-18:00 水曜定休/);
});

test('regions are split into nine areas: Koshinetsu-Hokuriku and Tokai are separate, and Kinki is called Kansai',()=>{
 assert.deepEqual(regions, ['北海道','東北','関東','甲信越・北陸','東海','関西','中国','四国','九州・沖縄']);
 const byName=Object.fromEntries(prefectures.map(p=>[p.name,p.region]));
 assert.equal(byName['岐阜県'],'東海');assert.equal(byName['静岡県'],'東海');assert.equal(byName['愛知県'],'東海');assert.equal(byName['三重県'],'東海');
 assert.equal(byName['新潟県'],'甲信越・北陸');assert.equal(byName['富山県'],'甲信越・北陸');assert.equal(byName['石川県'],'甲信越・北陸');assert.equal(byName['福井県'],'甲信越・北陸');assert.equal(byName['山梨県'],'甲信越・北陸');assert.equal(byName['長野県'],'甲信越・北陸');
 assert.equal(byName['滋賀県'],'関西');assert.equal(byName['京都府'],'関西');assert.equal(byName['大阪府'],'関西');assert.equal(byName['兵庫県'],'関西');assert.equal(byName['奈良県'],'関西');assert.equal(byName['和歌山県'],'関西');
});

test('regionCounts sums entries per region, respecting an already-applied kind filter',()=>{
 const {entries}=fixtures();
 const counts=regionCounts(filterMapEntries(entries,{kind:'catch'}));
 assert.equal(counts['甲信越・北陸'],filterMapEntries(entries,{kind:'catch',region:'甲信越・北陸'}).length);
 assert.equal(counts['関東'],filterMapEntries(entries,{kind:'catch',region:'関東'}).length);
 const total=Object.values(counts).reduce((a,b)=>a+b,0);
 assert.equal(total,filterMapEntries(entries,{kind:'catch'}).filter(e=>e.prefectures.length).length);
});

test('prefectureBoundaries draws a deterministic, non-empty Voronoi outline confined to the mainland points (Okinawa excluded)',()=>{
 const path=prefectureBoundaries();
 assert.equal(typeof path,'string');
 assert(path.startsWith('M'),'renders at least one path segment');
 assert(path.length>500,'covers many cell edges for 46 mainland prefectures');
 assert.equal(path,prefectureBoundaries(),'deterministic for the same fixed prefecture points');
});
