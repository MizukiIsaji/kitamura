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
// 共通ナビ FR-01.4: スマホ下部メニューはトップページを先頭に表示する（PCサイドメニューとは順序が異なる）。
export const mobileNavigation=[
 mainNavigation[1],mainNavigation[0],...mainNavigation.slice(2),
] as const;
export function activeNavigationHref(path:string){
 return mainNavigation.filter(item=>item.href==='/'?path==='/':path===item.href||path.startsWith(item.href+'/')).sort((a,b)=>b.href.length-a.href.length)[0]?.href;
}
