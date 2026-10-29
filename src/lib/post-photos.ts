export const MAX_POST_PHOTOS=5;
export const MAX_SOURCE_PHOTO_BYTES=10*1024*1024;
// Five transformed files fit below Netlify's synchronous request payload limit.
export const MAX_UPLOAD_PHOTO_BYTES=700*1024;
const imageTypes=['image/jpeg','image/png','image/webp'];
export function validatePhotoFiles(files:readonly Pick<File,'size'|'type'>[]){
 if(files.length>MAX_POST_PHOTOS)throw new Error('写真は最大5枚まで選択してください。');
 if(files.some(file=>file.size>MAX_SOURCE_PHOTO_BYTES||!imageTypes.includes(file.type)))throw new Error('写真はJPEG・PNG・WebPの1枚10MB以内で選んでください。');
}
// 釣果写真 FR-02: validate the entire batch before transforming or saving anything.
export async function preparePhotoForm(form:FormData,encode:(file:File)=>Promise<Blob>){
 const files=form.getAll('photos').filter((item):item is File=>item instanceof File&&item.size>0);
 validatePhotoFiles(files);
 const converted:File[]=[];
 for(const [index,file] of files.entries()){
  const blob=await encode(file);
  if(!blob.size||blob.size>MAX_UPLOAD_PHOTO_BYTES||!imageTypes.includes(blob.type))throw new Error('写真の送信サイズを小さくできませんでした。別の写真でお試しください。');
  converted.push(new File([blob],`catch-${index+1}.${blob.type==='image/webp'?'webp':blob.type==='image/png'?'png':'jpg'}`,{type:blob.type}));
 }
 form.delete('photos');for(const photo of converted)form.append('photos',photo);
 return form;
}
export function getPostPhotoPaths(post:{image_path?:string|null;image_paths?:string[]|null}){
 return [...new Set(post.image_paths?.length?post.image_paths:post.image_path?[post.image_path]:[])];
}
type PhotoStore={upload:(path:string)=>Promise<void>;link:(paths:string[])=>Promise<void>;remove:(paths:string[])=>Promise<void>;deletePost:()=>Promise<void>;finalize?:()=>Promise<void>};
// 釣果写真 FR-02: every failed batch is rolled back, including metadata failures.
export async function savePhotoBatch(paths:string[],store:PhotoStore){
 const uploaded:string[]=[];
 try{
  for(const path of paths){await store.upload(path);uploaded.push(path);}
  if(paths.length)await store.link(paths);
  await store.finalize?.();
  return {ok:true,cleanupFailed:false};
 }catch{
  let cleanupFailed=false;
  if(uploaded.length)try{await store.remove(uploaded);}catch{cleanupFailed=true;}
  try{await store.deletePost();}catch{cleanupFailed=true;}
  return {ok:false,cleanupFailed};
 }
}
