import Link from 'next/link';
import {ShieldCheck} from 'lucide-react';
import {getAdminAccess} from '@/lib/admin';

export async function AdminEntry({iconOnly=false}:{iconOnly?:boolean}={}){
 const access=await getAdminAccess();
 return access.isAdmin?<Link className={iconOnly?'icon-button':'login-link'} href="/admin" aria-label="管理画面" title="管理画面"><ShieldCheck size={iconOnly?20:15}/>{!iconOnly&&'管理画面'}</Link>:null;
}
