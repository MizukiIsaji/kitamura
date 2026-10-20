// 共通ナビ FR-01: PCとスマホは同じ項目・順序・行き先を使用する。
export const mainNavigation=[
 {href:'/',label:'マップ',icon:'map'},
 {href:'/posts',label:'釣果',icon:'feed'},
 {href:'/posts/new',label:'記録',icon:'create'},
 {href:'/records',label:'記録一覧',icon:'records'},
 {href:'/coaches',label:'コーチ',icon:'coach'},
 {href:'/requests',label:'相談',icon:'requests'},
] as const;
export function activeNavigationHref(path:string){
 return mainNavigation.filter(item=>item.href==='/'?path==='/':path===item.href||path.startsWith(item.href+'/')).sort((a,b)=>b.href.length-a.href.length)[0]?.href;
}
