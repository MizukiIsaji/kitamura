import {test} from 'node:test';
import assert from 'node:assert/strict';
import * as geography from '../src/lib/fishing-map';

test('FR-02a.5: 全国は右に傾けて余白を抑え、輪郭とピンに同じ変換を使う',()=>{
 const frame=geography.getMapViewport({width:760,height:430});
 assert.equal(Reflect.get(frame,'rotation'),12);
 assert(frame.scale>.75,'従来の約0.63倍より大きく列島を表示する');
 const p=geography.mapScreenPoint({latitude:35.5,longitude:140.2},frame);
 const x=55+(140.2-128)*31,y=26+(46-35.5)*35,angle=12*Math.PI/180;
 assert(Math.abs(p.x-((x*Math.cos(angle)-y*Math.sin(angle))*frame.scale+frame.offsetX))<1e-8);
 assert(Math.abs(p.y-((x*Math.sin(angle)+y*Math.cos(angle))*frame.scale+frame.offsetY))<1e-8);
});

test('FR-02.2: 地方では掲載0件の県も名前と0件のピンから選べる',()=>{
 const frame=geography.getMapViewport({region:'関東',width:680,height:420});
 const entries:geography.MapEntry[]=[{id:'a',kind:'shop',title:'千葉の施設',area:'千葉県',description:'',prefectures:['千葉県']}];
 const markers=geography.mapMarkersForEntries(entries,{region:'関東',frame});
 assert.equal(markers.length,7);
 assert.equal(markers.find(p=>p.prefecture==='千葉県')?.entries.length,1);
 assert.equal(markers.find(p=>p.prefecture==='東京都')?.entries.length,0);
 assert.deepEqual(new Set(markers.map(p=>p.prefecture)),new Set(geography.prefectures.filter(p=>p.region==='関東').map(p=>p.name)));
});

test('FR-02.3: 47都道府県は0件でも有限の余白付き表示範囲を持つ',()=>{
 assert.equal(geography.prefectureShapes.length,47);
 assert.equal(new Set(geography.prefectureShapes.map(p=>p.name)).size,47);
 for(const shape of geography.prefectureShapes){
  const frame=geography.getMapViewport({prefecture:shape.name,width:300,height:330});
  assert(!frame.national);
  assert(Number.isFinite(frame.scale)&&frame.scale>0,shape.name);
  for(const x of [shape.bounds.minX,shape.bounds.maxX])for(const y of [shape.bounds.minY,shape.bounds.maxY]){
   assert(x*frame.scale+frame.offsetX>=20&&x*frame.scale+frame.offsetX<=280,shape.name);
   assert(y*frame.scale+frame.offsetY>=20&&y*frame.scale+frame.offsetY<=310,shape.name);
  }
  assert.deepEqual(geography.mapMarkersForEntries([],{prefecture:shape.name,frame}),[]);
 }
});

test('FR-01.5: スマートフォン幅でも9地方のカードは重ならず表示できる',()=>{
 for(const width of [254,300,375,420,500,680]){
  const frame=geography.getMapViewport({width,height:310});
  const placed=geography.layoutMapMarkers(geography.mapMarkersForEntries([],{frame}),frame);
  assert.equal(placed.length,9);
  for(const p of placed)assert(p.x>=0&&p.y>=0&&p.x+p.width<=width&&p.y+p.height<=310);
  for(let i=0;i<placed.length;i++)for(let j=i+1;j<placed.length;j++){
   const a=placed[i],b=placed[j];assert(a.x+a.width+4<=b.x||b.x+b.width+4<=a.x||a.y+a.height+4<=b.y||b.y+b.height+4<=a.y);
  }
 }
});

test('FR-01.6: 多数の個別位置をまとめても掲載を欠落・重複させず、未登録位置と区別する',()=>{
 const base={kind:'shop' as const,area:'千葉県',description:'釣具店',prefectures:['千葉県']};
 const entries:geography.MapEntry[]=Array.from({length:120},(_,i)=>({...base,id:String(i),title:'店舗'+i,coordinates:{latitude:35+i%10*.01,longitude:140+Math.floor(i/10)*.01}}));
 entries.push({...base,id:'invalid',title:'無効な座標',coordinates:{latitude:NaN,longitude:140}});
 const frame=geography.getMapViewport({prefecture:'千葉県',width:254,height:310});
 const markers=geography.mapMarkersForEntries(entries,{prefecture:'千葉県',frame});
 assert(markers.some(p=>p.precision==='cluster'));
 assert.deepEqual(markers.find(p=>p.precision==='prefecture')?.entries.map(p=>p.id),['invalid']);
 assert.equal(markers.flatMap(p=>p.entries).length,entries.length);
 assert.deepEqual(new Set(markers.flatMap(p=>p.entries).map(p=>p.id)),new Set(entries.map(p=>p.id)));
 assert.doesNotThrow(()=>geography.layoutMapMarkers(markers,frame));
 assert(!geography.validMapCoordinates({latitude:35,longitude:0}));
});

