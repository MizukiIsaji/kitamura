import {test} from 'node:test';
import assert from 'node:assert/strict';
import {makeMapEntries} from '../src/lib/fishing-map';

const facility={id:'shop',kind:'shop' as const,name:'施設名',description:'紹介文\n2行目',prefecture:'岐阜県',municipality:'岐阜市',address:'岐阜県岐阜市司町40-1',phone:'058-000-0000',business_hours:'9:00–18:00\n水曜定休',price_info:'利用案内',is_published:true};
test('詳細ポップアップ FR-03.3: 施設の紹介・住所・電話・営業時間・料金を別々の項目で表示できる',()=>{
 const [entry]=makeMapEntries([],[],[facility]);
 const details=Reflect.get(entry,'details');
 assert(details,'登録内容を項目ごとに表示する詳細が必要');
 assert.equal(details.description,facility.description);
 assert.deepEqual(details.fields,[{label:'住所',value:facility.address},{label:'電話番号',value:facility.phone},{label:'営業時間・定休日',value:facility.business_hours},{label:'料金・利用案内',value:facility.price_info}]);
 assert.equal(makeMapEntries([],[],[{...facility,is_published:false}]).length,0);
});

test('詳細ポップアップ FR-03.3: 承認済みコーチの紹介と公開プランだけを確認できる',()=>{
 const coach={user_id:'coach',status:'approved' as const,area:'岐阜県',category:'trout' as const,years_experience:10,profile:{display_name:'コーチ'},introduction:'コーチの紹介',plans:[{id:'plan',title:'体験',description:'プラン説明',price_yen:5000,duration_minutes:90,is_active:true},{id:'hidden-plan',title:'非公開プラン',description:'非公開の説明',price_yen:1000,duration_minutes:30,is_active:false}]};
 const [entry]=makeMapEntries([],[coach]);
 assert.equal(entry.details?.description,coach.introduction);
 assert(entry.details?.fields.some(field=>field.label==='釣り歴'&&field.value==='10年（自己申告）'));
 assert(entry.details?.fields.some(field=>field.label==='体験'&&field.value.includes('5,000')&&field.value.includes('90分')&&field.value.includes('プラン説明')));
 assert(!JSON.stringify(entry).includes('非公開の説明'));
 assert.equal(makeMapEntries([],[{...coach,status:'pending'}]).length,0);
});

test('詳細ポップアップ FR-03.3: 公開釣果はメモ・釣行日・魚種・サイズ・釣り方・道具を確認できる',()=>{
 const post={id:'post',title:'釣果',area:'岐阜県岐阜市',is_public:true,category:'trout' as const,species:'ニジマス',fished_on:'2026-10-19',size_cm:23.5,method:'ルアー',rod:'ロッド',reel:'リール',lure:'ルアー名',memo:'釣行の詳細\nメモ'};
 const [entry]=makeMapEntries([post],[]);
 assert.equal(entry.details?.description,post.memo);
 assert.deepEqual(entry.details?.fields,[{label:'釣行日',value:'2026.10.19'},{label:'魚種',value:'ニジマス'},{label:'サイズ',value:'23.5cm'},{label:'釣り方',value:'ルアー'},{label:'ロッド',value:'ロッド'},{label:'リール',value:'リール'},{label:'ルアー・餌',value:'ルアー名'}]);
 assert.equal(makeMapEntries([{...post,is_public:false}],[]).length,0);
});
