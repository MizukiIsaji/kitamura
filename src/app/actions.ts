'use server';
import {randomUUID} from 'node:crypto';
import {encodePhoto} from '@/lib/photo';
import {validatePhotoFiles,getPostPhotoPaths,savePhotoBatch} from '@/lib/post-photos';
import {redirect} from 'next/navigation';
import {revalidatePath} from 'next/cache';
import {createClient} from '@/lib/supabase/server';
import {requireViewer} from '@/lib/auth';
import {isConfigured,siteOrigin} from '@/lib/env';
import {safeReturnTo,canTransition,type Consultation} from '@/lib/domain';
import {authErrorDetails,authErrorMessage} from '@/lib/auth-errors';
import {registerAccount} from '@/lib/registration';
import {loginSchema,signupSchema,profileSchema,postSchema,coachSchema,planSchema,consultationSchema,idSchema,type ActionState} from '@/lib/validation';

function failure(error:{code?:string;message?:string}):ActionState{
 if(error.code==='23505')return{error:'すでに登録されています。入力内容を確認してください。'};
 if(error.code==='42501')return{error:'この操作を実行する権限がありません。'};
 if(error.code==='P0001')return{error:'短時間に操作が集中しています。少し待ってからお試しください。'};
 console.error('Write failed:',error.code,error.message);return{error:'保存できませんでした。時間をおいて再度お試しください。'};
}
const fields=(form:FormData)=>Object.fromEntries(form.entries());
export async function signIn(_:ActionState,form:FormData):Promise<ActionState>{
 if(!isConfigured())return{error:'先にSupabaseの接続設定を行ってください。'};
 const parsed=loginSchema.safeParse(fields(form));if(!parsed.success)return{error:parsed.error.issues[0].message};
 const db=await createClient(),{error}=await db.auth.signInWithPassword(parsed.data);
 if(error){console.error('Sign in failed '+JSON.stringify(authErrorDetails(error)));return{error:authErrorMessage(error,'signin')};}
 redirect(safeReturnTo(form.get('next')));
}
export async function signUp(_:ActionState,form:FormData):Promise<ActionState>{
 if(!isConfigured())return{error:'先にSupabaseの接続設定を行ってください。'};
 const parsed=signupSchema.safeParse(fields(form));if(!parsed.success)return{error:parsed.error.issues[0].message};
 const db=await createClient(),result=await registerAccount(db.auth,parsed.data,siteOrigin()+'/auth/callback?next=/settings');
 if(result.kind==='error'){console.error('Registration failed '+JSON.stringify(authErrorDetails(result.error)));return{error:authErrorMessage(result.error,'signup')};}
 if(result.kind==='signed-in')redirect('/settings');
 return{success:'登録可能なメールアドレスの場合、確認メールが届きます。メール内のリンクから登録を完了してください。'};
}
export async function signOut(){const db=await createClient();const {error}=await db.auth.signOut();if(error)throw new Error('ログアウトに失敗しました。再度お試しください。');redirect('/');}
export async function requestPasswordReset(_:ActionState,form:FormData):Promise<ActionState>{
 if(!isConfigured())return{error:'接続設定がありません。'};
 const email=String(form.get('email')||'').trim();if(!email||email.length>254||!email.includes('@'))return{error:'メールアドレスを確認してください。'};
 const db=await createClient();const {error}=await db.auth.resetPasswordForEmail(email,{redirectTo:siteOrigin()+'/auth/callback?next=/reset-password'});
 if(error){console.error('Password recovery request failed '+JSON.stringify(authErrorDetails(error)));return{error:authErrorMessage(error,'recovery')};}
 return{success:'登録済みの場合は、パスワード再設定メールが届きます。受信ボックスをご確認ください。'};
}
export async function resetPassword(_:ActionState,form:FormData):Promise<ActionState>{
 await requireViewer('/reset-password');const password=String(form.get('password')||'');if(password.length<12||password.length>128)return{error:'パスワードは12〜128文字で入力してください。'};
 const db=await createClient();const {error}=await db.auth.updateUser({password});if(error)return{error:'パスワードを変更できませんでした。再設定メールからやり直してください。'};redirect('/settings?updated=password');
}
export async function updateProfile(_:ActionState,form:FormData):Promise<ActionState>{
 const user=await requireViewer('/settings'),parsed=profileSchema.safeParse(fields(form));if(!parsed.success)return{error:parsed.error.issues[0].message};const db=await createClient();
 const {error}=await db.from('profiles').update(parsed.data).eq('id',user.id);if(error)return failure(error);revalidatePath('/');revalidatePath('/settings');return{success:'プロフィールを保存しました。'};
}
export async function createPost(_:ActionState,form:FormData):Promise<ActionState>{
 const user=await requireViewer('/posts/new'),parsed=postSchema.safeParse({...fields(form),is_public:form.get('is_public')==='on'});if(!parsed.success)return{error:parsed.error.issues[0].message};
 const photos=[...form.getAll('photos'),...form.getAll('photo')].filter((item):item is File=>item instanceof File&&item.size>0);
 try{validatePhotoFiles(photos);}catch(error){return{error:error instanceof Error?error.message:'写真を確認してください。'};}
 const encoded:Buffer[]=[];
 try{for(const photo of photos)encoded.push(await encodePhoto(Buffer.from(await photo.arrayBuffer())));}
 catch{return{error:'写真を読み込めませんでした。別の画像でお試しください。'};}
 const id=randomUUID(),db=await createClient();const inserted=await db.from('posts').insert({...parsed.data,id,user_id:user.id});if(inserted.error)return failure(inserted.error);
 const paths=encoded.map(()=>`${user.id}/${id}/${randomUUID()}.webp`);
 const saved=await savePhotoBatch(paths,{
  upload:async path=>{const result=await db.storage.from('catch-photos').upload(path,encoded[paths.indexOf(path)],{contentType:'image/webp',upsert:false});if(result.error)throw new Error('PHOTO_UPLOAD_FAILED');},
  link:async values=>{const result=await db.from('posts').update({image_path:values[0]||null,image_paths:values}).eq('id',id).eq('user_id',user.id).select('id');if(result.error||result.data?.length!==1)throw new Error('PHOTO_LINK_FAILED');},
  remove:async values=>{const result=await db.storage.from('catch-photos').remove(values);if(result.error)throw new Error('PHOTO_CLEANUP_FAILED');},
  deletePost:async()=>{const result=await db.from('posts').delete().eq('id',id).eq('user_id',user.id);if(result.error)throw new Error('POST_CLEANUP_FAILED');},
  // ポイント FR-02: award once, only after every photo and its metadata have been saved.
  finalize:async()=>{const result=await db.rpc('finalize_post_points',{p_post_id:id});if(result.error)throw new Error('POST_POINTS_FAILED');},
 });
 if(!saved.ok){if(saved.cleanupFailed)console.error('Post rollback needs cleanup',id);return{error:'記録の保存を完了できませんでした。記録一覧を確認してから再度お試しください。'};}
 revalidatePath('/');revalidatePath('/posts');revalidatePath('/records');revalidatePath('/points');revalidatePath('/settings');redirect('/posts/'+id);
}
export async function deletePost(_:ActionState,form:FormData):Promise<ActionState>{
 const user=await requireViewer('/records'),id=idSchema.safeParse(form.get('id'));if(!id.success)return{error:'投稿が見つかりません。'};if(form.get('confirm')!=='on')return{error:'削除の確認にチェックを入れてください。'};
 const db=await createClient(),post=await db.from('posts').select('id,image_path,image_paths').eq('id',id.data).eq('user_id',user.id).maybeSingle();if(post.error)return failure(post.error);if(!post.data)return{error:'投稿が見つからないか、削除できません。'};
 const paths=getPostPhotoPaths(post.data);if(paths.length){const removed=await db.storage.from('catch-photos').remove(paths);if(removed.error)return{error:'写真を削除できませんでした。時間をおいて再度お試しください。'};}
 const result=await db.from('posts').delete().eq('id',id.data).eq('user_id',user.id);if(result.error)return failure(result.error);
 revalidatePath('/');revalidatePath('/records');revalidatePath('/points');revalidatePath('/settings');redirect('/records');
}
export async function setRelation(_:ActionState,form:FormData):Promise<ActionState>{
 const user=await requireViewer(),id=idSchema.safeParse(form.get('id'));if(!id.success)return{error:'対象が見つかりません。'};
 const kind=String(form.get('kind')),add=form.get('add')==='true';if(!['like','bookmark','follow'].includes(kind))return{error:'操作を確認してください。'};
 if(kind==='follow'&&id.data===user.id)return{error:'自分をフォローすることはできません。'};
 const db=await createClient(),table=kind==='like'?'post_likes':'bookmarks';
 const result=kind==='follow'
  ?add?await db.from('follows').insert({follower_id:user.id,following_id:id.data}):await db.from('follows').delete().eq('follower_id',user.id).eq('following_id',id.data)
  :add?await db.from(table).insert({user_id:user.id,post_id:id.data}):await db.from(table).delete().eq('user_id',user.id).eq('post_id',id.data);
 const error=add&&result.error?.code==='23505'?null:result.error;
 if(error)return failure(error);revalidatePath('/','layout');return{};
}
export async function addComment(_:ActionState,form:FormData):Promise<ActionState>{
 const user=await requireViewer(),id=idSchema.safeParse(form.get('post_id')),body=String(form.get('body')||'').trim();if(!id.success||body.length<1||body.length>500)return{error:'コメントは1〜500文字で入力してください。'};
 const db=await createClient(),{error}=await db.from('comments').insert({post_id:id.data,user_id:user.id,body});if(error)return failure(error);revalidatePath('/posts/'+id.data);return{success:'コメントを投稿しました。'};
}
export async function applyCoach(_:ActionState,form:FormData):Promise<ActionState>{
 const user=await requireViewer('/coach'),parsed=coachSchema.safeParse(fields(form));if(!parsed.success)return{error:parsed.error.issues[0].message};
 const db=await createClient(),existing=await db.from('coach_profiles').select('user_id').eq('user_id',user.id).maybeSingle();if(existing.error)return failure(existing.error);
 const {error}=existing.data?await db.from('coach_profiles').update(parsed.data).eq('user_id',user.id):await db.from('coach_profiles').insert({...parsed.data,user_id:user.id});
 if(error)return failure(error);revalidatePath('/coach');return{success:existing.data?'コーチ情報を更新しました。':'コーチ登録を申請しました。運営の確認後に公開されます。'};
}
export async function savePlan(_:ActionState,form:FormData):Promise<ActionState>{
 const user=await requireViewer('/coach'),parsed=planSchema.safeParse({...fields(form),is_active:form.get('is_active')==='on'});if(!parsed.success)return{error:parsed.error.issues[0].message};
 const db=await createClient(),coach=await db.from('coach_profiles').select('status').eq('user_id',user.id).maybeSingle();if(coach.data?.status!=='approved')return{error:'運営によるコーチ承認後に、プランを登録できます。'};
 const rawId=form.get('id');if(rawId&&!idSchema.safeParse(rawId).success)return{error:'プランIDが正しくありません。'};
 const {error}=rawId?await db.from('coaching_plans').update(parsed.data).eq('id',rawId).eq('coach_id',user.id):await db.from('coaching_plans').insert({...parsed.data,coach_id:user.id});
 if(error)return failure(error);revalidatePath('/coach');revalidatePath('/coaches');return{success:'プランを保存しました。'};
}
export async function createConsultation(_:ActionState,form:FormData):Promise<ActionState>{
 const user=await requireViewer('/coaches'),parsed=consultationSchema.safeParse(fields(form));if(!parsed.success)return{error:parsed.error.issues[0].message};if(form.get('confirm')!=='on')return{error:'相談送信についての確認にチェックを入れてください。'};
 const db=await createClient();const existing=await db.from('coaching_requests').select('id').eq('student_id',user.id).eq('client_token',parsed.data.client_token).maybeSingle();if(existing.error)return failure(existing.error);if(existing.data)redirect('/requests?sent=1');
 const {error}=await db.from('coaching_requests').insert({...parsed.data,student_id:user.id});
 if(error){if(error.code==='23505')redirect('/requests?sent=1');return failure(error);}
 revalidatePath('/requests');redirect('/requests?sent=1');
}
export async function respondConsultation(_:ActionState,form:FormData):Promise<ActionState>{
 const user=await requireViewer('/requests'),id=idSchema.safeParse(form.get('id'));if(!id.success)return{error:'相談が見つかりません。'};
 const desired=String(form.get('status'));if(!['accepted','declined','cancelled'].includes(desired))return{error:'操作を確認してください。'};
 const db=await createClient(),current=await db.from('coaching_requests').select('*').eq('id',id.data).maybeSingle();if(current.error)return failure(current.error);if(!current.data)return{error:'相談が見つかりません。'};
 const r=current.data as Consultation;if(![r.coach_id,r.student_id].includes(user.id)||!canTransition(r.status,desired as Consultation['status'],r.coach_id===user.id))return{error:'この相談の状態は変更できません。最新の状態を確認してください。'};
 const note=String(form.get('coach_note')||'').trim();if(note.length>1000)return{error:'返信は1000文字以内で入力してください。'};
 const result=await db.from('coaching_requests').update({status:desired,...(r.coach_id===user.id?{coach_note:note}:{})}).eq('id',id.data).eq('status',r.status).select('id');
 if(result.error)return failure(result.error);if(!result.data?.length)return{error:'別の操作で更新されました。ページを再読み込みしてください。'};
 revalidatePath('/requests');return{success:'相談の状態を更新しました。'};
}

// 相談履歴 FR-03: 受講者の確認をDB側で検証し、実績に一度だけ加算する。
export async function completeConsultation(_:ActionState,form:FormData):Promise<ActionState>{
 await requireViewer('/requests');const id=idSchema.safeParse(form.get('id'));
 if(!id.success||form.get('confirm_completion')!=='on')return{error:'指導を受け終えたことを確認してください。'};
 const db=await createClient(),{error}=await db.rpc('confirm_coaching_completion',{p_request_id:id.data});
 if(error)return{error:['PGRST202','42883'].includes(error.code)?'指導完了の確認は準備中です。しばらくお待ちください。':'完了を確認できませんでした。承認済みの相談と希望日を確認してください。'};
 for(const path of ['/requests','/coaches','/coach','/'])revalidatePath(path);
 revalidatePath('/anglers/[id]','page');revalidatePath('/consult/[id]','page');
 return{success:'指導完了を確認しました。コーチの実績とランクに反映しました。'};
}
