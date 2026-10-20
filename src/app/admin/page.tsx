import Link from 'next/link';
import {PageTitle} from '@/components/ui';
import {ActionForm,CompactAction} from '@/components/action-form';
import {requireViewer} from '@/lib/auth';
import {getAdminAccess,getAdminDashboard} from '@/lib/admin';
import {getFacilities} from '@/lib/queries';
import {categories,facilityKinds,type Facility} from '@/lib/domain';
import {reviewCoach,saveFacility,setFacilityPublished} from './actions';
import {FacilityLocationFields} from '@/components/facility-location-fields';

export const metadata={title:'管理者画面'};
const labels={pending:'審査待ち',approved:'承認・公開',suspended:'掲載停止'} as const;

// 施設掲載 FR-02（docs/ai-dlc/specs/05-admin/facility-screen）: 既存の登録内容を編集し、掲載状態を切り替える
function FacilityCard({facility}:{facility:Facility}){
 const f=facility;
 return <article className="panel" key={f.id}>
  <div className="section-heading"><div><h3>{f.name} <span className="tag">{facilityKinds[f.kind]}</span></h3><p className="muted">{[f.prefecture,f.municipality].filter(Boolean).join(' ')}</p></div><span className="tag">{f.is_published?'掲載中':'掲載停止'}</span></div>
  <ActionForm action={saveFacility} label="内容を保存">
   <input type="hidden" name="id" value={f.id}/><input type="hidden" name="kind" value={f.kind}/>
   <label>名称<input name="name" required maxLength={60} defaultValue={f.name}/></label>
   <label>紹介文<textarea name="description" required maxLength={1000} rows={3} defaultValue={f.description}/></label>
   <FacilityLocationFields prefecture={f.prefecture} municipality={f.municipality} address={f.address}/>
   {f.kind==='shop'&&<><label>電話番号<input name="phone" maxLength={20} defaultValue={f.phone}/></label><label>営業時間・定休日<input name="business_hours" maxLength={200} defaultValue={f.business_hours}/></label></>}
   {f.kind==='pond'&&<label>料金・利用案内<textarea name="price_info" maxLength={500} rows={2} defaultValue={f.price_info}/></label>}
   <label className="check-label"><input name="is_published" type="checkbox" defaultChecked={f.is_published}/><span>掲載する</span></label>
  </ActionForm>
  <CompactAction action={setFacilityPublished} title={f.is_published?'掲載を停止':'掲載を再開'} label={f.is_published?'掲載を停止する':'掲載を再開する'}>
   <input type="hidden" name="id" value={f.id}/><input type="hidden" name="is_published" value={String(!f.is_published)}/>
  </CompactAction>
 </article>;
}
function NewFacilityForm(){
 return <ActionForm action={saveFacility} label="施設を登録" className="panel">
  <label>種類<select name="kind" defaultValue="shop">{Object.entries(facilityKinds).map(([value,label])=><option value={value} key={value}>{label}</option>)}</select></label>
  <label>名称<input name="name" required maxLength={60} placeholder="例：多治見つり具店"/></label>
  <label>紹介文<textarea name="description" required maxLength={1000} rows={3}/></label>
  <FacilityLocationFields/>
  <label>電話番号（釣具店）<input name="phone" maxLength={20}/></label>
  <label>営業時間・定休日（釣具店）<input name="business_hours" maxLength={200}/></label>
  <label>料金・利用案内（釣り堀）<textarea name="price_info" maxLength={500} rows={2}/></label>
  <label className="check-label"><input name="is_published" type="checkbox" defaultChecked/><span>掲載する</span></label>
 </ActionForm>;
}

export default async function AdminPage(){
 await requireViewer('/admin');
 const access=await getAdminAccess();
 if(access.setupRequired)return <section className="panel prose"><h1>管理者機能の初期設定が必要です</h1><p>運営者が管理者用のSQLを適用すると、この画面を利用できます。</p><Link href="/">トップへ戻る</Link></section>;
 if(access.unavailable)throw new Error('管理者権限を確認できませんでした。時間をおいて再度お試しください。');
 if(!access.isAdmin)return <section className="empty-state"><h1>管理者専用の画面です</h1><p>このアカウントには管理者権限がありません。</p><Link className="button outline" href="/">トップへ戻る</Link></section>;
 const dashboard=await getAdminDashboard();
 return <>
  <PageTitle kicker="ADMINISTRATION" title="管理者画面" description="会員数と公開釣果、コーチの申請を確認できます。"/>
  <p className="notice positive">管理者としてログインしています。</p>
  <div className="demo-stats admin-stats"><div><strong>{dashboard.memberCount}</strong><span>登録会員</span></div><div><strong>{dashboard.publicPostCount}</strong><span>公開釣果</span></div><div><strong>{dashboard.pendingCoachCount}</strong><span>審査待ちのコーチ</span></div></div>
  <div className="section-heading"><h2>コーチ申請の審査</h2><span>審査待ちを優先して直近100件を表示</span></div>
  {dashboard.coaches.length===0?<section className="empty-state"><h2>コーチ申請はまだありません</h2><p>会員から申請が届くと、ここで内容を確認し、承認や掲載停止を行えます。</p></section>:dashboard.coaches.map(coach=><article className="panel" key={coach.user_id}>
   <div className="section-heading"><div><h2>{coach.display_name}</h2><p className="muted">@{coach.handle} · {categories[coach.category]} · {coach.area}</p></div><span className="tag">{labels[coach.status]}</span></div>
   <p className="muted">釣り歴 {coach.years_experience}年（自己申告）</p><p className="coach-introduction">{coach.introduction}</p>
   <ActionForm action={reviewCoach} label="審査結果を保存"><input type="hidden" name="user_id" value={coach.user_id}/><label>審査結果<select name="status" defaultValue={coach.status}>{Object.entries(labels).map(([value,label])=><option value={value} key={value}>{label}</option>)}</select></label></ActionForm>
  </article>)}
  <AdminFacilities/>
 </>;
}

// 施設掲載 FR-01〜FR-02（docs/ai-dlc/specs/05-admin/facility-screen）
async function AdminFacilities(){
 const facilities=await getFacilities({onlyPublished:false});
 return <>
  <div className="section-heading"><h2>釣り堀・釣りスポット・釣具店の掲載</h2><span>{facilities.length}件</span></div>
  {facilities.length===0?<section className="empty-state"><h2>まだ登録がありません</h2><p>名称・紹介文・都道府県を入力して登録すると、地図とトップページに表示されます。</p></section>:facilities.map(f=><FacilityCard facility={f} key={f.id}/>)}
  <NewFacilityForm/>
 </>;
}
