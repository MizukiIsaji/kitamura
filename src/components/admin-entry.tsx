import Link from 'next/link';
import {ShieldCheck} from 'lucide-react';
import {getAdminAccess} from '@/lib/admin';

export async function AdminEntry(){
 const access=await getAdminAccess();
 return access.isAdmin?<Link className="login-link" href="/admin"><ShieldCheck size={15}/>管理画面</Link>:null;
}
