import {Delaunay} from 'd3-delaunay';
import {categories,money,type Category,type Coach,type Post,type Profile,type Plan} from './domain';
import {prefectureShapes,pointBounds,projectGeographic,projectNational,type Point,type Bounds} from './prefecture-shapes';
import {facilityLocality,localAreas,localAreaForMunicipality,localitiesFromArea} from './localities';
import {facilityAddressKey} from './address-location';
export {prefectureShapes} from './prefecture-shapes';

export const regions=['北海道','東北','関東','甲信越・北陸','東海','関西','中国','四国','九州・沖縄'] as const;
export type Region=typeof regions[number];
// Representative points for an illustrative, prefecture-level map, not fishing locations.
const points:[string,Region,number,number][]=[
 ['北海道','北海道',43.4,142.5],['青森県','東北',40.7,140.7],['岩手県','東北',39.6,141.3],['宮城県','東北',38.4,140.9],['秋田県','東北',39.7,140.2],['山形県','東北',38.4,140.1],['福島県','東北',37.4,140.1],
 ['茨城県','関東',36.3,140.3],['栃木県','関東',36.7,139.8],['群馬県','関東',36.5,138.9],['埼玉県','関東',36.0,139.3],['千葉県','関東',35.5,140.2],['東京都','関東',35.7,139.6],['神奈川県','関東',35.4,139.3],
 ['新潟県','甲信越・北陸',37.6,138.9],['富山県','甲信越・北陸',36.6,137.2],['石川県','甲信越・北陸',36.8,136.7],['福井県','甲信越・北陸',36.0,136.2],['山梨県','甲信越・北陸',35.6,138.6],['長野県','甲信越・北陸',36.2,138.1],
 ['岐阜県','東海',35.8,137.1],['静岡県','東海',35.0,138.4],['愛知県','東海',35.0,137.0],['三重県','東海',34.6,136.5],
 ['滋賀県','関西',35.2,136.1],['京都府','関西',35.2,135.5],['大阪府','関西',34.6,135.5],['兵庫県','関西',35.0,134.8],['奈良県','関西',34.3,135.9],['和歌山県','関西',33.9,135.5],
 ['鳥取県','中国',35.4,133.8],['島根県','中国',35.1,132.6],['岡山県','中国',34.9,133.8],['広島県','中国',34.6,132.8],['山口県','中国',34.2,131.5],
 ['徳島県','四国',33.9,134.3],['香川県','四国',34.2,134.0],['愛媛県','四国',33.7,132.8],['高知県','四国',33.5,133.5],
 ['福岡県','九州・沖縄',33.5,130.6],['佐賀県','九州・沖縄',33.3,130.1],['長崎県','九州・沖縄',32.9,129.8],['熊本県','九州・沖縄',32.6,130.8],['大分県','九州・沖縄',33.2,131.5],['宮崎県','九州・沖縄',32.2,131.3],['鹿児島県','九州・沖縄',31.6,130.6],['沖縄県','九州・沖縄',26.3,127.7],
];
export function projectJapan(lon:number,lat:number){return lat<29?{x:105+(lon-124)*31,y:138+(28-lat)*35}:{x:55+(lon-128)*31,y:26+(46-lat)*35};}
export const prefectures=points.map(([name,region,lat,lon])=>({name,region,latitude:lat,longitude:lon,...projectJapan(lon,lat)}));
// Legacy outline helper retained for compatibility; the interactive map uses
// prefectureShapes from the simplified administrative polygons instead.
// 沖縄県は南西諸島の別枠に表示するため、本土と同じ図には含めない（別枠に1県だけで区切る相手がいない）。
// 日本の釣りマップ FR-02b（docs/ai-dlc/specs/02-records/explore-screen）
export function prefectureBoundaries(){
 const mainland=prefectures.filter(p=>p.name!=='沖縄県');
 const delaunay=Delaunay.from(mainland,p=>p.x,p=>p.y);
 return delaunay.voronoi([0,0,650,620]).render();
}

