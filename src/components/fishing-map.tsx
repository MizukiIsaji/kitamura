'use client';

import {useEffect,useId,useRef,useState,type KeyboardEvent} from 'react';
import {ArrowLeft,ArrowRight,ChevronRight,Fish,MapPin,Search,Waves,Users,Anchor,LocateFixed,Store,X} from 'lucide-react';
import {categories} from '@/lib/domain';
import {localAreas,localAreasForPrefecture,localAreaForMunicipality,municipalityById} from '@/lib/localities';
import {mapLocalMarkers,municipalitiesWithEntries,paginateLocalMarkers} from '@/lib/local-map';
import {applyFacilityLocations} from '@/lib/address-location';
import {MapDetailsDialog} from '@/components/map-details-dialog';
import {
 filterMapEntries,getMapViewport,layoutMapMarkers,mapKinds,mapMarkersForEntries,
 prefectureShapes,prefectures,regions,validMapCoordinates,
 type MapEntry,type MapKind,type MapMarker,type Region,
} from '@/lib/fishing-map';

const icons={catch:Fish,coach:Users,pond:Waves,spot:Anchor,shop:Store};
type Props={entries:MapEntry[];initialKind?:MapKind|'all';compact?:boolean;totalCatches?:number};
function activate(event:KeyboardEvent<SVGElement>,action:()=>void){
 if(event.key==='Enter'||event.key===' '){event.preventDefault();action();}
}

