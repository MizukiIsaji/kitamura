'use client';

import {useEffect,useId,useRef,useState} from 'react';
import Link from 'next/link';
import {ArrowLeft,ArrowRight,MapPin,X} from 'lucide-react';
import {categories} from '@/lib/domain';
import {mapKinds,type MapEntry} from '@/lib/fishing-map';

// FR-03.3 / FR-03.4: native modal behavior handles focus, Escape and background interaction.
export function MapDetailsDialog({entries,onDismiss}:{entries:MapEntry[];onDismiss:()=>void}){
 const id=useId(),dialogRef=useRef<HTMLDialogElement>(null),headingRef=useRef<HTMLHeadingElement>(null);
 const [selectedId,setSelectedId]=useState('');
 const open=entries.length>0;
 const selected=entries.length===1?entries[0]:entries.find(entry=>entry.id===selectedId);
 useEffect(()=>{
  const dialog=dialogRef.current;if(!dialog)return;
  if(open&&!dialog.open)dialog.showModal();
  else if(!open&&dialog.open)dialog.close();
 },[open]);
 useEffect(()=>{if(dialogRef.current?.open)headingRef.current?.focus();},[selectedId]);
 function dismiss(){setSelectedId('');onDismiss();}
 return <dialog ref={dialogRef} className="map-detail-dialog" aria-labelledby={id+'-heading'} onCancel={event=>{event.preventDefault();dismiss();}} onClose={dismiss} onClick={event=>{if(event.target===event.currentTarget)dismiss();}}>
  <div className="map-detail-panel">
   <header className="map-detail-header"><p className="kicker">{selected?mapKinds[selected.kind].english:'SELECT A LISTING'}</p><button type="button" className="map-detail-close" aria-label="詳細を閉じる" autoFocus onClick={dismiss}><X size={20}/></button></header>
   <div className="map-detail-body">
    {selected?<>
     {entries.length>1&&<button type="button" className="map-detail-back" onClick={()=>setSelectedId('')}><ArrowLeft size={15}/>このピンの掲載に戻る</button>}
     <span className="map-detail-kind">{mapKinds[selected.kind].label}{selected.category&&' / '+categories[selected.category]}</span>
     <h2 id={id+'-heading'} ref={headingRef} tabIndex={-1}>{selected.title}</h2>
     <p className="map-detail-area"><MapPin size={15}/>{selected.area||'エリア未指定'}</p>
     <p className="map-detail-description">{selected.details?.description||selected.description||'紹介文は未登録です。'}</p>
     {!!selected.details?.fields.length&&<dl className="map-detail-fields">{selected.details.fields.map((field,index)=><div key={index}><dt>{field.label}</dt><dd>{field.value.trim()||'未登録'}</dd></div>)}</dl>}
     {selected.locationAccuracy&&<p className="map-detail-location-note">ピンは登録住所から推定した{selected.locationAccuracy==='address'?'番地':'町丁目'}付近の目安です。</p>}
     {selected.href&&<Link className="map-detail-link" href={selected.href} onClick={dismiss}>{selected.kind==='coach'?'プロフィールを開く':'釣行記録を開く'}<ArrowRight size={17}/></Link>}
    </>:<>
     <h2 id={id+'-heading'} ref={headingRef} tabIndex={-1}>このピンの掲載 <span>{entries.length}件</span></h2>
     <p className="map-detail-description">詳細を見たい掲載を選んでください。</p>
     <div className="map-detail-choices">{entries.map(entry=><button type="button" key={entry.id} onClick={()=>setSelectedId(entry.id)}><span><small>{mapKinds[entry.kind].label}</small><strong>{entry.title}</strong><span>{entry.area}</span></span><ArrowRight size={18}/></button>)}</div>
    </>}
   </div>
   <footer className="map-detail-footer"><button type="button" onClick={dismiss}>閉じる</button></footer>
  </div>
 </dialog>;
}
