import 'server-only';
import {createServerClient} from '@supabase/ssr';
import {cookies} from 'next/headers';
import {supabaseEnv} from '@/lib/env';
export async function createClient(){
 const jar=await cookies(),{url,key}=supabaseEnv();
 return createServerClient(url,key,{cookies:{getAll:()=>jar.getAll(),setAll(values){try{values.forEach(({name,value,options})=>jar.set(name,value,options));}catch{/* Server Components rely on proxy.ts to refresh cookies. */}}}});
}
