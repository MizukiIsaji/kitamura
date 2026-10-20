import {NextResponse,type NextRequest} from 'next/server';
import type {EmailOtpType} from '@supabase/supabase-js';
import {createClient} from '@/lib/supabase/server';
import {safeReturnTo} from '@/lib/domain';
import {siteOrigin} from '@/lib/env';
export async function GET(request:NextRequest){const p=request.nextUrl.searchParams,hash=p.get('token_hash'),type=p.get('type'),next=safeReturnTo(p.get('next'),type==='recovery'?'/reset-password':'/settings'),origin=siteOrigin();if(hash&&type&&['signup','recovery','email','email_change'].includes(type)){const db=await createClient(),{error}=await db.auth.verifyOtp({token_hash:hash,type:type as EmailOtpType});if(!error){const response=NextResponse.redirect(new URL(next,origin));response.headers.set('Cache-Control','private, no-store');return response;}}return NextResponse.redirect(new URL('/login?error=confirmation',origin));}
