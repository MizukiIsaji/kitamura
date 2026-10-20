import {test} from 'node:test';
import assert from 'node:assert/strict';
import * as locality from '../src/lib/localities';
import {makeMapEntries,filterMapEntries} from '../src/lib/fishing-map';

test('FR-04.7: 中濃など自動判定された県内エリア名でも検索できる',()=>{
 const facility={id:'a',kind:'shop' as const,name:'釣具店',description:'',prefecture:'岐阜県',municipality:'郡上市',address:'',phone:'',business_hours:'',price_info:'',is_published:true};
 const entries=makeMapEntries([],[],[facility]);
 assert.equal(filterMapEntries(entries,{q:'中濃'}).length,1);
 assert.equal(filterMapEntries(entries,{q:'東濃'}).length,0);
});

test('FR-04.4: 会員の居住地や県のない地名を推測に使わず、公開エリアの県境を越えて混同しない',()=>{
 assert.deepEqual(locality.localitiesFromArea('郡上市・多治見市'),{municipalityIds:[],localAreaIds:[]});
 const places=locality.localitiesFromArea('岐阜県 郡上市・高山市 / 愛知県 豊田市');
 assert.deepEqual(new Set(places.municipalityIds),new Set(['岐阜県/郡上市','岐阜県/高山市','愛知県/豊田市']));
 assert.deepEqual(new Set(places.localAreaIds),new Set(['gifu-chuno','gifu-hida']));
 assert.deepEqual(locality.localitiesFromArea('岐阜県 中濃'),{municipalityIds:[],localAreaIds:['gifu-chuno']});
 assert.equal(locality.facilityLocality('岐阜県','多治見市','郡上市八幡町')?.shortName,'多治見市','市区町村の明示入力を住所より優先する');
});

test('FR-04.1: 全国47都道府県の地域データは一意で有限の代表位置を持つ',()=>{
 assert.equal(new Set(locality.municipalities.map(p=>p.prefecture)).size,47);
 assert.equal(new Set(locality.municipalities.map(p=>p.id)).size,locality.municipalities.length);
 for(const city of locality.municipalities){assert(city.name&&city.shortName);assert(Number.isFinite(city.latitude)&&Number.isFinite(city.longitude));}
});

test('FR-04.4: 公開施設の住所から市区町村と県内エリアを割り当て、絞り込める',()=>{
 const base={kind:'shop' as const,name:'店舗',description:'',prefecture:'岐阜県',municipality:'',address:'郡上市八幡町島谷123',phone:'',business_hours:'',price_info:'',is_published:true};
 const entries=makeMapEntries([],[],[{...base,id:'a'},{...base,id:'private',is_published:false},{...base,id:'b',municipality:'多治見市',address:'本町1-1'},{...base,id:'unknown',address:'詳細非公開'}]);
 assert.deepEqual(Reflect.get(entries[0],'municipalityIds'),['岐阜県/郡上市']);
 assert.deepEqual(Reflect.get(entries[0],'localAreaIds'),['gifu-chuno']);
 assert.equal(entries.length,3);
 const filter=filterMapEntries as (items:typeof entries,options:Record<string,string>)=>typeof entries;
 assert.deepEqual(filter(entries,{prefecture:'岐阜県',localArea:'gifu-chuno'}).map(p=>p.id),['facility-a']);
 assert.deepEqual(filter(entries,{municipality:'岐阜県/多治見市'}).map(p=>p.id),['facility-b']);
 assert.deepEqual(Reflect.get(entries[2],'municipalityIds'),[]);
});

test('施設掲載 FR-02.5: 市区町村・住所を判定し、同名の町を県をまたいで混同しない',()=>{
 const resolve=Reflect.get(locality,'resolveMunicipality') as undefined|((prefecture:string,text:string)=>locality.Municipality|undefined);
 assert(resolve,'市区町村から地域を判定する必要がある');
 assert.equal(resolve('岐阜県','岐阜県 郡上市八幡町島谷123')?.shortName,'郡上市');
 assert.equal(resolve('岐阜県','不破郡 関ヶ原町')?.shortName,'関ケ原町');
 assert.equal(resolve('岐阜県','美濃加茂市本町')?.shortName,'美濃加茂市');
 assert.equal(resolve('岐阜県','加茂郡白川町')?.id,'岐阜県/加茂郡白川町');
 assert.equal(resolve('岐阜県','白川村')?.id,'岐阜県/大野郡白川村');
 assert.equal(resolve('岐阜県','愛知県名古屋市'),undefined);
 assert.equal(resolve('岐阜県','場所は非公開'),undefined);
 assert.equal(resolve('北海道','池田町')?.prefecture,'北海道');
 assert.equal(resolve('岐阜県','池田町')?.prefecture,'岐阜県');
 assert.equal(resolve('愛知県','名古屋市中区三の丸')?.name,'名古屋市');
});

test('FR-04.1: 岐阜県の42市町村を重複なく公式の5エリアに対応付ける',()=>{
 const areas=Reflect.get(locality,'localAreas') as {name:string;prefecture:string;municipalityIds:string[]}[]|undefined;
 assert(areas,'県内エリアの対応表が必要');
 const gifu=areas.filter(p=>p.prefecture==='岐阜県');
 assert.deepEqual(gifu.map(p=>p.name),['岐阜','西濃','中濃','東濃','飛騨']);
 const members=gifu.flatMap(p=>p.municipalityIds);
 assert.equal(members.length,42);assert.equal(new Set(members).size,42);
 assert(gifu.find(p=>p.name==='中濃')!.municipalityIds.includes('岐阜県/郡上市'));
 assert(gifu.find(p=>p.name==='東濃')!.municipalityIds.includes('岐阜県/多治見市'));
});
