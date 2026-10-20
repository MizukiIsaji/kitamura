import {test} from 'node:test';
import assert from 'node:assert/strict';
import {facilitySchema} from '../src/lib/validation';

const valid={kind:'shop',name:'つり具の店 多治見店',description:'釣り糸・ルアー・レンタル用品を扱う地域の釣具店です。',prefecture:'岐阜県',municipality:'多治見市',address:'',phone:'',business_hours:'',price_info:'',is_published:true};

test('facilitySchema: 名称・紹介文・都道府県があれば登録できる',()=>{
 assert(facilitySchema.safeParse(valid).success);
});

test('facilitySchema: 名称・紹介文・都道府県のいずれかが空だと拒否される',()=>{
 assert(!facilitySchema.safeParse({...valid,name:''}).success);
 assert(!facilitySchema.safeParse({...valid,description:''}).success);
 assert(!facilitySchema.safeParse({...valid,prefecture:''}).success);
});
