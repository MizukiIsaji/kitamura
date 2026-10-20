import {test} from 'node:test';
import assert from 'node:assert/strict';
import * as address from '../src/lib/address-location';
import {makeMapEntries,getMapViewport,mapScreenPoint} from '../src/lib/fishing-map';
import {mapLocalMarkers} from '../src/lib/local-map';
import {facilityLocality} from '../src/lib/localities';

const facility={id:'first',kind:'shop' as const,name:'[テスト] 施設',description:'テスト',prefecture:'岐阜県',municipality:'岐阜市',address:'岐阜県岐阜市司町40-1',phone:'',business_hours:'',price_info:'',is_published:true};

test('住所ピン FR-04.8: 施設の番地付き住所を都道府県・市区町村付きで照合し、異なる市には配置しない',async()=>{
 const locate=Reflect.get(address,'locateFacilityAddress') as undefined|((facility:{prefecture:string;municipality:string;address:string},normalize:(input:string)=>Promise<unknown>)=>Promise<unknown>);
 assert(locate,'住所から位置を照合する関数が必要');
 const calls:string[]=[];
 const result=await locate({prefecture:'岐阜県',municipality:'岐阜市',address:'司町４０－１'},async input=>{calls.push(input);return {pref:'岐阜県',city:'岐阜市',town:'司町',level:8,point:{lat:35.4233,lng:136.7607,level:8}};});
 assert.deepEqual(calls,['岐阜県岐阜市司町40-1']);
 assert.deepEqual(result,{latitude:35.4233,longitude:136.7607,accuracy:'address'});
 assert.equal(await locate({prefecture:'岐阜県',municipality:'岐阜市',address:'岐阜県高山市花岡町2-18'},async()=>{throw Error('呼び出してはいけない');}),undefined);
});

test('住所ピン FR-04.8: 町丁目精度を区別し、市区町村だけ・異なる市・無効な座標・通信失敗は代表位置に戻す',async()=>{
 const base={pref:'岐阜県',city:'岐阜市',town:'司町',point:{lat:35.42,lng:136.76,level:3}};
 assert.deepEqual(await address.locateFacilityAddress(facility,async()=>base),{latitude:35.42,longitude:136.76,accuracy:'town'});
 for(const result of [{...base,point:{...base.point,level:2}},{...base,city:'高山市'},{...base,pref:'愛知県'},{...base,point:{...base.point,lat:NaN}},{...base,point:{...base.point,lng:180}},{...base,town:''}])assert.equal(await address.locateFacilityAddress(facility,async()=>result),undefined);
 assert.equal(await address.locateFacilityAddress(facility,async()=>{throw Error('NETWORK_ERROR');}),undefined);
 assert.equal(await address.locateFacilityAddress({...facility,address:''},async()=>{throw Error('呼び出してはいけない');}),undefined);
});

test('住所ピン FR-04.8: 現在の住所に一致する取得結果だけを施設へ反映し、住所変更前の結果や釣果に流用しない',()=>{
 const apply=Reflect.get(address,'applyFacilityLocations') as undefined|((entries:ReturnType<typeof makeMapEntries>,locations:unknown[])=>ReturnType<typeof makeMapEntries>);
 assert(apply,'住所変更前の応答を除外して位置を反映する関数が必要');
 const entries=makeMapEntries([],[],[facility]);
 const addressKey=address.facilityAddressKey(facility)!;
 const location={latitude:35.42,longitude:136.76,accuracy:'address'};
 const located=apply(entries,[{id:'facility-first',addressKey,location}]);
 assert.deepEqual(located[0].coordinates,{latitude:35.42,longitude:136.76});
 assert.equal(located[0].locationAccuracy,'address');
 assert.equal(apply(entries,[{id:'facility-first',addressKey:addressKey+'別住所',location}])[0].coordinates,undefined);
 assert.equal(apply(entries,[{id:'catch-first',addressKey,location}])[0].coordinates,undefined);
 assert.equal(apply(entries,[{id:'facility-first',addressKey,location:{...location,latitude:NaN}}])[0].coordinates,undefined);
 const city=facilityLocality(facility.prefecture,facility.municipality,facility.address)!;
 const pins=mapLocalMarkers(located,{prefecture:'岐阜県',municipality:city.id,frame:getMapViewport({prefecture:'岐阜県'})});
 assert.equal(pins[0].precision,'address');
});

test('住所ピン FR-04.8: 選択した市の公開施設だけを返し、同じ住所の照合を共有する',async()=>{
 const resolve=Reflect.get(address,'locateMunicipalityFacilities') as undefined|((rows:(typeof facility)[],municipalityId:string,locate:(row:typeof facility)=>Promise<address.AddressLocation|undefined>)=>Promise<address.FacilityLocation[]>);
 assert(resolve,'公開施設だけに限定する住所取得処理が必要');
 const city=facilityLocality(facility.prefecture,facility.municipality,facility.address)!;
 const rows=[facility,{...facility,id:'second',kind:'shop' as const},{...facility,id:'hidden',is_published:false},{...facility,id:'other-city',municipality:'高山市',address:'岐阜県高山市花岡町2-18'}];
 let calls=0;
 const locations=await resolve(rows,city.id,async()=>{calls++;return {latitude:35.42,longitude:136.76,accuracy:'address'};});
 assert.equal(calls,1);
 assert.deepEqual(locations.map(row=>row.id),['facility-first','facility-second']);
 assert.equal((await resolve(rows,'unknown',async()=>{throw Error('呼び出してはいけない');})).length,0);
});

test('住所ピン FR-04.8: 市区町村内では住所の位置へ寄り、近い番地の違いも見分けられる',()=>{
 const positions=[{latitude:35.426260386,longitude:136.760659004},{latitude:35.409547084,longitude:136.756337116}];
 const options={prefecture:'岐阜県',width:680,height:420,focus:positions,coordinates:positions,focusPadding:1};
 const frame=getMapViewport(options);
 const first=mapScreenPoint(positions[0],frame),second=mapScreenPoint(positions[1],frame);
 assert(Math.hypot(first.x-second.x,first.y-second.y)>60,'市内の住所差が見える範囲まで拡大する');
 for(const point of [first,second])assert(point.x>0&&point.x<680&&point.y>0&&point.y<420);
});
