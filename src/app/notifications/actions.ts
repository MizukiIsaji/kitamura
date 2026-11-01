'use server';

import {redirect} from 'next/navigation';
import {requireViewer} from '@/lib/auth';
import {createClient} from '@/lib/supabase/server';
import {idSchema} from '@/lib/validation';

// 通知 FR-02.3・FR-03.2: 既読化と対象の相談への遷移を一体で行う。本人以外の通知は更新できない。
export async function openNotification(form:FormData):Promise<void>{
 const user=await requireViewer('/notifications');
 const id=idSchema.safeParse(form.get('id'));if(!id.success)redirect('/notifications');
 const db=await createClient();
 const notification=await db.from('notifications').select('consultation_id').eq('id',id.data).maybeSingle();
 if(notification.error||!notification.data)redirect('/notifications');
 await db.from('notifications').update({read_at:new Date().toISOString()}).eq('id',id.data).is('read_at',null);
 const request=await db.from('coaching_requests').select('coach_id').eq('id',notification.data.consultation_id).maybeSingle();
 const received=request.data?.coach_id===user.id;
 redirect(`/requests${received?'?tab=received':''}#${notification.data.consultation_id}`);
}
