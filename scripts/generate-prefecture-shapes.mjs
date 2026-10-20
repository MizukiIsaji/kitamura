// Natural Earth 5.1.2, public domain. Run with a downloaded Admin-1 GeoJSON.
// https://www.naturalearthdata.com/downloads/10m-cultural-vectors/10m-admin-1-states-provinces/
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
const [input,output='src/lib/prefecture-geometry.json']=process.argv.slice(2);
if(!input)throw Error('Usage: node scripts/generate-prefecture-shapes.mjs INPUT.geojson [OUTPUT.json]');
const bytes=fs.readFileSync(input),source=JSON.parse(bytes);
function distance(p,a,b){const x=b[0]-a[0],y=b[1]-a[1],t=Math.max(0,Math.min(1,((p[0]-a[0])*x+(p[1]-a[1])*y)/(x*x+y*y||1)));return Math.hypot(p[0]-a[0]-t*x,p[1]-a[1]-t*y);}
function simplify(points){if(points.length<4)return points;let max=0,index=0;for(let i=1;i<points.length-1;i++){const d=distance(points[i],points[0],points.at(-1));if(d>max){max=d;index=i;}}return max>.005?[...simplify(points.slice(0,index+1)).slice(0,-1),...simplify(points.slice(index))]:[points[0],points.at(-1)];}
const prefectures=source.features.filter(f=>f.properties.adm0_a3==='JPN').map(f=>{
 const polygons=f.geometry.type==='Polygon'?[f.geometry.coordinates]:f.geometry.coordinates;
 const rings=polygons.flatMap(p=>p.map(r=>simplify(r).map(([lon,lat])=>[+lon.toFixed(4),+lat.toFixed(4)]))).filter(r=>r.length>=4);
 return {name:f.properties.name_ja,code:f.properties.iso_3166_2,rings};
}).sort((a,b)=>a.code.localeCompare(b.code));
if(prefectures.length!==47||new Set(prefectures.map(p=>p.name)).size!==47)throw Error('Expected 47 unique Japanese prefectures');
fs.mkdirSync(path.dirname(output),{recursive:true});
fs.writeFileSync(output,JSON.stringify({source:'Natural Earth 5.1.2 Admin 1',url:'https://raw.githubusercontent.com/nvkelso/natural-earth-vector/v5.1.2/geojson/ne_10m_admin_1_states_provinces.geojson',sha256:createHash('sha256').update(bytes).digest('hex'),toleranceDegrees:.005,prefectures})+'\n');
console.log(`Generated ${prefectures.length} prefectures, ${fs.statSync(output).size} bytes`);
