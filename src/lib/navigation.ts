// 共通ナビ FR-01: PCサイドメニューは7項目を釣果を先頭に表示する。記録の作成は記録一覧の前に置く。
export const mainNavigation=[
 {href:'/posts',label:'釣果',icon:'feed'},
 {href:'/',label:'トップページ',icon:'home'},
 {href:'/posts/new',label:'記録',icon:'create'},
 {href:'/records',label:'記録一覧',icon:'records'},
 {href:'/coaches',label:'コーチ',icon:'coach'},
 {href:'/requests',label:'相談',icon:'requests'},
 {href:'/points',label:'ポイント',icon:'points'},
] as const;
// 共通ナビ FR-01.4: スマホ下部メニューにトップページは含めない（ヘッダーのアイコンから移動する）。
export const mobileNavigation=mainNavigation.filter(item=>item.icon!=='home');
export function activeNavigationHref(path:string){
 return mainNavigation.filter(item=>item.href==='/'?path==='/':path===item.href||path.startsWith(item.href+'/')).sort((a,b)=>b.href.length-a.href.length)[0]?.href;
}
