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

// 会員名のランク表示 FR-02: 指導実績は盾、ポイントはコイン・宝石で区別する。
// useId() includes ':' characters that some mobile browsers fail to resolve inside url(#...) paint references, leaving the icon unfilled.
function useRankIconId(){return useId().replace(/:/g,'');}
export function CoachRankIcon({rank,size=32}:{rank:CoachRank;size?:number}) {
 const metal=metals[rank],id=useRankIconId(),finish='url(#'+id+'-metal)';
 return <IconFrame size={size} id={id} metal={metal}>
  {(rank==='gold'||rank==='platinum')&&<g fill={finish} stroke={metal.edge} strokeWidth=".8">
   <path d="M8 13 1 10l2 7 5 4-6-2 3 7 6 3-5-1 7 7 3-5Z"/>
   <path d="m32 13 7-3-2 7-5 4 6-2-3 7-6 3 5-1-7 7-3-5Z"/>
  </g>}
  <path d="M20 2 34 8v11c0 8-7 15-14 19C13 34 6 27 6 19V8Z" fill={finish} stroke={metal.edge} strokeWidth="1.2"/>
  <path d="m20 5 11 4.7V19c0 6.3-5.4 12.3-11 15.8C14.4 31.3 9 25.3 9 19V9.7Z" stroke={metal.light} strokeOpacity=".8"/>
  <path d="m20 7.2 9 3.9V19c0 5.2-4.3 10.3-9 13.5-4.7-3.2-9-8.3-9-13.5v-7.9Z" fill={'url(#'+id+'-core)'} stroke={metal.edge}/>
  <path d="m20 7.2 9 3.9V19c0 1.5-.4 3-1 4.4L11 16v-4.9Z" fill="white" fillOpacity=".07"/>
  <g fill={finish} stroke={metal.light} strokeWidth=".45">
   {rank==='bronze'&&<path d="m13 21 7-6 7 6v4l-7-6-7 6Z"/>}
   {rank==='silver'&&<path d="m13 16 7-5 7 5v3l-7-5-7 5Zm0 8 7-5 7 5v3l-7-5-7 5Z"/>}
   {rank==='gold'&&<path d="m13 14 7-4 7 4v3l-7-4-7 4Zm0 7 7-4 7 4v3l-7-4-7 4Zm1 6 6-3.5 6 3.5-2 2-4-2.3-4 2.3Z"/>}
   {rank==='platinum'&&<>
    <path d="m12.5 15 4.5 3 3-7 3 7 4.5-3-2 10h-11Z"/>
    <path d="M15 27h10v2H15Z"/>
    <path d="m20 19 1.8 2.5L20 24l-1.8-2.5Z" fill={metal.core} stroke="none"/>
   </>}
  </g>
  <path d="M8 10v9c0 7 6 13 12 17" stroke="white" strokeOpacity=".5"/>
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