// Require an explicit prefecture name. Never infer a catch location from the author's residence.
// Multiple prefectures are supported for a coach who works across prefectural borders.
export function findPrefectures(area:string){
 return prefectures.filter(p=>area.normalize('NFKC').includes(p.name));
}
export const mapKinds={catch:{label:'釣果',english:'CATCH',color:'#087eaa'},coach:{label:'コーチ',english:'COACH',color:'#df7547'},pond:{label:'釣り堀',english:'FISHING POND',color:'#6c60b1'},spot:{label:'釣りスポット',english:'FISHING SPOT',color:'#268677'},shop:{label:'釣具店',english:'TACKLE SHOP',color:'#b8763a'}} as const;
export type MapKind=keyof typeof mapKinds;
// Coordinates must be explicitly supplied for public map use. Never derive
// exact fishing locations from a member's residence or from a free-text area.
export type MapDetails={description:string;fields:{label:string;value:string}[]};
export type MapEntry={id:string;kind:MapKind;title:string;area:string;description:string;details?:MapDetails;category?:Category;href?:string;prefectures:string[];coordinates?:MapCoordinates;addressKey?:string;locationAccuracy?:'address'|'town';municipalityIds?:string[];localAreaIds?:string[]};
export type FacilityKind='pond'|'spot'|'shop';
export type MapFacility={id:string;kind:FacilityKind;name:string;description:string;prefecture:string;municipality:string;address:string;phone:string;business_hours:string;price_info:string;is_published:boolean;coordinates?:MapCoordinates};
type MapPost=Pick<Post,'id'|'title'|'area'|'is_public'|'category'|'species'|'fished_on'|'size_cm'>&Partial<Pick<Post,'memo'|'method'|'rod'|'reel'|'lure'>>;
type MapCoach=Pick<Coach,'user_id'|'status'|'area'|'category'|'years_experience'>&Partial<Pick<Coach,'introduction'>>&{profile:Pick<Profile,'display_name'>|null;plans?:Pick<Plan,'id'|'title'|'description'|'price_yen'|'duration_minutes'|'is_active'>[]};
// Future approved ponds/spots use the same MapEntry contract; no real venues are fabricated.
// 日本の釣りマップ FR-01（docs/ai-dlc/specs/02-records/explore-screen）
export function makeMapEntries(posts:MapPost[],coaches:MapCoach[],facilities:MapFacility[]=[]):MapEntry[]{
 return [
  ...posts.filter(p=>p.is_public).map(p=>({id:'catch-'+p.id,kind:'catch' as const,title:p.title,area:p.area,description:[p.species,p.size_cm?`${p.size_cm}cm`:'',p.fished_on.replaceAll('-','.')].filter(Boolean).join(' · '),details:{description:p.memo||'',fields:[{label:'釣行日',value:p.fished_on.replaceAll('-','.')},{label:'魚種',value:p.species},{label:'サイズ',value:p.size_cm?`${p.size_cm}cm`:''},{label:'釣り方',value:p.method||''},{label:'ロッド',value:p.rod||''},{label:'リール',value:p.reel||''},{label:'ルアー・餌',value:p.lure||''}]},category:p.category,href:'/posts/'+p.id,prefectures:findPrefectures(p.area).map(p=>p.name),...localitiesFromArea(p.area)})),
  ...coaches.filter(c=>c.status==='approved').map(c=>({id:'coach-'+c.user_id,kind:'coach' as const,title:c.profile?.display_name||'釣りコーチ',area:c.area,description:`${categories[c.category]} · 釣り歴 ${c.years_experience}年（自己申告）`,details:{description:c.introduction||'',fields:[{label:'釣り歴',value:`${c.years_experience}年（自己申告）`},...(c.plans||[]).filter(plan=>plan.is_active).map(plan=>({label:plan.title,value:`${money(plan.price_yen)} / ${plan.duration_minutes}分\n${plan.description}`}))]},category:c.category,href:'/anglers/'+c.user_id,prefectures:findPrefectures(c.area).map(p=>p.name),...localitiesFromArea(c.area)})),
  // 座標が明示された施設だけ個別位置へ配置し、それ以外は県に集約する。詳細ページが無いため href は付けない。
  // 住所・電話番号・営業時間・料金案内は詳細ページが無い代わりに description に連ねて表示する
  ...facilities.filter(f=>f.is_published).map(f=>{
   const place=facilityLocality(f.prefecture,f.municipality,f.address),localArea=place?localAreaForMunicipality(place.id):undefined;
   const area=[f.prefecture,place?.name||f.municipality].filter(Boolean).join(' '),description=[f.description,f.address,f.phone,f.business_hours,f.price_info].filter(Boolean).join(' · ');
   return {id:'facility-'+f.id,kind:f.kind,title:f.name,area,description,details:{description:f.description,fields:[{label:'住所',value:f.address},{label:'電話番号',value:f.phone},{label:'営業時間・定休日',value:f.business_hours},{label:'料金・利用案内',value:f.price_info}]},prefectures:findPrefectures(f.prefecture).map(p=>p.name),municipalityIds:place?[place.id]:[],localAreaIds:localArea?[localArea.id]:[],addressKey:facilityAddressKey(f),...(validMapCoordinates(f.coordinates)?{coordinates:f.coordinates}:{})};
  }),
 ];
}
export function filterMapEntries(entries:MapEntry[],{kind='all',region='all',prefecture='',localArea='',municipality='',q=''}:{kind?:MapKind|'all';region?:Region|'all';prefecture?:string;localArea?:string;municipality?:string;q?:string}={}){
 const search=q.trim().normalize('NFKC').toLocaleLowerCase('ja-JP');
 return entries.filter(entry=>{
  const areaIds=entry.localAreaIds??(localArea||search?localitiesFromArea(entry.area).localAreaIds:[]);
  const cityIds=entry.municipalityIds??(municipality?localitiesFromArea(entry.area).municipalityIds:[]);
  const areaNames=search?localAreas.filter(area=>areaIds.includes(area.id)).map(area=>area.name):[];
  return(kind==='all'||entry.kind===kind)&&(!prefecture||entry.prefectures.includes(prefecture))&&(!localArea||areaIds.includes(localArea))&&(!municipality||cityIds.includes(municipality))&&(region==='all'||entry.prefectures.some(name=>prefectures.some(p=>p.name===name&&p.region===region)))&&(!search||[entry.title,entry.area,entry.description,...areaNames].join(' ').normalize('NFKC').toLocaleLowerCase('ja-JP').includes(search));
 });
}
// エリアから探す FR（docs/ai-dlc/specs/02-records/explore-screen）: 地方名の横に表示する、地方ごとの合計件数
// 日本の釣りマップ FR-02a.1（docs/ai-dlc/specs/02-records/explore-screen）
export function regionCounts(entries:MapEntry[]){
 return Object.fromEntries(regions.map(region=>[region,entries.filter(entry=>entry.prefectures.some(name=>prefectures.some(p=>p.name===name&&p.region===region))).length])) as Record<Region,number>;
}
export function groupMapEntries(entries:MapEntry[],region:Region|'all'='all'){
 return prefectures.filter(p=>region==='all'||p.region===region).flatMap(prefecture=>{
  const items=entries.filter(entry=>entry.prefectures.includes(prefecture.name));
  return items.length?[{...prefecture,entries:items}]:[];
 });
}

