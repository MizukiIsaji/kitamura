import {MAX_UPLOAD_PHOTO_BYTES,preparePhotoForm} from './post-photos';
async function encodeForUpload(file:File):Promise<Blob>{
 let image:ImageBitmap;
 try{image=await createImageBitmap(file);}catch{throw new Error('写真を読み込めませんでした。JPEG・PNG・WebPの別の写真でお試しください。');}
 try{
  if(!image.width||!image.height)throw new Error('写真のサイズを確認してください。');
  for(const bound of [1600,1280,1024]){
   const scale=Math.min(1,bound/Math.max(image.width,image.height));
   const canvas=document.createElement('canvas');canvas.width=Math.max(1,Math.round(image.width*scale));canvas.height=Math.max(1,Math.round(image.height*scale));
   const context=canvas.getContext('2d');if(!context)throw new Error('このブラウザーでは写真を準備できません。別のブラウザーでお試しください。');
   context.drawImage(image,0,0,canvas.width,canvas.height);
   for(const quality of [.82,.65,.45]){
    const blob=await new Promise<Blob|null>(resolve=>canvas.toBlob(resolve,'image/webp',quality));
    if(blob?.size&&blob.size<=MAX_UPLOAD_PHOTO_BYTES)return blob;
   }
  }
  throw new Error('写真の送信サイズを小さくできませんでした。別の写真でお試しください。');
 }finally{image.close();}
}
export const preparePostPhotoForm=(form:FormData)=>preparePhotoForm(form,encodeForUpload);
