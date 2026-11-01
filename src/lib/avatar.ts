export const AVATAR_BUCKET='profile-avatars';
export const MAX_AVATAR_BYTES=5*1024*1024;
export const DEFAULT_AVATAR_SRC='/images/default-avatar.svg';
const uuid=/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i;
export function avatarObjectPath(userId:string):string{
 if(!uuid.test(userId))throw new Error('Invalid avatar owner');
 return userId.toLowerCase()+'/avatar.webp';
}
export function avatarImageUrl(userId:string|undefined,projectUrl:string|undefined,revision=0):string|null{
 if(!userId||!uuid.test(userId)||!projectUrl)return null;
 try{
  const origin=new URL(projectUrl);
  if(origin.protocol!=='https:'&&!(origin.protocol==='http:'&&['localhost','127.0.0.1'].includes(origin.hostname)))return null;
  return origin.origin+'/storage/v1/object/public/'+AVATAR_BUCKET+'/'+avatarObjectPath(userId)+'?v='+(Number.isSafeInteger(revision)&&revision>=0?revision:0);
 }catch{return null;}
}
