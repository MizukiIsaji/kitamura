import {NextResponse,type NextRequest} from 'next/server';
import {createClient} from '@/lib/supabase/server';
import {safeReturnTo} from '@/lib/domain';
import {siteOrigin} from '@/lib/env';
export async function GET(request:NextRequest){const code=request.nextUrl.searchParams.get('code'),next=safeReturnTo(request.nextUrl.searchParams.get('next'));const origin=siteOrigin();if(code){const db=await createClient(),{error}=await db.auth.exchangeCodeForSession(code);if(!error){const response=NextResponse.redirect(new URL(next,origin));response.headers.set('Cache-Control','private, no-store');return response;}}return NextResponse.redirect(new URL('/login?error=confirmation',origin));}
