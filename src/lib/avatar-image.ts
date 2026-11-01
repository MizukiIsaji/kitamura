import sharp from 'sharp';
import {MAX_AVATAR_BYTES} from './avatar';

export async function encodeAvatarFile(file:Pick<File,'size'|'type'|'arrayBuffer'>){
 if(file.size<=0||file.size>MAX_AVATAR_BYTES)throw new Error('プロフィール画像は5MB以下のファイルを選んでください。');
 if(!['image/jpeg','image/png','image/webp'].includes(file.type))throw new Error('JPEG・PNG・WebPの画像を選んでください。');
 const input=Buffer.from(await file.arrayBuffer());
 if(input.length>MAX_AVATAR_BYTES)throw new Error('プロフィール画像は5MB以下のファイルを選んでください。');
 const pipeline=sharp(input,{limitInputPixels:40000000,failOn:'warning'}),metadata=await pipeline.metadata();
 if(!metadata.format||!['jpeg','png','webp'].includes(metadata.format)||(metadata.pages??1)>1)throw new Error('JPEG・PNG・WebPの静止画像を選んでください。');
 return pipeline.rotate().resize(512,512,{fit:'cover',position:'centre'}).webp({quality:85}).toBuffer();
}
