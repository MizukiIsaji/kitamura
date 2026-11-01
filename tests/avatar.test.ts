import {test} from 'node:test';
import assert from 'node:assert/strict';
import sharp from 'sharp';
import {encodeAvatarFile} from '../src/lib/avatar-image';
import {MAX_AVATAR_BYTES,avatarObjectPath,avatarImageUrl} from '../src/lib/avatar';

test('プロフィール画像 FR-04: 中央を正方形に切り抜き、512pxのWebPへ変換して元の付加情報を除く',async()=>{
 const input=await sharp({create:{width:1200,height:600,channels:3,background:'#326781'}}).jpeg().withMetadata({orientation:1}).toBuffer();
 const file=new File([new Uint8Array(input)],'profile.jpg',{type:'image/jpeg'});
 const output=await encodeAvatarFile(file),metadata=await sharp(output).metadata();
 assert.equal(metadata.format,'webp');assert.equal(metadata.width,512);assert.equal(metadata.height,512);assert.equal(metadata.exif,undefined);
});

test('プロフィール画像 FR-04: 会員IDごとに保存先を固定し、外部URL・パスの差し替えを許さない',()=>{
 const id='11111111-1111-4111-8111-111111111111',other='22222222-2222-4222-8222-222222222222';
 assert.equal(avatarObjectPath(id),id+'/avatar.webp');
 assert.notEqual(avatarObjectPath(id),avatarObjectPath(other));
 for(const value of ['../other','https://example.com/x','',id+'/other'])assert.throws(()=>avatarObjectPath(value));
 assert.equal(avatarImageUrl(id,'https://test.supabase.co',123),'https://test.supabase.co/storage/v1/object/public/profile-avatars/'+id+'/avatar.webp?v=123');
 for(const value of [undefined,'','../other'])assert.equal(avatarImageUrl(value,'https://test.supabase.co'),null);
 assert.equal(avatarImageUrl(id,undefined),null);
 assert.equal(avatarImageUrl(id,'javascript:alert(1)'),null);
});

test('プロフィール画像 FR-04: 5MB超・空画像・非対応形式・画像に見せたSVGを保存前に拒否する',async()=>{
 const png=await sharp({create:{width:10,height:10,channels:3,background:'#336677'}}).png().toBuffer();
 await assert.rejects(()=>encodeAvatarFile({size:MAX_AVATAR_BYTES+1,type:'image/png',arrayBuffer:async()=>new Uint8Array(png).buffer}));
 await assert.rejects(()=>encodeAvatarFile(new File([],'empty.png',{type:'image/png'})));
 await assert.rejects(()=>encodeAvatarFile(new File([new Uint8Array(png)],'wrong.gif',{type:'image/gif'})));
 const svg='<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10"><rect width="10" height="10"/></svg>';
 await assert.rejects(()=>encodeAvatarFile(new File([svg],'disguised.png',{type:'image/png'})));
});
