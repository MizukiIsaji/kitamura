import catalog from './municipalities.json';
export type Municipality={id:string;prefecture:string;name:string;shortName:string;latitude:number;longitude:number};
export type LocalArea={id:string;prefecture:string;name:string;municipalityIds:string[];latitude:number;longitude:number};
export const municipalities:Municipality[]=catalog.municipalities;
export const municipalityById=new Map(municipalities.map(p=>[p.id,p]));
// FR-04.1: Gifu's official five-area classification, covering all 42 municipalities.
// https://www.pref.gifu.lg.jp/page/6058.html (retrieved 2026-10-20)
const gifuGroups=[
 ['gifu-gifu','岐阜',['岐阜市','羽島市','各務原市','山県市','瑞穂市','本巣市','岐南町','笠松町','北方町']],
 ['gifu-seino','西濃',['大垣市','海津市','養老町','垂井町','関ケ原町','神戸町','輪之内町','安八町','揖斐川町','大野町','池田町']],
 ['gifu-chuno','中濃',['関市','美濃市','美濃加茂市','可児市','郡上市','坂祝町','富加町','川辺町','七宗町','八百津町','白川町','東白川村','御嵩町']],
 ['gifu-tono','東濃',['多治見市','中津川市','瑞浪市','恵那市','土岐市']],
 ['gifu-hida','飛騨',['高山市','飛騨市','下呂市','白川村']],
] as const;
export const localAreas:LocalArea[]=gifuGroups.map(([id,name,names])=>{
 const members=names.map(shortName=>{const found=municipalities.filter(p=>p.prefecture==='岐阜県'&&p.shortName===shortName);if(found.length!==1)throw Error('Invalid Gifu municipality mapping: '+shortName);return found[0];});
 return{id,prefecture:'岐阜県',name,municipalityIds:members.map(p=>p.id),latitude:members.reduce((sum,p)=>sum+p.latitude,0)/members.length,longitude:members.reduce((sum,p)=>sum+p.longitude,0)/members.length};
});
export function municipalitiesForPrefecture(prefecture:string){return municipalities.filter(p=>p.prefecture===prefecture);}
export function localAreasForPrefecture(prefecture:string){return localAreas.filter(p=>p.prefecture===prefecture);}
export function localAreaForMunicipality(id:string){return localAreas.find(p=>p.municipalityIds.includes(id));}

const prefectureNames=[...new Set(municipalities.map(p=>p.prefecture))];
const normalize=(text:string)=>text.normalize('NFKC').replace(/\s/g,'').replaceAll('ヶ','ケ');
// Facility addresses must start with a recognized municipal name. Do not
// treat an arbitrary mention inside a business description as its address.
export function resolveMunicipality(prefecture:string,text:string):Municipality|undefined{
 let value=normalize(text).replace(/^〒?\d{3}-?\d{4}/,'');
 const prefix=prefectureNames.find(name=>value.startsWith(name));
 if(prefix&&prefix!==prefecture)return undefined;
 if(prefix)value=value.slice(prefix.length);
 const candidates=municipalitiesForPrefecture(prefecture);
 const full=candidates.filter(p=>value.startsWith(normalize(p.name))).sort((a,b)=>b.name.length-a.name.length);
 if(full.length)return full[0];
 const short=candidates.filter(p=>value.startsWith(normalize(p.shortName))).sort((a,b)=>b.shortName.length-a.shortName.length);
 const longest=short[0]?.shortName.length;
 return longest&&short.filter(p=>p.shortName.length===longest).length===1?short[0]:undefined;
}

// FR-04.4: only the explicitly stated prefecture/area is used; never a profile.
export function localitiesFromArea(text:string):{municipalityIds:string[];localAreaIds:string[]}{
 const value=normalize(text),municipalityIds=new Set<string>(),localAreaIds=new Set<string>();
 const mentions=prefectureNames.flatMap(prefecture=>{
  const result:{prefecture:string;index:number}[]=[];let start=0,index=value.indexOf(prefecture,start);
  while(index>=0){result.push({prefecture,index});start=index+prefecture.length;index=value.indexOf(prefecture,start);}return result;
 }).sort((a,b)=>a.index-b.index);
 mentions.forEach((mention,i)=>{
  const segment=value.slice(mention.index+mention.prefecture.length,mentions[i+1]?.index);
  const candidates=municipalitiesForPrefecture(mention.prefecture);
  const matched=candidates.filter(p=>segment.includes(normalize(p.name))||(candidates.filter(other=>normalize(other.shortName)===normalize(p.shortName)).length===1&&segment.includes(normalize(p.shortName))));
  for(const place of matched){
   if(matched.some(other=>other.id!==place.id&&normalize(other.name).includes(normalize(place.shortName))&&other.name.length>place.name.length))continue;
   municipalityIds.add(place.id);const area=localAreaForMunicipality(place.id);if(area)localAreaIds.add(area.id);
  }
  for(const area of localAreasForPrefecture(mention.prefecture))if(segment.includes(area.name))localAreaIds.add(area.id);
 });
 return {municipalityIds:[...municipalityIds],localAreaIds:[...localAreaIds]};
}

export function facilityLocality(prefecture:string,municipality:string,address:string){return resolveMunicipality(prefecture,municipality.trim()||address);}
