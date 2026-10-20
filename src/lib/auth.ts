import 'server-only';
import {cache} from 'react';
import {redirect} from 'next/navigation';
import {createClient} from '@/lib/supabase/server';
import {isConfigured} from '@/lib/env';
import {safeReturnTo} from '@/lib/domain';
export const getViewer=cache(async()=>{if(!isConfigured())return null;const db=await createClient();const {data:{user}}=await db.auth.getUser();return user;});
export async function requireViewer(path='/'){if(!isConfigured())redirect('/setup');const user=await getViewer();if(!user)redirect('/login?next='+encodeURIComponent(safeReturnTo(path)));return user;}