export type MapCoordinates={latitude:number;longitude:number};
export type MapViewport={width:number;height:number;bounds:Bounds;scale:number;offsetX:number;offsetY:number;rotation:number;national:boolean};
function rotateMapPoint(point:Point,degrees:number):Point{
 const angle=degrees*Math.PI/180,cos=Math.cos(angle),sin=Math.sin(angle);
 return{x:point.x*cos-point.y*sin,y:point.x*sin+point.y*cos};
}
export function validMapCoordinates(value:MapCoordinates|undefined):value is MapCoordinates{return !!value&&Number.isFinite(value.latitude)&&Number.isFinite(value.longitude)&&value.latitude>=20&&value.latitude<=46&&value.longitude>=122&&value.longitude<=154;}
// FR-02.2 / FR-02.3: the frame is defined by geography, including areas with no listings.
export function getMapViewport({region='all',prefecture='',width=640,height=420,coordinates=[],focus=[],focusPadding=8}:{region?:Region|'all';prefecture?:string;width?:number;height?:number;coordinates?:MapCoordinates[];focus?:MapCoordinates[];focusPadding?:number}={}):MapViewport{
 const selected=prefectureShapes.find(p=>p.name===prefecture),national=!selected&&region==='all';
 const shapes=selected?[selected]:prefectureShapes.filter(s=>prefectures.some(p=>p.name===s.name&&p.region===region));
 const rotation=national?12:0;
 // FR-02a.5: fit the rotated archipelago rather than a generous fixed box.
 const nationalBounds=prefectureShapes.map(shape=>shape.nationalBounds).concat({minX:65,maxX:315,minY:100,maxY:300});
 const baseBounds=national?pointBounds(nationalBounds.flatMap(b=>[b.minX,b.maxX].flatMap(x=>[b.minY,b.maxY].map(y=>rotateMapPoint({x,y},rotation))))):pointBounds(shapes.flatMap(s=>{
   const b=!selected&&s.name==='沖縄県'?s.allBounds:s.bounds;
   return [{x:b.minX,y:b.minY},{x:b.maxX,y:b.maxY}];
 }));
 const focusPoints=focus.filter(validMapCoordinates).map(c=>projectGeographic(c.longitude,c.latitude));
 const focusBounds=focusPoints.length?pointBounds(focusPoints):undefined;
 const margin=Number.isFinite(focusPadding)?Math.max(.5,Math.min(8,focusPadding)):8;
 const geoBounds=!national&&focusBounds?{minX:focusBounds.minX-margin,maxX:focusBounds.maxX+margin,minY:focusBounds.minY-margin,maxY:focusBounds.maxY+margin}:baseBounds;
 const precise=coordinates.filter(validMapCoordinates).map(c=>projectGeographic(c.longitude,c.latitude));
 const bounds=precise.length&&!national?pointBounds([{x:geoBounds.minX,y:geoBounds.minY},{x:geoBounds.maxX,y:geoBounds.maxY},...precise]):geoBounds;
 const w=Number.isFinite(width)&&width>0?width:640,h=Number.isFinite(height)&&height>0?height:420;
 const paddingX=national?Math.min(w*.045,24):Math.min(w*.11,52),paddingY=national?Math.min(h*.045,20):Math.min(h*.1,36);
 const scale=Math.min((w-paddingX*2)/Math.max(bounds.maxX-bounds.minX,1),(h-paddingY*2)/Math.max(bounds.maxY-bounds.minY,1));
 return {width:w,height:h,bounds,scale,offsetX:w/2-(bounds.minX+bounds.maxX)/2*scale,offsetY:h/2-(bounds.minY+bounds.maxY)/2*scale,rotation,national};
}
export function mapScreenPoint(coordinates:MapCoordinates,frame:MapViewport):Point{
 const p=rotateMapPoint((frame.national?projectNational:projectGeographic)(coordinates.longitude,coordinates.latitude),frame.rotation);
 return{x:p.x*frame.scale+frame.offsetX,y:p.y*frame.scale+frame.offsetY};
}

