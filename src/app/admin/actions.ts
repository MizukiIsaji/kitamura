'use server';

import {z} from 'zod';
import {revalidatePath} from 'next/cache';
import {requireAdmin} from '@/lib/admin';
import {createClient} from '@/lib/supabase/server';
import {idSchema,facilitySchema,type ActionState} from '@/lib/validation';
import {facilityLocality} from '@/lib/localities';

export async function reviewCoach(_:ActionState,form:FormData):Promise<ActionState>{
 await requireAdmin();
 const parsed=z.object({user_id:idSchema,status:z.enum(['pending','approved','suspended'])}).safeParse(Object.fromEntries(form.entries()));
 if(!parsed.success)return {error:'申請と審査結果を確認してください。'};
 const db=await createClient();
 const {error}=await db.rpc('admin_set_coach_status',{p_user_id:parsed.data.user_id,p_status:parsed.data.status});
 if(error)return {error:error.code==='42501'?'管理者権限がありません。':'審査結果を保存できませんでした。再度お試しください。'};
 for(const path of ['/admin','/coach','/coaches','/anglers/'+parsed.data.user_id,'/'])revalidatePath(path);
 return {success:'審査結果を保存しました。'};
}

// 釣り堀・釣りスポット・釣具店の掲載 FR-01・FR-02（docs/ai-dlc/specs/05-admin/facility-screen）
function revalidateFacilities(){for(const path of ['/admin','/explore','/coaches','/'])revalidatePath(path);}
// 釣り堀・釣りスポット・釣具店の掲載 FR-02（docs/ai-dlc/specs/05-admin/facility-screen）
export async function saveFacility(_:ActionState,form:FormData):Promise<ActionState>{
 await requireAdmin();
 const fields=Object.fromEntries(form.entries());
 const parsed=facilitySchema.safeParse({...fields,is_published:form.get('is_published')==='on'});
 if(!parsed.success)return {error:parsed.error.issues[0].message};
 const rawId=form.get('id');
 if(rawId&&!idSchema.safeParse(rawId).success)return {error:'施設IDが正しくありません。'};
 const db=await createClient();
 const place=facilityLocality(parsed.data.prefecture,parsed.data.municipality,parsed.data.address);
 const values={...parsed.data,municipality:place?.name||parsed.data.municipality};
 const {error}=rawId?await db.from('facilities').update(values).eq('id',rawId):await db.from('facilities').insert(values);
 if(error){console.error('Facility save failed:',error.code,error.message);return {error:'保存できませんでした。時間をおいて再度お試しください。'};}
 revalidateFacilities();
 return {success:rawId?'施設を更新しました。':'施設を登録しました。'};
}
// 釣り堀・釣りスポット・釣具店の掲載 FR-03（docs/ai-dlc/specs/05-admin/facility-screen）
export async function setFacilityPublished(_:ActionState,form:FormData):Promise<ActionState>{
 await requireAdmin();
 const id=idSchema.safeParse(form.get('id'));
 if(!id.success)return {error:'施設が見つかりません。'};
 const db=await createClient();
 const {error}=await db.from('facilities').update({is_published:form.get('is_published')==='true'}).eq('id',id.data);
 if(error){console.error('Facility publish toggle failed:',error.code,error.message);return {error:'更新できませんでした。時間をおいて再度お試しください。'};}
 revalidateFacilities();
 return {success:'掲載状態を変更しました。'};
}
