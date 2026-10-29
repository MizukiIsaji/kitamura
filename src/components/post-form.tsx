'use client';
import {useEffect,useState} from 'react';
import {createPost} from '@/app/actions';
import {ActionForm} from './action-form';
import {categories} from '@/lib/domain';
import {tackleOptions} from '@/lib/post-options';
import {MAX_POST_PHOTOS,validatePhotoFiles} from '@/lib/post-photos';
import {preparePostPhotoForm} from '@/lib/browser-photo';
function PhotoPicker(){
 const [photos,setPhotos]=useState<File[]>([]);
 const [previews,setPreviews]=useState<string[]>([]);
 const [error,setError]=useState('');
 useEffect(()=>{const urls=photos.map(file=>URL.createObjectURL(file));setPreviews(urls);return()=>urls.forEach(url=>URL.revokeObjectURL(url));},[photos]);
 return <div className="post-photo-picker"><label>写真（最大5枚）<input name="photos" type="file" accept="image/jpeg,image/png,image/webp" multiple onChange={event=>{
  const files=Array.from(event.currentTarget.files||[]);
  try{validatePhotoFiles(files);event.currentTarget.setCustomValidity('');setError('');setPhotos(files);}
  catch(error){const message=error instanceof Error?error.message:'写真を確認してください。';event.currentTarget.setCustomValidity(message);setError(message);setPhotos([]);}
 }}/><small>JPEG・PNG・WebP／1枚10MB以内。写真は任意です。位置情報などのEXIFを除去して保存します。</small></label>
 {error&&<p className="form-error" role="alert">{error}</p>}
 <p className="field-help" aria-live="polite">{photos.length} / {MAX_POST_PHOTOS}枚選択中</p>
 {previews.length>0&&<div className="post-photo-previews">{previews.map((url,index)=><figure key={url}><img src={url} alt={`選択した写真${index+1}`}/><figcaption>{index+1}枚目{index===0?'・一覧の写真':''}</figcaption></figure>)}</div>}
 </div>;
}
// 釣果登録 FR-01, FR-02: select tackle and prepare up to five optional photos.
export function PostForm({today}:{today:string}){
 return <ActionForm action={createPost} prepare={preparePostPhotoForm} label="記録を保存する"><PhotoPicker/><div className="form-grid">
 <label className="full">タイトル<input name="title" maxLength={60} required placeholder="例：流れの変化で出会えた一尾"/></label>
 <label>魚種<input name="species" maxLength={40} placeholder="例：ニジマス"/></label>
 <label>サイズ（cm・自己申告）<input name="size_cm" type="number" step="0.1" min="0.1" max="999"/></label>
 <label>ジャンル<select name="category">{Object.entries(categories).map(([key,label])=><option key={key} value={key}>{label}</option>)}</select></label>
 <label>釣行日<input name="fished_on" type="date" defaultValue={today} max={today} required/></label>
 <label className="full">エリア<input name="area" required maxLength={80} placeholder="例：長野県 安曇野エリア"/><small>都道府県名を含めると日本マップに表示されます。釣り場を守るため、具体的なポイントや住所はお控えください。</small></label>
 <label>ロッド<input name="rod" maxLength={100}/></label><label>リール<input name="reel" maxLength={100}/></label>
 <label className="full">ルアー・仕掛け<select name="lure" defaultValue=""><option value="">選択してください（任意）</option>{tackleOptions.map(option=><option key={option} value={option}>{option}</option>)}</select></label>
 <label className="full">釣行メモ（任意）<textarea name="memo" maxLength={3000} rows={6} placeholder="状況、工夫、次に試したいこと…"/><small>空白を除いて100文字以上で50pt加算されます。</small></label>
 </div><label className="check-label"><input name="is_public" type="checkbox" defaultChecked/><span>みんなに公開する<small>チェックを外すと、自分のマイレコードからのみ閲覧できます。</small></span></label></ActionForm>;
}
