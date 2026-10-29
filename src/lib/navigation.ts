// 共通ナビ FR-01: 共通項目の順序と行き先を定義する。スマホはポイントを表示しない。
export const mainNavigation=[
 {href:'/',label:'マップ',icon:'map'},
 {href:'/posts',label:'釣果',icon:'feed'},
 {href:'/posts/new',label:'記録',icon:'create'},
 {href:'/records',label:'記録一覧',icon:'records'},
 {href:'/coaches',label:'コーチ',icon:'coach'},
 {href:'/requests',label:'相談',icon:'requests'},
 {href:'/points',label:'ポイント',icon:'points'},
] as const;
export function activeNavigationHref(path:string){
 return mainNavigation.filter(item=>item.href==='/'?path==='/':path===item.href||path.startsWith(item.href+'/')).sort((a,b)=>b.href.length-a.href.length)[0]?.href;
}
