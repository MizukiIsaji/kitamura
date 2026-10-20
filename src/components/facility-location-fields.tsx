'use client';

import {useId,useState} from 'react';
import {facilityLocality,localAreaForMunicipality,municipalities,municipalitiesForPrefecture,resolveMunicipality} from '@/lib/localities';

const prefectureNames=[...new Set(municipalities.map(p=>p.prefecture))];
// Facility FR-02.5: save the existing municipality field; area is derived.
export function FacilityLocationFields({prefecture:initialPrefecture='',municipality:initialMunicipality='',address:initialAddress=''}:{prefecture?:string;municipality?:string;address?:string}){
 const id=useId();
 const [prefecture,setPrefecture]=useState(initialPrefecture);
 const initialPlace=facilityLocality(initialPrefecture,initialMunicipality,initialAddress);
 const [municipality,setMunicipality]=useState(initialPlace?.name||initialMunicipality);
 const [address,setAddress]=useState(initialAddress);
 const [automatic,setAutomatic]=useState(!initialMunicipality&&!!initialPlace);
 const cities=municipalitiesForPrefecture(prefecture),place=resolveMunicipality(prefecture,municipality),area=place?localAreaForMunicipality(place.id):undefined;
 function detectAddress(){
  if(municipality&&!automatic)return;
  const found=facilityLocality(prefecture,'',address);
  setMunicipality(found?.name||'');setAutomatic(!!found);
 }
 return <>
  <label htmlFor={id+'-prefecture'}>都道府県<select id={id+'-prefecture'} name="prefecture" required value={prefecture} onChange={event=>{setPrefecture(event.target.value);setMunicipality('');setAutomatic(false);}}>
   <option value="">選択してください</option>
   {!!prefecture&&!prefectureNames.includes(prefecture)&&<option value={prefecture}>{prefecture}（現在の登録値）</option>}
   {prefectureNames.map(name=><option key={name}>{name}</option>)}
  </select></label>
  <label htmlFor={id+'-municipality'}>市区町村<select id={id+'-municipality'} name="municipality" value={municipality} onChange={event=>{setMunicipality(event.target.value);setAutomatic(false);}} disabled={!prefecture}>
   <option value="">未指定</option>
   {!!municipality&&!cities.some(p=>p.name===municipality)&&<option value={municipality}>{municipality}（現在の登録値）</option>}
   {cities.map(city=><option key={city.id} value={city.name}>{city.name}</option>)}
  </select></label>
  <p className="facility-location-note" aria-live="polite">{area?'県内エリア：'+area.name+'（市区町村から自動判定）':place?'地図では'+place.shortName+'の目安位置に集約します。':'市区町村を選ぶと地域ごとに集約できます。未指定でも登録できます。'}</p>
  <label htmlFor={id+'-address'}>住所<input id={id+'-address'} name="address" maxLength={200} value={address} onChange={event=>setAddress(event.target.value)} onBlur={detectAddress} placeholder="例：郡上市八幡町島谷123"/></label>
  <p className="facility-location-note">住所から市区町村を読み取れる場合は候補を設定します。ピンは地域の目安位置に表示します。</p>
 </>;
}