// FR-01 / FR-02: the same map is used on the top, explore and coaches pages.
export function FishingMap({entries,initialKind='all',compact=false,totalCatches}:Props){
 const id=useId();
 const [kind,setKind]=useState<MapKind|'all'>(initialKind);
 const [region,setRegion]=useState<Region|'all'>('all');
 const [prefecture,setPrefecture]=useState('');
 const [localArea,setLocalArea]=useState('');
 const [municipality,setMunicipality]=useState('');
 const [pinPage,setPinPage]=useState(0);
 const [q,setQ]=useState('');
 const [limit,setLimit]=useState(6);
 const [selectedIds,setSelectedIds]=useState<string[]>([]);
 const [addressLocations,setAddressLocations]=useState<Record<string,unknown[]>>({});
 const [locationStatus,setLocationStatus]=useState({key:'',phase:'ready'});
 const [locationAttempt,setLocationAttempt]=useState(0);
 const [detailIds,setDetailIds]=useState<string[]>([]);
 const [size,setSize]=useState({width:680,height:420});
 const svgRef=useRef<SVGSVGElement>(null);

 useEffect(()=>{
  const element=svgRef.current;if(!element)return;
  const update=()=>{
   const rect=element.getBoundingClientRect();
   if(rect.width>0&&rect.height>0){
    const next={width:Math.round(rect.width),height:Math.round(rect.height)};
    setSize(current=>current.width===next.width&&current.height===next.height?current:next);
   }
  };
  update();
  if(typeof ResizeObserver==='undefined'){window.addEventListener('resize',update);return()=>window.removeEventListener('resize',update);}
  const observer=new ResizeObserver(update);observer.observe(element);return()=>observer.disconnect();
 },[]);

 const addressRequestKey=JSON.stringify([municipality,entries.filter(entry=>entry.addressKey&&entry.municipalityIds?.includes(municipality)).map(entry=>entry.id+':'+entry.addressKey).sort()]);
 const requestedLocations=addressLocations[addressRequestKey];
 // FR-04.8: fetch only after selecting a municipality; abort obsolete selections.
 useEffect(()=>{
  if(!municipality||requestedLocations)return;
  let active=true;
  const controller=new AbortController();
  const timer=setTimeout(()=>controller.abort(),20000);
  setLocationStatus({key:addressRequestKey,phase:'loading'});
  async function load(){
   try{
    const response=await fetch('/api/facility-locations?'+new URLSearchParams({municipality}),{signal:controller.signal,cache:'no-store'});
    if(!response.ok)throw new Error('LOCATION_UNAVAILABLE');
    const data:unknown=await response.json();
    if(!data||typeof data!=='object'||!('municipality' in data)||data.municipality!==municipality||!('locations' in data)||!Array.isArray(data.locations))throw new Error('LOCATION_RESPONSE_INVALID');
    if(active){setAddressLocations(current=>({...current,[addressRequestKey]:data.locations as unknown[]}));setLocationStatus({key:addressRequestKey,phase:'ready'});}
   }catch{if(active)setLocationStatus({key:addressRequestKey,phase:'error'});}
   finally{clearTimeout(timer);}
  }
  void load();
  return()=>{active=false;clearTimeout(timer);controller.abort();};
 },[municipality,addressRequestKey,requestedLocations,locationAttempt]);
 const locatedEntries=municipality?applyFacilityLocations(entries,requestedLocations||[]):entries;
 const filtered=filterMapEntries(locatedEntries,{kind,region,q});
 const inPrefecture=filterMapEntries(filtered,{prefecture,localArea,municipality});
 const results=selectedIds.length?inPrefecture.filter(entry=>selectedIds.includes(entry.id)):inPrefecture;
 const coordinates=prefecture?inPrefecture.flatMap(entry=>validMapCoordinates(entry.coordinates)?[entry.coordinates]:[]):[];
 // FR-04.8: keep the full prefecture silhouette as context, including after city selection.
 const frame=getMapViewport({region,prefecture,...size,coordinates});
 const markers=prefecture?mapLocalMarkers(filtered,{prefecture,localArea,municipality,frame}):mapMarkersForEntries(filtered,{region,frame});
 const markerPage=paginateLocalMarkers(markers,size,pinPage);
 const pins=layoutMapMarkers(markerPage.markers,size);
 const prefectureAreas=localAreasForPrefecture(prefecture);
 const selectedArea=prefectureAreas.find(p=>p.id===localArea);
 const selectedMunicipality=municipalityById.get(municipality);
 const cityOptions=municipalitiesWithEntries(filtered,{prefecture,localArea});
 const cityIsAvailable=!municipality||cityOptions.some(city=>city.id===municipality);
 useEffect(()=>{
  if(!cityIsAvailable){setMunicipality('');setSelectedIds([]);setLimit(6);setPinPage(0);}
 },[cityIsAvailable]);
 const locationLabel=selectedMunicipality?.shortName||selectedArea?.name||prefecture||(region==='all'?'全国':region);
 const backLabel=municipality?(selectedArea?.name||prefecture):localArea?prefecture:region;
 const activePrefectures=region==='all'?prefectures:prefectures.filter(p=>p.region===region);
 const visibleShapes=prefecture?prefectureShapes.filter(p=>p.name===prefecture):prefectureShapes;
 const unknown=filtered.filter(entry=>!entry.prefectures.length).length;
 const shown=results.slice(0,limit);
 const hasExact=coordinates.length>0;
 const counts=(key:MapKind)=>entries.filter(entry=>entry.kind===key).length;
 const preparing=(kind==='pond'||kind==='spot'||kind==='shop')&&!entries.some(entry=>entry.kind===kind);
 function clearPin(){setSelectedIds([]);setDetailIds([]);setLimit(6);setPinPage(0);}
 function reset(){setRegion('all');setPrefecture('');setLocalArea('');setMunicipality('');setQ('');clearPin();}
 function chooseKind(next:MapKind|'all'){setKind(next);clearPin();}
 function chooseRegion(next:Region|'all'){setRegion(next);setPrefecture('');setLocalArea('');setMunicipality('');clearPin();}
 function choosePrefecture(next:string){
  const place=prefectures.find(p=>p.name===next);
  if(place)setRegion(place.region);
  setPrefecture(place?next:'');setLocalArea('');setMunicipality('');clearPin();
 }
 function chooseLocalArea(next:string){
  const area=localAreas.find(p=>p.id===next&&p.prefecture===prefecture);
  setLocalArea(area?.id||'');setMunicipality('');clearPin();
 }
 function chooseMunicipality(next:string){
  const place=municipalityById.get(next);
  if(place&&place.prefecture===prefecture){setMunicipality(place.id);setLocalArea(localAreaForMunicipality(place.id)?.id||'');}
  else setMunicipality('');
  clearPin();
 }
 function goBack(){
  if(municipality){setMunicipality('');clearPin();}
  else if(localArea){setLocalArea('');clearPin();}
  else if(prefecture)chooseRegion(region);
  else reset();
 }
 function chooseMarker(marker:MapMarker){
  if(marker.localArea){chooseLocalArea(marker.localArea);return;}
  if(marker.municipality){chooseMunicipality(marker.municipality);return;}
  if(marker.region){chooseRegion(marker.region);return;}
  if(!prefecture&&marker.prefecture){choosePrefecture(marker.prefecture);return;}
  if(marker.entries.length){setSelectedIds(marker.entries.map(entry=>entry.id));setDetailIds(marker.entries.map(entry=>entry.id));setLimit(6);}
 }

 return <section className={'fishing-map '+(compact?'map-compact':'')} aria-label="日本の釣りマップ">
  {/* マップ FR-01.7・FR-02.10・FR-02.11: 短い案内と色で種類選択の役割を示す。 */}
  <div className="map-filter-panel">
  <div className="map-filter-heading"><span className="map-filter-icon" aria-hidden="true"><MapPin size={18}/></span><h2 id={id+'-filters-title'}>地図に表示するものを選ぶ</h2></div>
  <div className="map-types" role="group" aria-labelledby={id+'-filters-title'}>
   <button type="button" aria-pressed={kind==='all'} onClick={()=>chooseKind('all')}><span className="map-type-label">すべて</span><span className="map-type-count">{entries.length}</span></button>
   {(Object.keys(mapKinds) as MapKind[]).map(key=>{const Icon=icons[key];return <button type="button" key={key} className={'map-type-'+key} aria-pressed={kind===key} onClick={()=>chooseKind(key)}><Icon size={16}/><span className="map-type-label">{mapKinds[key].label}</span><span className="map-type-count">{counts(key)}</span></button>;})}
  </div>
  </div>
  <div className="map-layout">
   <div className="map-stage">
    <div className={'map-stage-top'+(prefecture?' map-stage-with-back':'')}><span><i/> JAPAN FISHING ATLAS</span>{prefecture?<button type="button" onClick={goBack} aria-label={backLabel+'へ戻る'}><ArrowLeft size={14}/>{backLabel}へ戻る</button>:<button type="button" onClick={reset} aria-label="マップを全国表示に戻す"><LocateFixed size={14}/>全国へ</button>}</div>
    {/* FR-02.8: selection and back navigation stay synchronized with the list. */}
    <nav className="map-breadcrumbs" aria-label="地図の表示範囲">
     <button type="button" onClick={reset} aria-current={region==='all'&&!prefecture?'location':undefined}>全国</button>
     {region!=='all'&&<><ChevronRight size={12}/><button type="button" onClick={()=>chooseRegion(region)} aria-current={!prefecture?'location':undefined}>{region}</button></>}
     {prefecture&&<><ChevronRight size={12}/><button type="button" onClick={()=>choosePrefecture(prefecture)} aria-current={!localArea&&!municipality?'location':undefined}>{prefecture}</button></>}
     {selectedArea&&<><ChevronRight size={12}/><button type="button" onClick={()=>chooseLocalArea(localArea)} aria-current={!municipality?'location':undefined}>{selectedArea.name}</button></>}
     {selectedMunicipality&&<><ChevronRight size={12}/><strong aria-current="location">{selectedMunicipality.shortName}</strong></>}
     <span>{municipality?'市区町村の掲載':prefecture?(prefectureAreas.length&&!localArea?'県内エリアを選んで詳しく':'市区町村を選んで詳しく'):region==='all'?'地方名を選んで拡大':'県名を選んで詳しく'}</span>
    </nav>
    <svg ref={svgRef} className="japan-map" viewBox={`0 0 ${size.width} ${size.height}`} aria-labelledby={id+'-map-title '+id+'-map-description'} role="group" data-map-level={municipality?'municipality':localArea?'local-area':prefecture?'prefecture':region==='all'?'national':'region'} data-map-prefecture={prefecture||undefined} data-map-local-area={localArea||undefined} data-map-municipality={municipality||undefined}>
     <title id={id+'-map-title'}>{locationLabel+'の釣りマップ'}</title>
     <desc id={id+'-map-description'}>地方・都道府県・県内エリア・市区町村から掲載を探せます。県内エリアの区分は岐阜県に対応しています。「目安」とあるピンは集計の代表位置です。輪郭は境界を簡略化し、一部の離島を省略しています。</desc>
     <defs>
      <pattern id={id+'-grid'} width="36" height="36" patternUnits="userSpaceOnUse"><path d="M36 0H0V36" fill="none" stroke="#a5ccdc" strokeWidth=".6"/></pattern>
      <linearGradient id={id+'-land'} x1="0" y1="0" x2="1" y2="1"><stop stopColor="#f9fcf1"/><stop offset="1" stopColor="#d5e8dc"/></linearGradient>
     </defs>
     <rect width={size.width} height={size.height} fill={'url(#'+id+'-grid)'}/>
     <path d={`M0 ${size.height*.65}Q${size.width*.35} ${size.height*.35} ${size.width} ${size.height*.8}M0 ${size.height*.83}Q${size.width*.5} ${size.height*.45} ${size.width} ${size.height*.97}`} className="map-current" aria-hidden="true"/>
     <g transform={`translate(${frame.offsetX} ${frame.offsetY}) scale(${frame.scale}) rotate(${frame.rotation})`}>
      {frame.national&&<g aria-hidden="true"><rect x="65" y="100" width="250" height="200" rx="14" className="map-inset" vectorEffect="non-scaling-stroke"/><text x="80" y="123" className="map-inset-label">沖縄・南西諸島</text></g>}
      {/* FR-02b: all levels use actual, simplified prefectural outlines. */}
      {visibleShapes.map(shape=>{
       const active=!!prefecture||region==='all'||activePrefectures.some(p=>p.name===shape.name);
       const clickable=!prefecture&&region!=='all'&&active;
       return <path key={shape.name} d={frame.national?shape.nationalPath:shape.path} fillRule="evenodd" fill={'url(#'+id+'-land)'} vectorEffect="non-scaling-stroke" className={'map-prefecture-shape '+(active?'active-area':'context-area')+(prefecture?' focused-prefecture':'')}
        role={clickable?'button':undefined} tabIndex={clickable?0:undefined} aria-label={clickable?shape.name+'の地図を表示':undefined} aria-hidden={clickable?undefined:true}
        onClick={clickable?()=>choosePrefecture(shape.name):undefined} onKeyDown={clickable?event=>activate(event,()=>choosePrefecture(shape.name)):undefined}/>
      })}
     </g>
     {/* FR-01.5: cards use screen pixels, not geographic units. */}
     <g className="map-marker-lines" aria-hidden="true">
      {pins.map(pin=>{
       const x=Math.max(pin.x+7,Math.min(pin.x+pin.width-7,pin.point.x));
       const y=Math.max(pin.y+7,Math.min(pin.y+pin.height-7,pin.point.y));
       return <g key={pin.id}><path d={`M${pin.point.x} ${pin.point.y}L${x} ${y}`} className="map-marker-leader"/><circle cx={pin.point.x} cy={pin.point.y} r={pin.precision==='exact'?3.5:2.5} fill={pin.precision==='exact'?'#087eaa':'#79a59e'}/></g>;
      })}
     </g>
     {pins.map(pin=>{
      const mixed=new Set(pin.entries.map(entry=>entry.kind)).size>1;
      const color=mixed||!pin.entries.length?'#163f55':mapKinds[pin.entries[0].kind].color;
      const active=selectedIds.length>0&&pin.entries.length>0&&pin.entries.every(entry=>selectedIds.includes(entry.id));
      const labelLimit=pin.width<120?5:6;
      const shortLabel=pin.label.length>labelLimit?pin.label.slice(0,labelLimit-1)+'…':pin.label;
      const label=pin.region?`${pin.region}（${pin.entries.length}件）を表示`:!prefecture?`${pin.label}の${pin.entries.length}件を表示`:`${pin.label}の掲載${pin.entries.length}件を表示`;
      return <g key={pin.id} role="button" tabIndex={0} aria-label={label} aria-pressed={active} className={'map-marker '+(pin.region?'region-marker ':'')+(active?'selected':'')} onClick={()=>chooseMarker(pin)} onKeyDown={event=>activate(event,()=>chooseMarker(pin))} transform={`translate(${pin.x} ${pin.y})`} data-map-marker={pin.id}>
       <title>{pin.label+'：'+pin.entries.length+'件'}</title>
       <rect width={pin.width} height={pin.height} rx="11" className="map-marker-card"/>
       {pin.region?<><text x={pin.width/2} y="18" textAnchor="middle" className="map-marker-region">{pin.label}</text><text x={pin.width/2} y="34" textAnchor="middle" className="map-marker-region-count">{pin.entries.length}件</text></>:<>
        <circle cx="22" cy="22" r="14" fill={color}/><text x="22" y="26" textAnchor="middle" className="map-marker-number">{pin.entries.length}</text>
        <text x="44" y="19" className="map-marker-name">{shortLabel}</text>
         <text x="44" y="33" className="map-marker-precision">{{prefecture:'県の目安','local-area':'エリアの目安',municipality:'市町村の目安',cluster:'近くの掲載',exact:'登録された位置',address:'番地付近（推定）',town:'町丁目付近（推定）'}[pin.precision]}</text>
       </>}
      </g>;
     })}
    </svg>
    {markerPage.pageCount>1&&<nav className="map-marker-pagination" aria-label="地図のピンのページ"><button type="button" disabled={markerPage.page===0} onClick={()=>setPinPage(markerPage.page-1)}><ArrowLeft size={13}/>前へ</button><span>{markerPage.start+1}–{markerPage.end} / {markerPage.total}地点</span><button type="button" disabled={markerPage.page===markerPage.pageCount-1} onClick={()=>setPinPage(markerPage.page+1)}>次へ<ArrowRight size={13}/></button></nav>}
    <div className="map-stage-bottom"><span><MapPin size={12}/>{prefecture?locationLabel+'の釣りマップ':region==='all'?'地方ごとの掲載件数':region+'全体を表示'}</span><span role="status">{municipality&&locationStatus.key===addressRequestKey&&locationStatus.phase==='loading'?'住所の位置を確認中…':municipality&&hasExact?'住所から推定した位置を表示':prefecture?'ピンは地域の目安':'ピンは都道府県の目安'}</span></div>
   </div>
   <div className="map-results">
    <div className="map-controls">
     <label htmlFor={id+'-search'} className="sr-only">エリア・魚種・名前で検索</label>
     <div className="map-search"><Search size={16}/><input id={id+'-search'} type="search" value={q} maxLength={80} placeholder="エリア・魚種・名前で検索" onChange={event=>{setQ(event.target.value);clearPin();}}/></div>
     <div className="map-selects">
      <label>地方<select value={region} onChange={event=>chooseRegion(event.target.value as Region|'all')}><option value="all">全国</option>{regions.map(name=><option key={name}>{name}</option>)}</select></label>
      <label>都道府県<select value={prefecture} onChange={event=>choosePrefecture(event.target.value)}><option value="">すべて</option>{activePrefectures.map(place=><option key={place.name}>{place.name}</option>)}</select></label>
     </div>
     {prefecture&&<div className="map-selects map-local-selects">
      {prefectureAreas.length>0&&<label>県内エリア<select value={localArea} onChange={event=>chooseLocalArea(event.target.value)}><option value="">すべて</option>{prefectureAreas.map(area=><option key={area.id} value={area.id}>{area.name}</option>)}</select></label>}
      <label>市区町村<select value={municipality} onChange={event=>chooseMunicipality(event.target.value)}><option value="">すべて</option>{cityOptions.map(place=><option key={place.id} value={place.id}>{place.name}</option>)}</select></label>
     </div>}
    </div>
    <div className="map-result-heading">
     <div><span className="kicker">{prefecture?'SELECTED AREA':'DISCOVER'}</span><h3>{prefecture?locationLabel:(region==='all'?'全国の釣りの記録':region)} <span>{results.length}件</span></h3></div>
     {prefecture&&<button type="button" onClick={()=>choosePrefecture('')} aria-label="都道府県の選択を解除"><X size={17}/></button>}
    </div>
    {selectedIds.length>0&&<div className="map-selection-note"><span>選択したピンの掲載</span><button type="button" onClick={clearPin}>すべてに戻す<X size={12}/></button></div>}
    <div className="map-result-list" aria-live="polite" aria-atomic="false">
     {shown.length?shown.map(entry=>{
      const Icon=icons[entry.kind];
      const content=<><span className="map-result-icon"><Icon size={21}/></span><div><span className="map-result-kind">{mapKinds[entry.kind].label}{entry.category&&' / '+categories[entry.category]}</span><h4>{entry.title}</h4><p><MapPin size={11}/>{entry.area}</p><small>{entry.description}</small>{!entry.prefectures.length&&<small className="map-unplaced">都道府県が未指定のため、ピンは非表示</small>}</div>{entry.href&&<ArrowRight size={16}/>}</>;
      return <button type="button" key={entry.id} className={'map-result-card map-result-'+entry.kind} aria-haspopup="dialog" aria-label={entry.title+'の詳細を表示'} onClick={()=>setDetailIds([entry.id])}>{content}</button>;
     }):<div className="map-empty"><Waves size={35}/><h3>{preparing?'次の釣り場も、ここから。':'この条件の掲載はまだありません'}</h3><p>{preparing?'釣り堀・釣りスポット・釣具店は今後順次掲載予定です。登録後は同じ地図に表示します。':'地方や都道府県を変えるか、別の種類を選んで探してみましょう。'}</p><button type="button" className="text-link" onClick={()=>{chooseKind('all');reset();}}>すべての掲載を見る<ArrowRight size={14}/></button></div>}
    </div>
    {results.length>limit&&<button type="button" className="map-more" onClick={()=>setLimit(current=>current+12)}>もっと見る（残り{results.length-limit}件）<ArrowRight size={14}/></button>}
    {municipality&&locationStatus.key===addressRequestKey&&locationStatus.phase==='error'&&<p className="map-result-note" role="status">住所の位置を取得できなかったため、市区町村の目安で表示しています。<button type="button" onClick={()=>setLocationAttempt(current=>current+1)}>位置を再取得</button></p>}
    <p className="map-result-note">{unknown>0&&`都道府県が未指定の${unknown}件は一覧のみ表示。`}複数の都道府県に対応するコーチは、それぞれの県に表示されます。</p>
   </div>
  </div>
  <div className="map-footnote"><p>公開中の釣果{totalCatches!==undefined&&totalCatches>200?'（新しい順に200件）':''}と承認済みコーチ（最大60件）を掲載。「目安」のピンは地域・市区町村の集計です。市区町村を選ぶと施設の登録住所から番地・町丁目付近の位置を推定します。推定位置は入口や敷地の正確な位置を保証するものではありません。県内エリアは岐阜県の5区分に対応。輪郭は簡略化し、一部の離島を省略しています。</p><div><a href="https://www.naturalearthdata.com/about/terms-of-use/" target="_blank" rel="noreferrer">Natural Earth ↗</a><a href="https://github.com/geolonia/japanese-addresses-v2" target="_blank" rel="noreferrer">住所データ: Geolonia / デジタル庁（加工）↗</a><a href="https://creativecommons.org/licenses/by/4.0/" target="_blank" rel="noreferrer">CC BY 4.0 ↗</a></div></div>
  <MapDetailsDialog entries={locatedEntries.filter(entry=>detailIds.includes(entry.id))} onDismiss={()=>setDetailIds([])}/>
 </section>;
}
