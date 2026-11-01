import {useId,type ReactNode} from 'react';
import type {CoachRank} from '@/lib/coach-ranks';
import type {PointRankTier} from '@/lib/points';

const metals = {
 bronze: {edge:'#60371f',body:'#c88449',light:'#ffe1ae',core:'#4e3024'},
 silver: {edge:'#394b60',body:'#9aadc3',light:'#f5faff',core:'#25374b'},
 gold: {edge:'#785015',body:'#deb34d',light:'#fff3bd',core:'#483714'},
 platinum: {edge:'#23566d',body:'#7fbecf',light:'#e4fcff',core:'#12374d'},
 sapphire: {edge:'#182e79',body:'#568cf0',light:'#d4f4ff',core:'#152d67'},
};

type Metal=typeof metals[PointRankTier];

function IconFrame({children,size,id,metal}:{children:ReactNode;size:number;id:string;metal:Metal}) {
 return <svg xmlns="http://www.w3.org/2000/svg" className="rank-icon" width={size} height={size} viewBox="0 0 40 40" fill="none" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
  <defs>
   <linearGradient id={id+'-metal'} x1="6" y1="3" x2="32" y2="38" gradientUnits="userSpaceOnUse">
    <stop stopColor={metal.light}/><stop offset=".3" stopColor={metal.body}/><stop offset=".48" stopColor={metal.light}/><stop offset=".55" stopColor={metal.body}/><stop offset="1" stopColor={metal.edge}/>
   </linearGradient>
   <linearGradient id={id+'-core'} x1="10" y1="6" x2="30" y2="35" gradientUnits="userSpaceOnUse">
    <stop stopColor={metal.core}/><stop offset="1" stopColor={metal.edge}/>
   </linearGradient>
  </defs>
  {children}
 </svg>;
}

// 会員名のランク表示 FR-02: 指導実績はランク色の王冠、ポイントはコイン・宝石で区別する。
// useId() includes ':' characters that some mobile browsers fail to resolve inside url(#...) paint references, leaving the icon unfilled.
function useRankIconId(){return useId().replace(/:/g,'');}
export function CoachRankIcon({rank,size=32}:{rank:CoachRank;size?:number}) {
 const metal=metals[rank],id=useRankIconId(),finish='url(#'+id+'-metal)',core='url(#'+id+'-core)';
 const jewel={bronze:'#e98e35',silver:'#c5e5ff',gold:'#d93654',platinum:'#49e4f0'}[rank];
 return <IconFrame size={size} id={id} metal={metal}>
  <defs>
   <linearGradient id={id+'-jewel'} x1="18" y1="18" x2="23" y2="26" gradientUnits="userSpaceOnUse">
    <stop stopColor="white"/><stop offset=".3" stopColor={jewel}/><stop offset="1" stopColor={metal.core}/>
   </linearGradient>
  </defs>
  {/* Five points, a beveled face and a curved band keep the crown legible at 28px. */}
  <path d="m8 25 4-15 8 10 8-10 4 15Z" fill={core} stroke={metal.edge} strokeWidth="1.1"/>
  <path d="m12 10 1.5 11L20 20Zm16 0-1.5 11L20 20Z" fill={metal.body}/>
  <path d="m4 12 8 7L20 5l8 14 8-7-4 17H8Z" fill={finish} stroke={metal.edge} strokeWidth="1.2"/>
  <path d="m4 12 8 7 8-14v22L9 26Zm16-7 8 14 8-7-5 14-11 1Z" fill={metal.light} fillOpacity=".25"/>
  <path d="m4 12 5 14 7-2-4-5Zm32 0-5 14-7-2 4-5Z" fill={metal.edge} fillOpacity=".4"/>
  <path d="m6.2 15.3 6.2 5.5L20 8l7.6 12.8 6.2-5.5M20 8v7" stroke={metal.light} strokeWidth=".9"/>
  <path d="M8 27q12 3 24 0v6q-12 4-24 0Z" fill={finish} stroke={metal.edge} strokeWidth="1.1"/>
  <path d="M9 28.5q11 2.8 22 0M9 32.3q11 3.4 22 0" stroke={metal.light} strokeWidth=".8"/>
  <path d="M9 33.4q11 3.2 22 0" stroke={metal.edge} strokeOpacity=".6"/>
  <g fill={finish} stroke={metal.edge} strokeWidth=".8">
   <circle cx="4" cy="11.5" r="1.7"/><circle cx="12" cy="9.8" r="1.25"/>
   <circle cx="20" cy="4.5" r="2"/>
   <circle cx="28" cy="9.8" r="1.25"/><circle cx="36" cy="11.5" r="1.7"/>
  </g>
  <path d="m20 16.5 4 5-4 5-4-5Z" fill={core} stroke={metal.light} strokeWidth=".8"/>
  <path d="m20 18 2.7 3.5L20 25l-2.7-3.5Z" fill={'url(#'+id+'-jewel)'} stroke={metal.edge} strokeWidth=".45"/>
  <path d="m20 18-2.7 3.5H20Z" fill="white" fillOpacity=".65"/>
  <path d="M20 29.6v3.1" stroke={metal.core} strokeWidth="1.5"/>
  <g fill={rank==='gold'||rank==='platinum'?jewel:metal.light} stroke={metal.edge} strokeWidth=".45">
   <path d="m13 29.5 1.2 1.4-1.2 1.4-1.2-1.4Zm14 0 1.2 1.4-1.2 1.4-1.2-1.4Z"/>
  </g>
  {rank==='platinum'&&<g fill={metal.light} stroke={metal.body} strokeWidth=".45">
   <path d="m32 2 .8 2.7L35.5 5l-2.7.8L32 8.5l-.8-2.7L28.5 5l2.7-.3Z"/>
   <path d="m5.5 29 .6 1.9L8 31.5l-1.9.6L5.5 34l-.6-1.9-1.9-.6 1.9-.6Z"/>
  </g>}
 </IconFrame>;
}

