export function isConfigured(){return Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL&&process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY);}
export function validatePublicKey(key:string){
 if(key.startsWith('sb_publishable_'))return;
 if(key.startsWith('eyJ')){try{const payload=JSON.parse(atob(key.split('.')[1].replaceAll('-','+').replaceAll('_','/')));if(payload.role==='anon')return;}catch{}}
 throw new Error('SupabaseにはPublishable keyを設定してください。管理者用のsecret/service_roleキーは公開設定に使えません。');
}
export function supabaseEnv(){
  const url=process.env.NEXT_PUBLIC_SUPABASE_URL,key=process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if(!url||!key)throw new Error('Supabaseの接続設定がありません。セットアップ手順を確認してください。');
  validatePublicKey(key);
  if(!/^https:\/\//.test(url)&&!/^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(url))throw new Error('Supabase URLを確認してください');
  return {url,key};
}
export function siteOrigin(){const value=process.env.NEXT_PUBLIC_SITE_URL;if(!value)throw new Error('NEXT_PUBLIC_SITE_URLを設定してください');return new URL(value).origin;}
