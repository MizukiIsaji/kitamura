import geometry from './prefecture-geometry.json';
export type Point={x:number;y:number};
export type Bounds={minX:number;minY:number;maxX:number;maxY:number};
export function projectGeographic(longitude:number,latitude:number):Point{return{x:55+(longitude-128)*31,y:26+(46-latitude)*35};}
export function projectNational(longitude:number,latitude:number):Point{return latitude<29?{x:105+(longitude-124)*31,y:138+(28-latitude)*35}:projectGeographic(longitude,latitude);}
export function pointBounds(points:Point[]):Bounds{return {minX:Math.min(...points.map(p=>p.x)),maxX:Math.max(...points.map(p=>p.x)),minY:Math.min(...points.map(p=>p.y)),maxY:Math.max(...points.map(p=>p.y))};}
function ringArea(ring:number[][]){return Math.abs(ring.reduce((sum,p,i)=>{const next=ring[(i+1)%ring.length];return sum+p[0]*next[1]-next[0]*p[1];},0)/2);}
function ringPath(ring:number[][],project:(lon:number,lat:number)=>Point){return ring.map(([lon,lat],i)=>{const p=project(lon,lat);return `${i?'L':'M'}${p.x.toFixed(2)} ${p.y.toFixed(2)}`;}).join('')+'Z';}
// FR-02.3 / FR-02b: outlines are simplified administrative polygons, not Voronoi cells.
export const prefectureShapes=geometry.prefectures.map(prefecture=>{
 const main=prefecture.rings.reduce((a,b)=>ringArea(a)>ringArea(b)?a:b),mainBounds=pointBounds(main.map(([lon,lat])=>projectGeographic(lon,lat)));
 const marginX=Math.max(15,(mainBounds.maxX-mainBounds.minX)*.5),marginY=Math.max(15,(mainBounds.maxY-mainBounds.minY)*.5);
 const nearby=prefecture.rings.filter(r=>r.some(([lon,lat])=>{const p=projectGeographic(lon,lat);return p.x>=mainBounds.minX-marginX&&p.x<=mainBounds.maxX+marginX&&p.y>=mainBounds.minY-marginY&&p.y<=mainBounds.maxY+marginY;}));
 const nationalRings=prefecture.name==='東京都'?nearby:prefecture.rings;
 return {...prefecture,path:prefecture.rings.map(r=>ringPath(r,projectGeographic)).join(''),nationalPath:nationalRings.map(r=>ringPath(r,projectNational)).join(''),nationalBounds:pointBounds(nationalRings.flatMap(r=>r.map(([lon,lat])=>projectNational(lon,lat)))),bounds:pointBounds(nearby.flatMap(r=>r.map(([lon,lat])=>projectGeographic(lon,lat)))),allBounds:pointBounds(prefecture.rings.flatMap(r=>r.map(([lon,lat])=>projectGeographic(lon,lat))))};
});
