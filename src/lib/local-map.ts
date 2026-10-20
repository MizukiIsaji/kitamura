import {filterMapEntries,mapMarkersForEntries,mapScreenPoint,markerCapacity,prefectures,type MapEntry,type MapMarker,type MapViewport} from './fishing-map';
import {localAreas,localAreasForPrefecture,municipalitiesForPrefecture,municipalityById} from './localities';

// FR-04.3: map choices and markers share the same positive-count condition.
export function municipalitiesWithEntries(entries:MapEntry[],{prefecture,localArea=''}:{prefecture:string;localArea?:string}){
 const scoped=filterMapEntries(entries,{prefecture,localArea}),area=localAreas.find(p=>p.id===localArea&&p.prefecture===prefecture);
 return municipalitiesForPrefecture(prefecture).filter(city=>(!area||area.municipalityIds.includes(city.id))&&filterMapEntries(scoped,{municipality:city.id}).length>0);
}

// FR-04.2: area/city cards are administrative summaries, never address pins.
export function mapLocalMarkers(entries:MapEntry[],{prefecture,localArea='',municipality='',frame}:{prefecture:string;localArea?:string;municipality?:string;frame:MapViewport}):MapMarker[]{
 const scoped=filterMapEntries(entries,{prefecture,localArea,municipality});
 const areas=localAreasForPrefecture(prefecture),area=areas.find(p=>p.id===localArea),place=municipalityById.get(municipality);
 if(place&&place.prefecture===prefecture){
  return mapMarkersForEntries(scoped,{prefecture,frame}).map(pin=>pin.precision==='prefecture'?{...pin,id:'municipality-summary-'+place.id,label:place.shortName,point:mapScreenPoint(place,frame),precision:'municipality'}:pin);
 }
 let markers:MapMarker[];
 if(areas.length&&!localArea){
  markers=areas.map(group=>({id:'local-area-'+group.id,label:group.name,point:mapScreenPoint(group,frame),entries:filterMapEntries(scoped,{localArea:group.id}),precision:'local-area',localArea:group.id}));
 }else{
  const cities=municipalitiesWithEntries(scoped,{prefecture,localArea});
  markers=cities.map(city=>({id:'municipality-'+city.id,label:city.shortName,point:mapScreenPoint(city,frame),entries:filterMapEntries(scoped,{municipality:city.id}),precision:'municipality',municipality:city.id}));
 }
 const locatedIds=new Set(markers.flatMap(pin=>pin.entries).map(entry=>entry.id));
 const unplaced=scoped.filter(entry=>!locatedIds.has(entry.id));
 if(unplaced.length){
  const anchor=area||prefectures.find(p=>p.name===prefecture);
  if(anchor)markers.push({id:'unplaced-'+(localArea||prefecture),label:areas.length&&!localArea?'エリア未指定':'市町村未指定',point:mapScreenPoint(anchor,frame),entries:unplaced,precision:area?'local-area':'prefecture'});
 }
 return markers;
}

export function localMapFocus(localArea:string,municipality:string){
 const place=municipalityById.get(municipality);if(place)return[place];
 const area=localAreas.find(p=>p.id===localArea);return area?area.municipalityIds.flatMap(id=>{const city=municipalityById.get(id);return city?[city]:[];}):[];
}

export function paginateLocalMarkers(markers:MapMarker[],size:{width:number;height:number},requestedPage=0){
 const capacity=markerCapacity(size),pageCount=Math.max(1,Math.ceil(markers.length/capacity));
 const page=Math.max(0,Math.min(pageCount-1,Number.isFinite(requestedPage)?Math.floor(requestedPage):0));
 const start=page*capacity,end=Math.min(markers.length,start+capacity);
 return{markers:markers.slice(start,end),page,pageCount,total:markers.length,start,end};
}
