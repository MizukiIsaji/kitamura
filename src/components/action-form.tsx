'use client';
import {useActionState,type ReactNode} from 'react';
import {useFormStatus} from 'react-dom';
import type {ActionState} from '@/lib/validation';
export function Submit({children='保存する',className='button primary'}:{children?:ReactNode;className?:string}){const {pending}=useFormStatus();return <button type="submit" className={className} disabled={pending}>{pending?'処理しています…':children}</button>;}
export function ActionForm({action,children,className='',label='保存する'}:{action:(state:ActionState,form:FormData)=>Promise<ActionState>;children:ReactNode;className?:string;label?:string}){
 const[state,formAction]=useActionState(action,{});
 return <form action={formAction} className={className}>{children}{state.error&&<p className="form-error" role="alert">{state.error}</p>}{state.success&&<p className="form-success" role="status">{state.success}</p>}<Submit>{label}</Submit></form>;
}
export function CompactAction({action,children,label,title,className=''}:{action:(state:ActionState,form:FormData)=>Promise<ActionState>;children:ReactNode;label:ReactNode;title:string;className?:string}){
 const[state,formAction]=useActionState(action,{});
 return <form action={formAction} className={'compact-action '+className}>{children}<CompactSubmit title={title}>{label}</CompactSubmit>{state.error&&<span className="compact-error" role="alert">{state.error}</span>}</form>;
}
function CompactSubmit({children,title}:{children:ReactNode;title:string}){const{pending}=useFormStatus();return <button type="submit" aria-label={title} title={title} disabled={pending}>{children}</button>;}
