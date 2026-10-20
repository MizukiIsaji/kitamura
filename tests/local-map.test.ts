import {test} from 'node:test';
import assert from 'node:assert/strict';
import * as localMap from '../src/lib/local-map';
import {getMapViewport,makeMapEntries,layoutMapMarkers,type MapMarker,type MapViewport} from '../src/lib/fishing-map';
import {municipalities,localAreas,localAreaForMunicipality} from '../src/lib/localities';
const facilities=[
 {id:'gujo',municipality:'郡上市',address:''},
 {id:'tajimi',municipality:'多治見市',address:''},
 {id:'unknown',municipality:'',address:''},
].map(p=>({...p,kind:'shop' as const,name:p.id,description:'',prefecture:'岐阜県',phone:'',business_hours:'',price_info:'',is_published:true}));
const entries=makeMapEntries([],[],facilities);
const populatedEntries=municipalities.map(city=>({id:city.id,kind:'shop' as const,title:city.name,area:city.prefecture,description:'',prefectures:[city.prefecture],municipalityIds:[city.id],localAreaIds:localAreaForMunicipality(city.id)?[localAreaForMunicipality(city.id)!.id]:[]}));

test('FR-04.3: 地図の市区町村選択肢も掲載ありに限定し、未指定を市区町村へ割り当てない',()=>{
 assert.deepEqual(localMap.municipalitiesWithEntries(entries,{prefecture:'岐阜県',localArea:'gifu-chuno'}).map(p=>p.shortName),['郡上市']);
 assert.deepEqual(localMap.municipalitiesWithEntries(entries,{prefecture:'愛知県'}),[]);
 assert.deepEqual(localMap.municipalitiesWithEntries([],{prefecture:'岐阜県'}),[]);
 assert.equal(localMap.municipalitiesWithEntries(entries,{prefecture:'岐阜県'}).length,2);
});

test('FR-04.5: 掲載0件の市区町村にはピンを表示しない',()=>{
 const frame=getMapViewport({prefecture:'岐阜県',focus:localMap.localMapFocus('gifu-chuno','岐阜県/関市')});
 const markers=localMap.mapLocalMarkers(entries,{prefecture:'岐阜県',localArea:'gifu-chuno',municipality:'岐阜県/関市',frame});
 assert.deepEqual(markers,[]);
});

test('FR-04.5: 市区町村内でも公開用座標のある掲載と代表位置の掲載を区別する',()=>{
 const source=facilities[0];
 const items=makeMapEntries([],[],[{...source,id:'exact',coordinates:{latitude:35.8,longitude:137.1}},{...source,id:'approximate'}]);
 const frame=getMapViewport({prefecture:'岐阜県',focus:localMap.localMapFocus('gifu-chuno','岐阜県/郡上市')});
 const markers=localMap.mapLocalMarkers(items,{prefecture:'岐阜県',localArea:'gifu-chuno',municipality:'岐阜県/郡上市',frame});
 assert.equal(markers.length,2);
 assert.equal(markers.find(p=>p.precision==='exact')?.entries[0].id,'facility-exact');
 assert.equal(markers.find(p=>p.precision==='municipality')?.entries[0].id,'facility-approximate');
});

test('FR-04.2: 中濃は掲載のある市町村だけを表示し、市区町村ではその掲載だけに絞る',()=>{
 const frame=getMapViewport({prefecture:'岐阜県',focus:localMap.localMapFocus('gifu-chuno','')});
 const markers=localMap.mapLocalMarkers(entries,{prefecture:'岐阜県',localArea:'gifu-chuno',frame});
 assert.equal(markers.length,1);
 assert.equal(markers.find(p=>p.label==='郡上市')?.entries.length,1);
 assert(!markers.some(p=>p.label==='関市'));
 assert(!markers.some(p=>p.label==='多治見市'));
 const cityMarkers=localMap.mapLocalMarkers(entries,{prefecture:'岐阜県',localArea:'gifu-chuno',municipality:'岐阜県/郡上市',frame});
 assert.equal(cityMarkers.length,1);assert.equal(cityMarkers[0].label,'郡上市');
 assert.deepEqual(cityMarkers[0].entries.map(p=>p.id),['facility-gujo']);
});

test('FR-04.3: 全県・岐阜5エリアの掲載ピンは狭い画面でも全ページで重ならない',()=>{
 const selections=[...new Set(municipalities.map(p=>p.prefecture))].map(prefecture=>({prefecture,localArea:''})).concat(localAreas.map(area=>({prefecture:area.prefecture,localArea:area.id})));
 for(const selection of selections){
  const frame=getMapViewport({...selection,width:254,height:310,focus:localMap.localMapFocus(selection.localArea,'')});
  const markers=localMap.mapLocalMarkers(populatedEntries,{...selection,frame});
  const {pageCount}=localMap.paginateLocalMarkers(markers,frame);
  let total=0;
  for(let page=0;page<pageCount;page++){
   const visible=localMap.paginateLocalMarkers(markers,frame,page).markers,placed=layoutMapMarkers(visible,frame);total+=visible.length;
   for(const p of placed)assert(p.x>=0&&p.y>=0&&p.x+p.width<=254&&p.y+p.height<=310);
   for(let i=0;i<placed.length;i++)for(let j=i+1;j<placed.length;j++){const a=placed[i],b=placed[j];assert(a.x+a.width+4<=b.x||b.x+b.width+4<=a.x||a.y+a.height+4<=b.y||b.y+b.height+4<=a.y);}
  }
  assert.equal(total,markers.length);
 }
});

test('FR-04.2: 岐阜県は0件を含む5エリアと未指定の掲載を表示する',()=>{
 const make=Reflect.get(localMap,'mapLocalMarkers') as undefined|((items:typeof entries,options:{prefecture:string;frame:MapViewport;localArea?:string;municipality?:string})=>MapMarker[]);
 assert(make,'県内エリアのピンが必要');
 const markers=make(entries,{prefecture:'岐阜県',frame:getMapViewport({prefecture:'岐阜県'})});
 assert.equal(markers.length,6);
 assert.equal(markers.find(p=>p.label==='中濃')?.entries.length,1);
 assert.equal(markers.find(p=>p.label==='東濃')?.entries.length,1);
 assert.equal(markers.find(p=>p.label==='飛騨')?.entries.length,0);
 assert.equal(markers.find(p=>p.id.startsWith('unplaced-'))?.entries[0].id,'facility-unknown');
});

test('FR-04.3: 多数の掲載済み市区町村をページに分けても欠落・重複させない',()=>{
 const paginate=Reflect.get(localMap,'paginateLocalMarkers') as undefined|((markers:MapMarker[],size:{width:number;height:number},page:number)=>{markers:MapMarker[];page:number;pageCount:number;total:number});
 assert(paginate,'表示できる数に合わせたページ分割が必要');
 const frame=getMapViewport({prefecture:'北海道',width:254,height:310});
 const markers=localMap.mapLocalMarkers(populatedEntries,{prefecture:'北海道',frame});
 assert(markers.length>100);
 const first=paginate(markers,frame,0),ids:string[]=[];
 assert(first.pageCount>1);
 for(let page=0;page<first.pageCount;page++)ids.push(...paginate(markers,frame,page).markers.map(p=>p.id));
 assert.deepEqual(ids,markers.map(p=>p.id));assert.equal(new Set(ids).size,markers.length);
 assert.equal(paginate(markers,frame,999).page,first.pageCount-1);
});