export type MapMarker={id:string;label:string;point:Point;labelPoint?:Point;entries:MapEntry[];precision:'prefecture'|'local-area'|'municipality'|'exact'|'address'|'town'|'cluster';prefecture?:string;region?:Region;localArea?:string;municipality?:string};
export type PlacedMapMarker=MapMarker&{x:number;y:number;width:number;height:number};
export function markerCapacity({width,height}:{width:number;height:number}){const w=Math.min(width-20,width<420?112:128);return Math.max(1,Math.floor((width-10)/(w+10)))*Math.max(1,Math.floor((height-10)/54));}
// FR-01.5: one fixed-size card contains both count and name. Collision bounds
// include the whole card; geographic zoom never enlarges the marker itself.
export function layoutMapMarkers(markers:MapMarker[],size:{width:number;height:number}):PlacedMapMarker[]{
 const width=Math.min(size.width-20,size.width<420?112:128),height=44,gap=10,margin=10;
 const columns=Math.max(1,Math.floor((size.width-margin*2+gap)/(width+gap))),rows=Math.max(1,Math.floor((size.height-margin*2+gap)/(height+gap)));
 const left=(size.width-(columns*width+(columns-1)*gap))/2,top=(size.height-(rows*height+(rows-1)*gap))/2;
 const grid=Array.from({length:columns*rows},(_,i)=>({x:left+(i%columns)*(width+gap),y:top+Math.floor(i/columns)*(height+gap)}));
 const clamp=(v:number,min:number,max:number)=>Math.max(min,Math.min(max,v));
 const overlap=(a:{x:number;y:number},b:{x:number;y:number})=>a.x<b.x+width+gap&&a.x+width+gap>b.x&&a.y<b.y+height+gap&&a.y+height+gap>b.y;
 const sorted=[...markers].sort((a,b)=>a.point.y-b.point.y||a.point.x-b.point.x||a.id.localeCompare(b.id));
 const cost=(p:{x:number;y:number},m:MapMarker)=>m.labelPoint?(p.x+width/2-m.labelPoint.x)**2+(p.y+height/2-m.labelPoint.y)**2:(p.x+width/2-m.point.x)**2+(p.y+height-m.point.y+10)**2;
 const placed:PlacedMapMarker[]=[];
 for(const marker of sorted){
  const preferred=marker.labelPoint?[{x:marker.labelPoint.x-width/2,y:marker.labelPoint.y-height/2}]:[];
  const near=[...preferred,{x:marker.point.x-width/2,y:marker.point.y-height-12},{x:marker.point.x-width/2,y:marker.point.y+12},{x:marker.point.x+16,y:marker.point.y-height/2},{x:marker.point.x-width-16,y:marker.point.y-height/2}].map(p=>({x:clamp(p.x,margin,size.width-width-margin),y:clamp(p.y,margin,size.height-height-margin)}));
  const candidates=[...near,...grid].sort((a,b)=>cost(a,marker)-cost(b,marker));
  const position=candidates.find(p=>placed.every(other=>!overlap(p,other)));
  if(!position){
   // A regular grid always has a disjoint slot for each marker when capacity
   // permits. Reassign all cards rather than leave a collision on screen.
   const available=[...grid];
   return sorted.map(item=>{available.sort((a,b)=>cost(a,item)-cost(b,item));const spot=available.shift();if(!spot)throw new Error('Map marker capacity exceeded; group nearby locations before layout');return {...item,...spot,width,height};});
  }
  placed.push({...marker,...position,width,height});
 }
 return placed;
}

