import {createServerClient} from '@supabase/ssr';
import {NextResponse,type NextRequest} from 'next/server';
import {isConfigured,supabaseEnv} from '@/lib/env';
export async function proxy(request:NextRequest){
 if(process.env.NODE_ENV==='production'&&/^\/demo(?:\/|$)/.test(request.nextUrl.pathname))return new NextResponse(null,{status:404});
 if(!isConfigured())return NextResponse.next();
 let response=NextResponse.next({request});const {url,key}=supabaseEnv();
 const client=createServerClient(url,key,{cookies:{getAll:()=>request.cookies.getAll(),setAll(values){values.forEach(({name,value})=>request.cookies.set(name,value));response=NextResponse.next({request});values.forEach(({name,value,options})=>response.cookies.set(name,value,options));}}});
 await client.auth.getClaims();
 response.headers.set('Cache-Control','private, no-store');
 return response;
}
export const config={matcher:['/((?!_next/static|_next/image|favicon.ico|assets/|.*\\.(?:svg|png|jpg|jpeg|webp)$).*)']};
