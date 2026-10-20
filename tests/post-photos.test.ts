import {test} from 'node:test';
import assert from 'node:assert/strict';
import {validatePhotoFiles,preparePhotoForm,getPostPhotoPaths,savePhotoBatch,MAX_POST_PHOTOS,MAX_UPLOAD_PHOTO_BYTES} from '../src/lib/post-photos';
const file=(name='catch.jpg',type='image/jpeg',size=20)=>new File([new Uint8Array(size)],name,{type});
test('釣果写真 FR-02: 0〜5枚を受け付け、6枚・10MB超・画像以外を拒否する',()=>{
 assert.equal(MAX_POST_PHOTOS,5);
 assert.doesNotThrow(()=>validatePhotoFiles([]));
 assert.doesNotThrow(()=>validatePhotoFiles(Array.from({length:5},()=>file())));
 assert.throws(()=>validatePhotoFiles(Array.from({length:6},()=>file())),/5枚/);
 assert.throws(()=>validatePhotoFiles([file('large.jpg','image/jpeg',10*1024*1024+1)]),/10MB/);
 assert.throws(()=>validatePhotoFiles([file('x.svg','image/svg+xml')]),/JPEG/);
});
test('釣果写真 FR-02: 送信前の変換順と他の入力を保ち、各写真の送信サイズを制限する',async()=>{
 const form=new FormData();form.set('title','今日の釣果');form.append('photos',file('first.jpg'));form.append('photos',file('second.jpg'));
 const seen:string[]=[];
 const ready=await preparePhotoForm(form,async input=>{seen.push(input.name);return new Blob(['converted'],{type:'image/webp'});});
 assert.deepEqual(seen,['first.jpg','second.jpg']);
 assert.equal(ready.get('title'),'今日の釣果');assert.equal(ready.getAll('photos').length,2);
 assert(ready.getAll('photos').every(item=>item instanceof File&&item.type==='image/webp'));
 const large=new Blob([new Uint8Array(MAX_UPLOAD_PHOTO_BYTES+1)],{type:'image/webp'});
 await assert.rejects(()=>preparePhotoForm(form,async()=>large),/送信サイズ/);
});
test('釣果写真 FR-02: 空のファイル欄は任意の写真なしとして扱い、旧写真を引き継ぐ',async()=>{
 const form=new FormData();form.append('photos',new File([],''));
 const ready=await preparePhotoForm(form,async()=>{throw Error('not called');});assert.equal(ready.getAll('photos').length,0);
 assert.deepEqual(getPostPhotoPaths({image_path:'old.webp'}),['old.webp']);
 assert.deepEqual(getPostPhotoPaths({image_path:'old.webp',image_paths:['one.webp','two.webp']}),['one.webp','two.webp']);
});
function fakeStore(failAt?:string){
 const uploaded:string[]=[],removed:string[]=[],linked:string[][]=[];let deleted=0;
 return {uploaded,removed,linked,get deleted(){return deleted;},store:{
  upload:async(path:string)=>{if(path===failAt)throw Error('upload rejected');uploaded.push(path);},
  link:async(paths:string[])=>{if(failAt==='link')throw Error('metadata rejected');linked.push(paths);},
  remove:async(paths:string[])=>{removed.push(...paths);},deletePost:async()=>{deleted++;},
 }};
}
test('釣果写真 FR-02: 全写真の保存後に順番どおりひも付ける',async()=>{
 const fake=fakeStore();const result=await savePhotoBatch(['one','two'],fake.store);
 assert.equal(result.ok,true);assert.deepEqual(fake.linked,[['one','two']]);assert.equal(fake.deleted,0);
});
test('釣果写真 FR-02: 途中の写真保存やひも付けに失敗したら写真と作成途中の記録を片付ける',async()=>{
 for(const failure of ['two','link']){
  const fake=fakeStore(failure);const result=await savePhotoBatch(['one','two'],fake.store);
  assert.equal(result.ok,false);assert.deepEqual(fake.removed,fake.uploaded);assert.equal(fake.deleted,1);
 }
});