test('FR-02.3: 千葉県を選択すると千葉県自身の輪郭と表示範囲を取得できる',()=>{
 const shapes=Reflect.get(geography,'prefectureShapes') as {name:string;path:string;bounds:{minX:number;maxX:number;minY:number;maxY:number}}[]|undefined;
 const chiba=shapes?.find(p=>p.name==='千葉県');
 assert.ok(chiba,'千葉県独自の輪郭が必要');
 assert(chiba.path.startsWith('M')&&chiba.path.length>150);
 assert(chiba.bounds.maxX>chiba.bounds.minX&&chiba.bounds.maxY>chiba.bounds.minY);
});

test('FR-01.6: 千葉県内の座標がある掲載は個別ピン、未登録の掲載は県の目安に分ける',()=>{
 const makeMarkers=Reflect.get(geography,'mapMarkersForEntries') as undefined|((entries:(geography.MapEntry&{coordinates?:{latitude:number;longitude:number}})[],options:{prefecture:string;region:geography.Region|'all';frame:geography.MapViewport})=>geography.MapMarker[]);
 assert.ok(makeMarkers,'個別座標と県の目安を区別する必要がある');
 const base={kind:'shop' as const,area:'千葉県',description:'釣具店',prefectures:['千葉県']};
 const entries=[{...base,id:'a',title:'店舗A',coordinates:{latitude:35.3,longitude:140.1}},{...base,id:'b',title:'店舗B',coordinates:{latitude:35.8,longitude:140.7}},{...base,id:'c',title:'座標未登録'}];
 const frame=geography.getMapViewport({region:'関東',prefecture:'千葉県',width:680,height:400});
 const markers=makeMarkers(entries,{region:'関東',prefecture:'千葉県',frame});
 assert.equal(markers.filter(p=>p.precision==='exact').length,2);
 assert.equal(markers.find(p=>p.precision==='prefecture')?.entries[0].id,'c');
 assert.notDeepEqual(markers.find(p=>p.id==='entry-a')?.point,markers.find(p=>p.id==='entry-b')?.point);
});

test('FR-01.5: 関東の近接した県でもラベルを含むピン全体が重ならず枠内に収まる',()=>{
 const layout=Reflect.get(geography,'layoutMapMarkers') as undefined|((markers:{id:string;label:string;point:{x:number;y:number};entries:never[];precision:'prefecture'}[],size:{width:number;height:number})=>{x:number;y:number;width:number;height:number}[]);
 assert.ok(layout,'ラベルと丸を一体として配置する必要がある');
 const markers=Array.from({length:7},(_,i)=>({id:String(i),label:'都道府県',point:{x:150+i,y:190+i},entries:[] as never[],precision:'prefecture' as const}));
 for(const width of [300,680]){
  const placed=layout(markers,{width,height:360});assert.equal(placed.length,7);
  for(const p of placed){assert(p.x>=0&&p.y>=0&&p.x+p.width<=width&&p.y+p.height<=360);}
  for(let i=0;i<placed.length;i++)for(let j=i+1;j<placed.length;j++){const a=placed[i],b=placed[j];assert(a.x+a.width+4<=b.x||b.x+b.width+4<=a.x||a.y+a.height+4<=b.y||b.y+b.height+4<=a.y,'ピンとラベル全体を重ねない');}
 }
});

test('FR-02.2: 地方の範囲は掲載件数に依存せず、関東全体が余白付きで収まる',()=>{
 const getViewport=Reflect.get(geography,'getMapViewport') as undefined|((options:{region:string;prefecture?:string;width:number;height:number})=>{bounds:{minX:number;maxX:number;minY:number;maxY:number};scale:number;offsetX:number;offsetY:number});
 assert.ok(getViewport,'掲載件数に依存しない表示範囲が必要');
 const frame=getViewport({region:'関東',width:700,height:400});
 const chiba=geography.prefectureShapes.find(p=>p.name==='千葉県')!;
 assert(frame.bounds.minX<=chiba.bounds.minX&&frame.bounds.maxX>=chiba.bounds.maxX);
 const mainTokyo=geography.prefectureShapes.find(p=>p.name==='東京都')!;
 assert(frame.bounds.minY<=mainTokyo.bounds.minY&&frame.bounds.maxY>=mainTokyo.bounds.maxY);
 assert(frame.scale>0&&Number.isFinite(frame.scale));
});
