'use client';

import {useActionState,useEffect,useRef,useState} from 'react';
import {useRouter} from 'next/navigation';
import {ImagePlus} from 'lucide-react';
import {updateAvatar,deleteAvatar} from '@/app/actions';
import {MAX_AVATAR_BYTES} from '@/lib/avatar';
import type {PointRankTier} from '@/lib/points';
import {Avatar,AVATAR_UPDATED_EVENT} from './avatar';

export function AvatarForm({userId,name,pointTier}:{userId:string;name:string;pointTier?:PointRankTier}){
 const [saved,saveAction,saving]=useActionState(updateAvatar,{}),[removed,removeAction,removing]=useActionState(deleteAvatar,{});
 const [preview,setPreview]=useState<string|null>(null),[fileError,setFileError]=useState(''),inputRef=useRef<HTMLInputElement>(null),router=useRouter();
 const busy=saving||removing;
 useEffect(()=>()=>{if(preview)URL.revokeObjectURL(preview);},[preview]);
 useEffect(()=>{if(saved.success){setPreview(null);if(inputRef.current)inputRef.current.value='';window.dispatchEvent(new CustomEvent(AVATAR_UPDATED_EVENT,{detail:{userId}}));router.refresh();}},[saved,userId,router]);
 useEffect(()=>{if(removed.success){setPreview(null);if(inputRef.current)inputRef.current.value='';window.dispatchEvent(new CustomEvent(AVATAR_UPDATED_EVENT,{detail:{userId}}));router.refresh();}},[removed,userId,router]);
 return <section className="panel avatar-settings member-surface" data-rank-theme={pointTier}>
  <h2>プロフィール画像</h2>
  <div className="avatar-settings-preview">{preview?<img src={preview} alt="選んだプロフィール画像のプレビュー"/>:<Avatar name={name} userId={userId} size="large"/>}<p>投稿・プロフィール・コーチ欄などに表示されます。<br/><span className="field-help">未設定の場合は共通のデフォルト画像を表示します。</span></p></div>
  <form action={saveAction}>
   <label htmlFor="profile-avatar">画像を選ぶ<input id="profile-avatar" ref={inputRef} name="avatar" type="file" accept="image/jpeg,image/png,image/webp" required disabled={busy} aria-describedby="profile-avatar-help" onChange={event=>{
    const file=event.target.files?.[0];setFileError('');setPreview(null);
    if(!file)return;
    if(file.size>MAX_AVATAR_BYTES||!['image/jpeg','image/png','image/webp'].includes(file.type)){setFileError('5MB以下のJPEG・PNG・WebPを選んでください。');return;}
    setPreview(URL.createObjectURL(file));
   }}/></label>
   <p className="field-help" id="profile-avatar-help">JPEG・PNG・WebP、5MBまで。画像の中央を正方形に切り抜き、丸く表示します。設定した画像は他のユーザーにも公開されます。</p>
   {fileError&&<p className="form-error" role="alert">{fileError}</p>}{saved.error&&<p className="form-error" role="alert">{saved.error}</p>}{saved.success&&<p className="form-success" role="status">{saved.success}</p>}
   <button type="submit" className="button primary" disabled={busy||!preview}><ImagePlus size={17}/>{saving?'保存しています…':'画像を保存する'}</button>
  </form>
  <form action={removeAction} className="avatar-remove-form"><button type="submit" className="text-link" disabled={busy}>{removing?'削除しています…':'画像を削除してデフォルトに戻す'}</button>{removed.error&&<p className="form-error" role="alert">{removed.error}</p>}{removed.success&&<p className="form-success" role="status">{removed.success}</p>}</form>
 </section>;
}
