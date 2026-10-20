import {randomUUID} from 'node:crypto';
import {notFound} from 'next/navigation';
import Link from 'next/link';
import {requireViewer} from '@/lib/auth';
import {getPlan,getProfile,getCoach} from '@/lib/queries';
import {idSchema} from '@/lib/validation';
import {PageTitle} from '@/components/ui';
import {ActionForm} from '@/components/action-form';
import {createConsultation} from '@/app/actions';
import {japanDate,money,times,experiences} from '@/lib/domain';
export const metadata={title:'コーチに相談する'};
export default async function Consult({params}:{params:Promise<{id:string}>}){const{id}=await params;if(!idSchema.safeParse(id).success)notFound();const user=await requireViewer('/consult/'+id),plan=await getPlan(id);if(!plan)notFound();const [profile,coach]=await Promise.all([getProfile(plan.coach_id),getCoach(plan.coach_id)]);if(coach?.status!=='approved'||plan.coach_id===user.id)notFound();return <div className="narrow"><PageTitle kicker="YOUR NEXT FISHING EXPERIENCE" title="コーチに相談する" description="経験や希望を伝えて、自分に合うレッスンを相談しましょう。"/><section className="panel"><div className="selected-plan"><div><h2>{plan.title}</h2><Link href={'/anglers/'+plan.coach_id}>{profile?.display_name}</Link><span> / {plan.duration_minutes}分・1人</span></div><strong>{money(plan.price_yen)}</strong></div><p className="notice">相談を送ると、コーチの受信一覧に表示されます。この時点では予約確定・料金の支払いは発生しません。</p><ActionForm action={createConsultation} label="この内容でコーチに相談する"><input type="hidden" name="plan_id" value={id}/><input type="hidden" name="client_token" value={randomUUID()}/><div className="form-grid"><label>希望日<input name="preferred_date" type="date" min={japanDate()} required/></label><label>時間帯<select name="preferred_time">{Object.entries(times).map(([k,v])=><option key={k} value={k}>{v}</option>)}</select></label><label>釣りの経験<select name="experience">{Object.entries(experiences).map(([k,v])=><option key={k} value={k}>{v}</option>)}</select></label><label>学びたいこと<input name="goal" maxLength={100} required placeholder="例：キャストの基本"/></label><label className="full">相談内容<textarea name="message" required maxLength={2000} rows={6} placeholder="経験、道具の有無、当日学びたいことなど…"/></label></div><label className="check-label"><input name="confirm" type="checkbox" required/><span>コーチに相談内容を共有すること、この時点で予約・決済は確定しないことを確認しました。</span></label></ActionForm></section></div>;}
