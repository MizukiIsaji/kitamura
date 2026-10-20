import assert from 'node:assert/strict';
const origin=process.argv[2]||'http://127.0.0.1:3000';
for(const route of ['/','/setup','/login','/coaches','/about']){
 const response=await fetch(new URL(route,origin));assert.equal(response.status,200,route);
 assert.equal(response.headers.get('x-content-type-options'),'nosniff');
 const body=await response.text();assert(body.includes('TSURI RECORD'),route+' branding');
 if(route==='/')assert(body.includes('サービスの準備を進めています'));
 console.log('PASS: GET '+route+' → 200');
}
for(const route of ['/records','/settings','/posts/new','/requests','/coach']){
 const response=await fetch(new URL(route,origin),{redirect:'manual'});
 // Next.js represents redirects in an already-streamed response with a meta
 // refresh. Both forms must point to setup and expose no protected page.
 if(response.status===307)assert(response.headers.get('location')?.endsWith('/setup'));
 else{assert.equal(response.status,200,route);const body=await response.text();assert(body.includes('id="__next-page-redirect"')&&body.includes('url=/setup'),route+' streamed redirect');}
 console.log('PASS: '+route+' redirects to setup before any write');
}
const health=await fetch(new URL('/api/health',origin));assert.equal(health.status,503);assert.deepEqual(await health.json(),{status:'configuration_required'});console.log('PASS: health reports missing configuration with 503');
const asset=await fetch(new URL('/assets/hero.jpg',origin));assert.equal(asset.status,200);assert(asset.headers.get('content-type')?.includes('image/jpeg'));console.log('PASS: image asset served');
