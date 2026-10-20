import {test} from 'node:test';
import assert from 'node:assert/strict';
import * as seed from '../scripts/lib/nationwide-facilities';
import {facilitySchema,idSchema} from '../src/lib/validation';
import {makeMapEntries} from '../src/lib/fishing-map';
import {localAreas} from '../src/lib/localities';

test('全国施設テストデータ: 既存の施設と編集済みテスト施設を上書きせず、不足分だけを追加する',()=>{
 const plan=Reflect.get(seed,'planNationwideFacilities') as ((existing:{id:string;name:string;description:string}[])=>{missing:{id:string}[];existingCount:number})|undefined;
 const rows=Reflect.get(seed,'nationwideFacilities') as readonly {id:string;name:string;description:string}[]|undefined;
 assert(plan&&rows,'安全な投入計画を作成する関数と全国データが必要');
 const edited={...rows[0],name:'[テスト] 編集済み'};
 const real={id:'real',name:'既存の施設',description:'既存の説明'};
 const before=structuredClone([real,edited]);
 const result=plan(before);
 assert.equal(result.missing.length,152);
 assert.equal(result.existingCount,1);
 assert(!result.missing.some(row=>row.id===edited.id));
 assert.deepEqual(before,[real,edited]);
});

test('全国施設テストデータ: 全47都道府県・102市区町村に番地付き住所を持つ153件を用意する',()=>{
 const rows=seed.nationwideFacilities;
 assert.equal(rows.length,153);
 assert.equal(new Set(rows.map(row=>row.id)).size,153);
 assert.equal(new Set(rows.map(row=>row.prefecture)).size,47);
 assert.equal(new Set(rows.map(row=>row.prefecture+row.municipality)).size,102);
 for(const kind of ['shop','pond','spot'])assert.equal(rows.filter(row=>row.kind===kind).length,51);
 for(const row of rows){
  assert(idSchema.safeParse(row.id).success);
  assert(facilitySchema.safeParse(row).success);
  assert(row.name.startsWith('[テスト]'));
  assert(row.description.startsWith(seed.nationwideFixtureTag));
  assert(row.address.startsWith(row.prefecture));
  assert(/(?:\d+[-−－]\d+|\d+番(?:地)?|\d+号|丁目.*\d)/.test(row.address));
  assert.equal(row.phone,'');
  assert.equal(row.is_published,true);
 }
});

test('全国施設テストデータ: 全件が地図の市区町村に分類され、岐阜5エリアには各3件ある',()=>{
 const entries=makeMapEntries([],[],[...seed.nationwideFacilities]);
 assert.equal(entries.length,153);
 for(const entry of entries)assert.equal(entry.municipalityIds?.length,1);
 const gifu=localAreas.filter(area=>area.prefecture==='岐阜県');
 assert.equal(gifu.length,5);
 for(const area of gifu)assert.equal(entries.filter(entry=>entry.localAreaIds?.includes(area.id)).length,3);
});

test('全国施設テストデータ: 同じデータで再実行しても追加は0件になる',()=>{
 const result=seed.planNationwideFacilities(seed.nationwideFacilities);
 assert.equal(result.existingCount,153);
 assert.deepEqual(result.missing,[]);
});

test('全国施設テストデータ: 同一IDの実データを検出したら追加前に中止する',()=>{
 const row=seed.nationwideFacilities[0];
 assert.throws(()=>seed.planNationwideFacilities([{...row,name:'実在の施設'}]),/FIXTURE_ID_COLLISION/);
 assert.throws(()=>seed.planNationwideFacilities([{...row,description:'実際の説明'}]),/FIXTURE_ID_COLLISION/);
});