export function PointRankIcon({tier,size=32}:{tier:PointRankTier;size?:number}) {
 const metal=metals[tier],id=useRankIconId(),finish='url(#'+id+'-metal)';
 if(tier==='sapphire')return <IconFrame size={size} id={id} metal={metal}>
  <path d="m11 6 18 0 8 11-17 21L3 17Z" fill={finish} stroke={metal.edge} strokeWidth="1.2"/>
  <path d="m12 8 16 0 6 9-14 17L6 17Z" fill="#3c6ed4"/>
  <path d="m12 8 8 9 8-9Z" fill="#c1e8ff"/>
  <path d="m12 8-6 9h9Zm16 0 6 9h-9Z" fill="#83bcff"/>
  <path d="m12 8 3 9h5Zm16 0-3 9h-5Z" fill="#3862b8"/>
  <path d="m6 17 14 17-5-17Z" fill="#6da9f5"/>
  <path d="m15 17 5 17V17Z" fill="#b6e3ff"/>
  <path d="m20 17 0 17 5-17Z" fill="#4d85e7"/>
  <path d="m25 17-5 17 14-17Z" fill="#224695"/>
  <path d="M6 17h28M12 8h16" stroke="#e9faff" strokeOpacity=".8"/>
  <path d="m7 1 1.3 3.7L12 6 8.3 7.3 7 11 5.7 7.3 2 6l3.7-1.3Z" fill="#eefaff" stroke="#528bc8" strokeWidth=".6"/>
  <path d="m34 26 .8 2.2L37 29l-2.2.8L34 32l-.8-2.2L31 29l2.2-.8Z" fill="#b9e9ff"/>
 </IconFrame>;
 return <IconFrame size={size} id={id} metal={metal}>
  <circle cx="20" cy="20" r="18" fill={finish} stroke={metal.edge} strokeWidth="1.2"/>
  <circle cx="20" cy="20" r="15.7" stroke={metal.light} strokeOpacity=".85"/>
  <circle cx="20" cy="20" r="13.5" fill={'url(#'+id+'-core)'} stroke={metal.edge}/>
  <path d="M8 14a13.5 13.5 0 0 1 24 0L7 24a13.5 13.5 0 0 1 1-10Z" fill="white" fillOpacity=".06"/>
  <path d="M20 3.5v2M20 34.5v2M3.5 20h2m29 0h2" stroke={metal.edge} strokeWidth="1.2"/>
  <g fill={finish} stroke={metal.light} strokeWidth=".55">
   {tier==='bronze'&&<>
    <path d="M11 20c3-5 7 5 13 0l5-3m-18 9c3-5 7 5 13 0l5-3" fill="none" stroke={metal.body} strokeWidth="2.6"/>
    <circle cx="20" cy="13" r="2"/>
   </>}
   {tier==='silver'&&<>
    <path d="m20 9 3.5 7.5L31 20l-7.5 3.5L20 31l-3.5-7.5L9 20l7.5-3.5Z"/>
    <path d="m20 13 0 7-7 0 5-2Z" fill={metal.light} stroke="none"/>
   </>}
   {tier==='gold'&&<>
    <path d="m20 9 3.3 6.7 7.4 1.1-5.4 5.2 1.3 7.4-6.6-3.5-6.6 3.5 1.3-7.4-5.4-5.2 7.4-1.1Z"/>
    <path d="m20 9 0 12-10.7-4.2 7.4-1.1Z" fill={metal.light} stroke="none" fillOpacity=".65"/>
   </>}
   {tier==='platinum'&&<>
    <path d="m20 8 10 12-10 12L10 20Z"/>
    <path d="m20 8-3.5 12L20 32l3.5-12Zm-10 12h20" stroke={metal.core}/>
    <path d="m20 8-3.5 12H10Z" fill={metal.light} stroke="none"/>
   </>}
  </g>
  <path d="M5 20a15 15 0 0 1 15-15" stroke="white" strokeOpacity=".6"/>
 </IconFrame>;
}
