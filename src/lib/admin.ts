import 'server-only';
import {cache} from 'react';
import {notFound} from 'next/navigation';
import {getViewer,requireViewer} from './auth';
import {createClient} from './supabase/server';
import type {Category} from './domain';

export type AdminAccess={isAdmin:boolean;setupRequired:boolean;unavailable:boolean};
export const getAdminAccess=cache(async():Promise<AdminAccess>=>{
 if(!await getViewer())return {isAdmin:false,setupRequired:false,unavailable:false};
 const db=await createClient(),{data,error}=await db.rpc('is_app_admin');
 if(error)return {isAdmin:false,setupRequired:['PGRST202','42883'].includes(error.code),unavailable:!['PGRST202','42883'].includes(error.code)};
 return {isAdmin:data===true,setupRequired:false,unavailable:false};
});

export async function requireAdmin(){
 const viewer=await requireViewer('/admin');
 const access=await getAdminAccess();
 if(access.setupRequired||access.unavailable)throw new Error('管理者権限を確認できませんでした。管理者機能のDB設定と接続を確認してください。');
 if(!access.isAdmin)notFound();
 return viewer;
}

export type AdminCoach={user_id:string;status:'pending'|'approved'|'suspended';introduction:string;category:Category;area:string;years_experience:number;created_at:string;display_name:string;handle:string};
export type AdminDashboard={memberCount:number;publicPostCount:number;pendingCoachCount:number;coaches:AdminCoach[]};

export async function getAdminDashboard(){
 await requireAdmin();
 const db=await createClient(),{data,error}=await db.rpc('admin_dashboard');
 if(error)throw new Error('管理者画面を読み込めませんでした。時間をおいて再度お試しください。');
 return data as AdminDashboard;
}
