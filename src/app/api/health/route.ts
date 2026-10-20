import {NextResponse} from 'next/server';
import {isConfigured} from '@/lib/env';
import {createClient} from '@/lib/supabase/server';
export const dynamic='force-dynamic';
export async function GET(){if(!isConfigured())return NextResponse.json({status:'configuration_required'},{status:503});try{const db=await createClient(),{error}=await db.from('profiles').select('id').limit(1);if(error)return NextResponse.json({status:'database_unavailable'},{status:503});return NextResponse.json({status:'ok'},{headers:{'Cache-Control':'no-store'}});}catch{return NextResponse.json({status:'unavailable'},{status:503});}}
