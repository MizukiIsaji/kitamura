import {test} from 'node:test';
import assert from 'node:assert/strict';
import {postSchema} from '../src/lib/validation';
import {japanDate} from '../src/lib/domain';
const options=['ジギング','オフショアルアー','ショアルアー','ライトゲーム','エギング・イカ釣り','タイラバ・テンヤ','ウキ釣り・フカセ釣り','サビキ釣り','投げ釣り','底物・ぶっ込み','胴付き・ヘチ釣り','泳がせ・ノマセ','船釣り（餌）','その他の釣り'];
const valid={title:'釣行',species:'アジ',size_cm:'',category:'sea',fished_on:japanDate(),area:'神奈川県',rod:'',reel:'',lure:'',memo:'釣行メモ',is_public:true};
test('釣果登録 FR-01: 釣り方の入力なしで14種類のルアー・仕掛けと未選択を保存できる',()=>{
 for(const lure of ['',...options])assert.equal(postSchema.safeParse({...valid,lure}).success,true,lure);
});
test('釣果登録 FR-01: 選択肢外のルアー・仕掛けを新規保存せず、廃止した釣り方は受け付けない',()=>{
 assert.equal(postSchema.safeParse({...valid,method:'',lure:'自由入力ルアー'}).success,false);
 const parsed=postSchema.parse({...valid,method:'書き換えを試みる',lure:options[0]});
 assert.equal('method' in parsed,false);
});