// FR-01.6: prefecture view can receive individual, public coordinates. Entries
// without coordinates stay in a clearly marked approximate prefecture group.
export function mapMarkersForEntries(entries:MapEntry[],{region='all',prefecture='',frame}:{region?:Region|'all';prefecture?:string;frame:MapViewport}):MapMarker[]{
 if(frame.national)return regions.map(name=>{
  const members=prefectures.filter(p=>p.region===name),positions=members.map(p=>mapScreenPoint(p,frame));
  const point={x:positions.reduce((s,p)=>s+p.x,0)/positions.length,y:positions.reduce((s,p)=>s+p.y,0)/positions.length};
  const offsets:Record<Region,Point>={'北海道':{x:85,y:-15},'東北':{x:110,y:0},'関東':{x:105,y:40},'甲信越・北陸':{x:-90,y:-55},'東海':{x:55,y:80},'関西':{x:-25,y:-75},'中国':{x:-90,y:-35},'四国':{x:-30,y:70},'九州・沖縄':{x:-90,y:20}};
  // On phones, reserve two ordered label columns. Geographic anchors and
  // dotted leaders stay separate, so western labels do not jump north.
  const phoneSlots:Record<Region,{side:'left'|'right';row:number}>={'北海道':{side:'right',row:0},'東北':{side:'right',row:1},'関東':{side:'right',row:2},'東海':{side:'right',row:3},'四国':{side:'right',row:4},'甲信越・北陸':{side:'left',row:1},'関西':{side:'left',row:2},'中国':{side:'left',row:3},'九州・沖縄':{side:'left',row:4}};
  const slot=phoneSlots[name];
  const sideInset=10+(frame.width<420?112:128)/2;
  const labelPoint=frame.width<560?{x:slot.side==='left'?sideInset:frame.width-sideInset,y:(frame.height-260)/2+22+slot.row*54}:{x:point.x+offsets[name].x,y:point.y+offsets[name].y};
  return {id:'region-'+name,label:name,point,labelPoint,entries:filterMapEntries(entries,{region:name}),precision:'prefecture',region:name};
 });
 // FR-02.2: keep every prefecture selectable, including zero-result areas.
 if(!prefecture)return prefectures.filter(p=>region==='all'||p.region===region).map(place=>({id:'prefecture-'+place.name,label:place.name,point:mapScreenPoint(place,frame),entries:filterMapEntries(entries,{prefecture:place.name}),precision:'prefecture',prefecture:place.name}));
 const items=filterMapEntries(entries,{prefecture}),place=prefectures.find(p=>p.name===prefecture);
 if(!place)return [];
 const exact=items.filter(e=>validMapCoordinates(e.coordinates)),approximate=items.filter(e=>!validMapCoordinates(e.coordinates));
 let markers:MapMarker[]=exact.map(e=>({id:'entry-'+e.id,label:e.title,point:mapScreenPoint(e.coordinates!,frame),entries:[e],precision:e.locationAccuracy||'exact',prefecture}));
 const capacity=markerCapacity(frame)-(approximate.length?1:0);
 if(markers.length>capacity){
  // Reduce the spatial grid until nearby entries fit available screen slots.
  // Every listing remains reachable from the cluster and the result list.
  for(let divisions=Math.max(1,Math.floor(Math.sqrt(Math.max(1,capacity))));divisions>=1;divisions--){
   const groups=new Map<string,MapMarker[]>();
   for(const marker of markers){const key=`${Math.min(divisions-1,Math.max(0,Math.floor(marker.point.x/frame.width*divisions)))},${Math.min(divisions-1,Math.max(0,Math.floor(marker.point.y/frame.height*divisions)))}`;groups.set(key,[...(groups.get(key)||[]),marker]);}
   if(groups.size<=Math.max(1,capacity)){
    markers=[...groups.entries()].map(([key,group])=>group.length===1?group[0]:({id:'cluster-'+key,label:`${group.length}件の掲載`,point:{x:group.reduce((s,p)=>s+p.point.x,0)/group.length,y:group.reduce((s,p)=>s+p.point.y,0)/group.length},entries:group.flatMap(p=>p.entries),precision:'cluster',prefecture}));break;
   }
  }
 }
 if(approximate.length)markers.push({id:'approximate-'+prefecture,label:prefecture,point:mapScreenPoint(place,frame),entries:approximate,precision:'prefecture',prefecture});
 return markers;
}
