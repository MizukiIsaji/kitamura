import {facilityLocality,municipalities,municipalityById,resolveMunicipality} from './localities';
import type {MapCoordinates,MapEntry} from './fishing-map';

export type FacilityAddress={prefecture:string;municipality:string;address:string};
export type AddressLocation=MapCoordinates&{accuracy:'address'|'town'};
export type FacilityLocation={id:string;addressKey:string;location:AddressLocation};
export type NormalizedAddress={pref?:string;city?:string;town?:string;point?:{lat:number;lng:number;level:number}};
const normalizeText=(value:string)=>value.normalize('NFKC').replace(/\s/g,'').replace(/[−‐‑–—]/g,'-').replace(/^〒?\d{3}-?\d{4}/,'');
const prefectureNames=[...new Set(municipalities.map(place=>place.prefecture))];

// FR-04.8: only a facility's registered address is geocoded, never member profiles.
export function facilityAddressInput(facility:FacilityAddress){
 const place=facilityLocality(facility.prefecture,facility.municipality,facility.address);
 let text=normalizeText(facility.address);
 if(!place||!text)return undefined;
 const pref=prefectureNames.find(name=>text.startsWith(name));
 if(pref&&pref!==facility.prefecture)return undefined;
 if(pref)text=text.slice(pref.length);
 const stated=resolveMunicipality(facility.prefecture,text);
 if(stated&&stated.id!==place.id)return undefined;
 const input=facility.prefecture+(stated?text:place.name+text);
 return {input,municipalityId:place.id};
}
export function facilityAddressKey(facility:FacilityAddress){return facilityAddressInput(facility)?.input;}

export async function locateFacilityAddress(facility:FacilityAddress,normalize:(input:string)=>Promise<NormalizedAddress>):Promise<AddressLocation|undefined>{
 const query=facilityAddressInput(facility);if(!query)return undefined;
 try{
  const result=await normalize(query.input),point=result.point;
  const place=result.pref&&result.city?resolveMunicipality(result.pref,result.city):undefined;
  if(result.pref!==facility.prefecture||place?.id!==query.municipalityId||!result.town||!point||![3,8].includes(point.level))return undefined;
  if(!Number.isFinite(point.lat)||!Number.isFinite(point.lng)||point.lat<20||point.lat>46||point.lng<122||point.lng>154)return undefined;
  return {latitude:point.lat,longitude:point.lng,accuracy:point.level===8?'address':'town'};
 }catch{return undefined;}
}

// FR-04.8: reject stale address responses and never overwrite explicitly supplied positions.
export function applyFacilityLocations(entries:MapEntry[],locations:readonly unknown[]):MapEntry[]{
 const valid=new Map<string,FacilityLocation>();
 for(const item of locations){
  if(!item||typeof item!=='object')continue;
  const row=item as Partial<FacilityLocation>,point=row.location;
  if(typeof row.id!=='string'||typeof row.addressKey!=='string'||!point||typeof point!=='object'||!['address','town'].includes(point.accuracy))continue;
  if(!Number.isFinite(point.latitude)||!Number.isFinite(point.longitude)||point.latitude<20||point.latitude>46||point.longitude<122||point.longitude>154)continue;
  valid.set(row.id,row as FacilityLocation);
 }
 return entries.map(entry=>{
  const row=valid.get(entry.id);
  if(!row||!entry.id.startsWith('facility-')||entry.coordinates||!entry.addressKey||row.addressKey!==entry.addressKey)return entry;
  return {...entry,coordinates:{latitude:row.location.latitude,longitude:row.location.longitude},locationAccuracy:row.location.accuracy};
 });
}

// FR-04.8: visibility and municipal membership are checked before using cached coordinates.
export async function locateMunicipalityFacilities<T extends FacilityAddress&{id:string;is_published:boolean}>(facilities:readonly T[],municipalityId:string,locate:(facility:T)=>Promise<AddressLocation|undefined>):Promise<FacilityLocation[]>{
 const city=municipalityById.get(municipalityId);if(!city)return [];
 const rows=facilities.filter(row=>row.is_published&&row.prefecture===city.prefecture&&facilityLocality(row.prefecture,row.municipality,row.address)?.id===city.id&&facilityAddressKey(row));
 const queries=new Map<string,T>();
 for(const row of rows)queries.set(facilityAddressKey(row)!,row);
 const queue=[...queries.entries()],results=new Map<string,AddressLocation>();
 let next=0;
 await Promise.all(Array.from({length:Math.min(4,queue.length)},async()=>{
  while(next<queue.length){
   const [key,row]=queue[next++];
   try{const result=await locate(row);if(result)results.set(key,result);}catch{/* Keep unavailable locations in the municipality summary. */}
  }
 }));
 return rows.flatMap(row=>{
  const addressKey=facilityAddressKey(row)!,location=results.get(addressKey);
  return location?[{id:'facility-'+row.id,addressKey,location}]:[];
 });
}
