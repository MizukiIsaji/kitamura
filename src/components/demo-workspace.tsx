'use client';

import {useRef,useState,type FormEvent} from 'react';
import Link from 'next/link';
import {Bookmark,Heart,MessageCircle,Fish,MapPin,Plus,RotateCcw} from 'lucide-react';
import {categories,japanDate,money,statuses,type PostCardData} from '@/lib/domain';
import {filterDemoPosts,type DemoData} from '@/lib/demo-data';
import {postSchema} from '@/lib/validation';
import {equipmentStatuses} from '@/lib/consultation-options';
import {tackleOptions} from '@/lib/post-options';

type View='feed'|'following'|'mine'|'saved'|'coaches'|'requests';
const views:[View,string][]=[['feed','みんなの釣果'],['following','フォロー中'],['mine','自分の記録'],['saved','保存した記録'],['coaches','コーチ'],['requests','相談履歴']];

export function DemoWorkspace({initialData}:{initialData:DemoData}){
 const [data,setData]=useState(initialData);
 const [view,setView]=useState<View>('feed');
 const [category,setCategory]=useState('');
 const [q,setQ]=useState('');
 const [selectedId,setSelectedId]=useState<string|null>(null);
 const [expandedCoach,setExpandedCoach]=useState<string|null>(null);
 const [showForm,setShowForm]=useState(false);
 const [error,setError]=useState('');
 const [message,setMessage]=useState('');
 const detailRef=useRef<HTMLElement>(null);
 const selected=data.posts.find(post=>post.id===selectedId&&(post.is_public||post.user_id===data.viewerId));
 const posts=filterDemoPosts(data,{view,category,q});
 const coaches=data.coaches.filter(coach=>{
  const profile=data.profiles.find(person=>person.id===coach.user_id);
  return coach.status==='approved'&&(!category||coach.category===category)&&(!q||[profile?.display_name,coach.area,coach.introduction].some(value=>value?.includes(q.trim())));
 });
 const mine=data.profiles.find(profile=>profile.id===data.viewerId)!;

 function navigate(next:View){setView(next);setCategory('');setQ('');setSelectedId(null);setShowForm(false);setMessage('');setError('');}
 function toggle(postId:string,key:'liked'|'bookmarked'){
  setData(current=>({...current,posts:current.posts.map(post=>post.id!==postId?post:{...post,[key]:!post[key],likeCount:key==='liked'?post.likeCount+(post.liked?-1:1):post.likeCount})}));
 }
 function openPost(postId:string){
  setSelectedId(postId);
  requestAnimationFrame(()=>{detailRef.current?.focus();detailRef.current?.scrollIntoView({block:'start',behavior:'smooth'});});
 }
 function createPost(event:FormEvent<HTMLFormElement>){
  event.preventDefault();
  const form=event.currentTarget,values=Object.fromEntries(new FormData(form));
  const result=postSchema.safeParse({...values,is_public:values.is_public==='on'});
  if(!result.success){setError(result.error.issues[0]?.message||'入力内容を確認してください');return;}
  const timestamp=new Date().toISOString();
  const post:PostCardData={...result.data,method:'',id:crypto.randomUUID(),user_id:data.viewerId,created_at:timestamp,updated_at:timestamp,image_path:null,imageUrl:null,profile:mine,likeCount:0,commentCount:0,liked:false,bookmarked:false};
  setData(current=>({...current,posts:[post,...current.posts]}));
  navigate('mine');setMessage('テスト記録を追加しました。再読み込みすると初期状態に戻ります。');
 }
 function addComment(event:FormEvent<HTMLFormElement>){
  event.preventDefault();
  const form=event.currentTarget,body=String(new FormData(form).get('body')||'').trim();
  if(!body||body.length>1000||!selected)return;
  const comment={id:crypto.randomUUID(),post_id:selected.id,user_id:data.viewerId,body,created_at:new Date().toISOString()};
  setData(current=>({...current,comments:[...current.comments,comment],posts:current.posts.map(post=>post.id===selected.id?{...post,commentCount:post.commentCount+1}:post)}));
  form.reset();setMessage('テストコメントを追加しました。');
 }
 function testConsult(planId:string){
  const plan=data.plans.find(item=>item.id===planId&&item.is_active);
  if(!plan)return;
  const template=initialData.requests[0],timestamp=new Date().toISOString();
  setData(current=>({...current,requests:[{...template,id:crypto.randomUUID(),client_token:crypto.randomUUID(),plan_id:plan.id,coach_id:plan.coach_id,plan_title:plan.title,price_yen:plan.price_yen,duration_minutes:plan.duration_minutes,status:'requested',coach_note:'',created_at:timestamp,updated_at:timestamp},...current.requests]}));
  navigate('requests');setMessage('架空の相談を追加しました。実際のコーチへの送信はありません。');
 }
 function reset(){setData(structuredClone(initialData));navigate('feed');setExpandedCoach(null);setMessage('テストデータを初期状態に戻しました。');}

 return <>
  <div className="page-title"><div><p className="kicker">DEVELOPMENT PLAYGROUND</p><h1>テストデータで、触ってみよう。</h1><p>釣果を見つけて、記録して、コーチとつながる流れを確認できます。</p></div><button className="button outline" onClick={reset}><RotateCcw size={15}/>最初に戻す</button></div>
  <div className="notice demo-notice"><strong>開発用の架空データです。</strong> ログイン役は「あなた（テスト）」。変更はこの画面内だけで、再読み込みするとリセットされます。写真アップロード・認証メール・DB保存は実接続後に確認します。<br/><Link href="/setup" className="text-link">実データを保存するための設定を見る →</Link></div>
  <div className="demo-stats" aria-label="初期テストデータの構成"><div><strong>{initialData.profiles.length}</strong><span>架空の会員</span></div><div><strong>{initialData.posts.filter(post=>post.is_public).length}</strong><span>公開の釣果</span></div><div><strong>{initialData.coaches.filter(coach=>coach.status==='approved').length}</strong><span>公開コーチ</span></div><div><strong>{initialData.requests.length}</strong><span>相談の状態例</span></div></div>
  <nav className="demo-tabs" aria-label="テスト画面の切り替え">{views.map(([key,label])=><button key={key} aria-pressed={view===key} onClick={()=>navigate(key)} className={'filter-chip '+(view===key?'active':'')}>{label}</button>)}</nav>
  <p role="status" className="demo-feedback">{message}</p>
  <div className="section-heading"><h2>{views.find(([key])=>key===view)?.[1]}</h2><button className="button primary" onClick={()=>{setShowForm(!showForm);setError('');}}><Plus size={15}/>{showForm?'入力を閉じる':'テスト記録を追加'}</button></div>
  {showForm&&<section className="panel"><h2>釣行を記録する（テスト）</h2><form onSubmit={createPost}><div className="form-grid"><label className="full">タイトル<input name="title" required maxLength={60} placeholder="今日の釣りで見つけたこと"/></label><label>ジャンル<select name="category">{Object.entries(categories).map(([key,label])=><option value={key} key={key}>{label}</option>)}</select></label><label>釣行日<input name="fished_on" type="date" required defaultValue={japanDate()} max={japanDate()}/></label><label>魚種<input name="species" maxLength={40} placeholder="釣果なしの場合は空欄でもOK"/></label><label>サイズ（cm）<input name="size_cm" type="number" min="0.1" max="999" step="0.1"/></label><label className="full">エリア<input name="area" required maxLength={80} placeholder="例：神奈川県・テスト堤防"/></label><label className="full">メモ<textarea name="memo" required maxLength={3000} rows={4}/></label></div><label>ルアー・仕掛け<select name="lure" defaultValue=""><option value="">選択してください（任意）</option>{tackleOptions.map(option=><option key={option} value={option}>{option}</option>)}</select></label>{['rod','reel'].map(name=><input key={name} name={name} type="hidden" value=""/>)}<label className="check-label"><input name="is_public" type="checkbox" defaultChecked/>公開フィードにも表示する（外すと自分の記録のみ）</label>{error&&<p className="form-error" role="alert">{error}</p>}<button className="button primary" type="submit">テスト記録を追加する</button></form></section>}
  {view!=='requests'&&<><form className="search-form" onSubmit={event=>event.preventDefault()}><label htmlFor="demo-search">検索</label><input id="demo-search" value={q} maxLength={80} onChange={event=>setQ(event.target.value)} placeholder={view==='coaches'?'名前・地域で探す':'タイトル・魚種・地域で探す'}/></form><div className="filter-row"><button className={'filter-chip '+(!category?'active':'')} onClick={()=>setCategory('')} aria-pressed={!category}>すべて</button>{Object.entries(categories).map(([key,label])=><button key={key} aria-pressed={category===key} className={'filter-chip '+(category===key?'active':'')} onClick={()=>setCategory(key)}>{label}</button>)}</div></>}

  {selected&&<section className="panel demo-detail" ref={detailRef} tabIndex={-1} aria-label="選択した釣行の詳細"><div className="section-heading"><h2>{selected.title}</h2><button className="button outline" onClick={()=>setSelectedId(null)}>詳細を閉じる</button></div><p className="muted">{selected.profile?.display_name} · {selected.fished_on} · {selected.area}</p><p className="post-memo">{selected.memo}</p><dl className="tackle-grid"><div><dt>魚種 / サイズ</dt><dd>{selected.species||'記録なし'} / {selected.size_cm?`${selected.size_cm}cm`:'未測定'}</dd></div><div><dt>公開範囲</dt><dd>{selected.is_public?'公開':'自分のみ'}</dd></div><div><dt>ロッド / リール</dt><dd>{selected.rod||'未記入'} / {selected.reel||'未記入'}</dd></div><div><dt>ルアー・仕掛け</dt><dd>{selected.lure||'未記入'}</dd></div></dl><h3>コメント</h3>{data.comments.filter(comment=>comment.post_id===selected.id).map(comment=><div key={comment.id} className="comment"><strong>{data.profiles.find(profile=>profile.id===comment.user_id)?.display_name}</strong><p>{comment.body}</p></div>)}<form onSubmit={addComment} className="demo-comment-form"><label>テストコメント<textarea name="body" required maxLength={1000} rows={2}/></label><button type="submit" className="button primary">コメントを追加</button></form></section>}

  {!['coaches','requests'].includes(view)&&<><p className="muted demo-result-count">{posts.length}件{view==='mine'?'（非公開の記録を含みます）':''}</p><div className="post-grid wide-grid">{posts.map(post=><article className="post-card" key={post.id}><div className="post-author"><span className="avatar">{post.profile?.display_name.slice(0,1)}</span><div><strong>{post.profile?.display_name}</strong><small>{post.fished_on} · {post.profile?.prefecture}</small></div></div><button className={'post-image demo-post-image demo-category-'+post.category} aria-label={post.title+'の詳細を見る'} onClick={()=>openPost(post.id)}><div className="post-image-placeholder"><Fish size={48}/><span>TEST FISHING JOURNAL</span></div><span className="photo-tag">{categories[post.category]}{!post.is_public?' · 自分のみ':''}</span></button><div className="post-body"><button className="catch-heading demo-catch-heading" onClick={()=>openPost(post.id)}><h3>{post.title}</h3>{post.size_cm!==null&&<strong>{post.size_cm}<small>cm</small></strong>}</button><p className="post-excerpt">{post.memo}</p><p className="post-area"><MapPin size={12}/>{post.area}</p><div className="post-actions demo-post-actions"><button onClick={()=>toggle(post.id,'liked')} aria-pressed={post.liked} aria-label={post.title+'にいいね'}><Heart size={17} fill={post.liked?'currentColor':'none'}/>{post.likeCount}</button><button onClick={()=>openPost(post.id)} aria-label={post.title+'のコメントを見る'}><MessageCircle size={17}/>{post.commentCount}</button><button onClick={()=>toggle(post.id,'bookmarked')} aria-pressed={post.bookmarked} aria-label={post.title+'を保存'}><Bookmark size={17} fill={post.bookmarked?'currentColor':'none'}/></button></div></div></article>)}</div>{!posts.length&&<div className="empty-state"><Fish size={30}/><h3>該当する記録がありません</h3><p>検索条件を変えるか、テスト記録を追加してみてください。</p></div>}</>}

  {view==='coaches'&&<div className="coaches-grid">{!coaches.length&&<div className="empty-state"><h3>該当するコーチがいません</h3><p>検索条件を変えてみてください。</p></div>}{coaches.map(coach=>{const profile=data.profiles.find(person=>person.id===coach.user_id)!;return <article key={coach.user_id} className="panel coach-card"><span className="avatar large">{profile.display_name.slice(0,1)}</span><span className="tag">{categories[coach.category]}</span><h2>{profile.display_name}</h2><p className="muted">{coach.area} / 釣り歴 {coach.years_experience}年（テスト設定）</p><p className="coach-introduction">{coach.introduction}</p><div className="demo-coach-actions"><button className="button outline" aria-pressed={data.following.includes(coach.user_id)} onClick={()=>setData(current=>({...current,following:current.following.includes(coach.user_id)?current.following.filter(person=>person!==coach.user_id):[...current.following,coach.user_id]}))}>{data.following.includes(coach.user_id)?'フォロー中':'フォローする'}</button><button className="button primary" aria-expanded={expandedCoach===coach.user_id} onClick={()=>setExpandedCoach(expandedCoach===coach.user_id?null:coach.user_id)}>プランを見る</button></div>{expandedCoach===coach.user_id&&<div>{data.plans.filter(plan=>plan.coach_id===coach.user_id&&plan.is_active).map(plan=><section key={plan.id} className="demo-plan"><h3>{plan.title}</h3><p>{plan.description}</p><p><strong>{money(plan.price_yen)}</strong> / {plan.duration_minutes}分</p><button className="button primary" onClick={()=>testConsult(plan.id)}>テスト相談を追加</button></section>)}</div>}</article>;})}</div>}

  {view==='requests'&&<><p className="notice">相談の承認は予約確定・支払い完了ではありません。ここでは相談者役・コーチ役の状態変更を試せます。</p><div className="demo-requests">{data.requests.filter(request=>request.student_id===data.viewerId||request.coach_id===data.viewerId).map(request=><article className="panel request-card" key={request.id}><div className="request-heading"><div><p className="kicker">TEST CONSULTATION</p><h2>{request.plan_title}</h2><p>{data.profiles.find(profile=>profile.id===request.coach_id)?.display_name}</p></div><span className={'status '+request.status}>{statuses[request.status]}</span></div><dl className="request-meta"><div><dt>希望日</dt><dd>{request.preferred_date} 午前</dd></div><div><dt>参考料金</dt><dd>{money(request.price_yen)} / {request.duration_minutes}分</dd></div><div><dt>経験</dt><dd>はじめて</dd></div><div><dt>希望エリア</dt><dd>{request.preferred_area||'未記入'}</dd></div><div><dt>道具の有無</dt><dd>{request.equipment_status?equipmentStatuses[request.equipment_status]:'未記入'}</dd></div></dl><h3>{request.preferred_area?'詳細エリア':'相談内容'}</h3><p className="request-text">{request.message}</p>{request.coach_note&&<div className="coach-response"><h3>コーチからの返信例</h3><p className="request-text">{request.coach_note}</p></div>}<div className="demo-request-actions">{request.status==='requested'&&<><button className="button primary" onClick={()=>setData(current=>({...current,requests:current.requests.map(item=>item.id===request.id?{...item,status:'accepted',coach_note:'テストの承認です。次は持ち物と実施条件を確認します。'}:item)}))}>コーチ役：承認を試す</button><button className="button outline" onClick={()=>setData(current=>({...current,requests:current.requests.map(item=>item.id===request.id?{...item,status:'declined',coach_note:'テストのお見送り返信です。別の日程をご相談ください。'}:item)}))}>コーチ役：見送りを試す</button></>}{['requested','accepted'].includes(request.status)&&<button className="button outline" onClick={()=>setData(current=>({...current,requests:current.requests.map(item=>item.id===request.id?{...item,status:'cancelled'}:item)}))}>相談者役：取り下げを試す</button>}</div></article>)}</div></>}
 </>;
}
