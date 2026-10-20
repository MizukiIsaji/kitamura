import {test} from 'node:test';
import assert from 'node:assert/strict';
import {consultationSchema} from '../src/lib/validation';
import {japanDate} from '../src/lib/domain';
import {consultationAreas,equipmentStatuses} from '../src/lib/consultation-options';

const input={plan_id:'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',client_token:'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',preferred_date:japanDate(),preferred_time:'morning',experience:'first',goal:'基本を学ぶ',message:'岐阜県郡上市の長良川周辺で相談したい',preferred_area:'岐阜県',equipment_status:'partial'};
test('相談 FR-01: 希望エリアと道具の有無を保存用の入力として保持する',()=>{
 const result=consultationSchema.parse(input);
 assert.equal((result as Record<string,unknown>).preferred_area,'岐阜県');
 assert.equal((result as Record<string,unknown>).equipment_status,'partial');
});
test('相談 FR-01: 全国47都道府県と道具3候補を受け付け、未選択・不正な候補・詳細未記入を拒否する',()=>{
 assert.equal(new Set(consultationAreas).size,47);
 for(const preferred_area of consultationAreas)for(const equipment_status of Object.keys(equipmentStatuses))assert(consultationSchema.safeParse({...input,preferred_area,equipment_status}).success);
 for(const preferred_area of ['',undefined,'海外','岐阜県郡上市'])assert(!consultationSchema.safeParse({...input,preferred_area}).success);
 for(const equipment_status of ['',undefined,'yes','unspecified'])assert(!consultationSchema.safeParse({...input,equipment_status}).success);
 for(const message of ['','  ','x'.repeat(2001)])assert(!consultationSchema.safeParse({...input,message}).success);
});
