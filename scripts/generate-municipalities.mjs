// Geolonia Japanese Addresses v2 (CC BY 4.0), based on Digital Agency ABR.
// Group designated-city wards into their parent city; retain Tokyo special wards.
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
const [input,output='src/lib/municipalities.json',retrievedAt=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Tokyo',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date())]=process.argv.slice(2);
if(!input)throw Error('Usage: node scripts/generate-municipalities.mjs SOURCE.json [OUTPUT.json]');
const bytes=fs.readFileSync(input),raw=JSON.parse(bytes),municipalities=[];
if(raw.data?.length!==47)throw Error('Expected 47 prefectures');
for(const prefecture of raw.data){
 const groups=new Map();
 for(const city of prefecture.cities){
  const name=(city.county||'')+city.city;
  const points=groups.get(name)?.points||[];
  if(!Array.isArray(city.point)||!city.point.every(Number.isFinite))throw Error('Invalid municipal point: '+name);
  points.push(city.point);
  groups.set(name,{name,shortName:city.city,points});
 }
 for(const city of groups.values()){
  const longitude=city.points.reduce((sum,p)=>sum+p[0],0)/city.points.length,latitude=city.points.reduce((sum,p)=>sum+p[1],0)/city.points.length;
  if(latitude<20||latitude>46||longitude<122||longitude>154)throw Error('Point outside Japan: '+city.name);
  municipalities.push({id:prefecture.pref+'/'+city.name,prefecture:prefecture.pref,name:city.name,shortName:city.shortName,latitude:+latitude.toFixed(6),longitude:+longitude.toFixed(6)});
 }
}
if(new Set(municipalities.map(p=>p.id)).size!==municipalities.length)throw Error('Duplicate municipal names');
fs.mkdirSync(path.dirname(output),{recursive:true});
fs.writeFileSync(output,JSON.stringify({source:'Geolonia Japanese Addresses v2 / Digital Agency ABR',url:'https://japanese-addresses-v2.geoloniamaps.com/api/ja.json',license:'CC BY 4.0',attribution:'Geolonia / Digital Agency',retrievedAt,sourceUpdated:raw.meta.updated,sha256:createHash('sha256').update(bytes).digest('hex'),changes:'Selected municipal names and representative points; aggregated designated-city wards; rounded to six decimals.',municipalities})+'\n');
console.log(JSON.stringify({municipalities:municipalities.length,prefectures:47,bytes:fs.statSync(output).size,gifu:municipalities.filter(p=>p.prefecture==='岐阜県').length}));
