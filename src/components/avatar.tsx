'use client';
import {useEffect,useRef,useState} from 'react';
import {avatarImageUrl,DEFAULT_AVATAR_SRC} from '@/lib/avatar';

export const AVATAR_UPDATED_EVENT='knots:avatar-updated';

export function Avatar({name,userId,size=''}:{name:string;userId?:string;size?:string}){
 const [revision,setRevision]=useState(0),[failedUrl,setFailedUrl]=useState<string|null>(null);
 const imgRef=useRef<HTMLImageElement>(null);
 useEffect(()=>{
  function updated(event:Event){if((event as CustomEvent<{userId:string}>).detail?.userId===userId)setRevision(Date.now());}
  window.addEventListener(AVATAR_UPDATED_EVENT,updated);
  return ()=>window.removeEventListener(AVATAR_UPDATED_EVENT,updated);
 },[userId]);
 const url=avatarImageUrl(userId,process.env.NEXT_PUBLIC_SUPABASE_URL,revision),source=url&&failedUrl!==url?url:DEFAULT_AVATAR_SRC;
 useEffect(()=>{
  // The image can fail to load before hydration attaches onError, which would otherwise be missed.
  const img=imgRef.current;
  if(url&&source===url&&img?.complete&&img.naturalWidth===0)setFailedUrl(url);
 },[url,source]);
 return <span className={'avatar '+size}><img ref={imgRef} src={source} alt={name+'のプロフィール画像'} loading="lazy" onError={()=>{if(url&&source!==DEFAULT_AVATAR_SRC)setFailedUrl(url);}}/></span>;
}
