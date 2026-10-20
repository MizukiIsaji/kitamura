import {createHash} from 'node:crypto';

export type SeedAccount={id:string;email:string};
export const seedPeople=[
 {name:'海野 あおい（テスト）',key:'aoi',prefecture:'神奈川県',category:'sea',species:'アジ',size:23,title:'朝の堤防でアジを釣った',price:6000,duration:120},
 {name:'川辺 みずき（テスト）',key:'mizuki',prefecture:'長野県',category:'trout',species:'ニジマス',size:31,title:'渓流でキャストを練習した',price:9000,duration:180},
 {name:'湖畔 そら（テスト）',key:'sora',prefecture:'滋賀県',category:'bass',species:'ブラックバス',size:42,title:'岸際の変化で見つけた一尾',price:7000,duration:120},
 {name:'夕凪 なぎ（テスト）',key:'nagi',prefecture:'静岡県',category:'aji',species:'アジ',size:18,title:'小さなアタリを感じる練習',price:4000,duration:90},
 {name:'潮見 ひかり（テスト）',key:'hikari',prefecture:'千葉県',category:'eging',species:'アオリイカ',size:27,title:'夕方のエギング記録',price:0,duration:30},
] as const;
export const seedPlanCoaches=[0,1,2,3,0] as const;
export const seedRequestStatuses=['requested','accepted','declined','cancelled','requested'] as const;
export const sqlText=(value:string)=>"'"+value.replaceAll("'","''")+"'";
export function fixtureId(scope:string,key:string){
 const hash=createHash('sha256').update('tsuri-development:'+scope+':'+key).digest('hex');
 return `${hash.slice(0,8)}-${hash.slice(8,12)}-4${hash.slice(13,16)}-8${hash.slice(17,20)}-${hash.slice(20,32)}`;
}
export function seedEmail(scope:string,index:number){return `tsuri-test-${scope}-${index+1}@example.com`;}
export function seedHandle(scope:string,index:number){return `test_${seedPeople[index].key}_${scope}`;}
export function seedComment(index:number){return `参考になる記録です。次の釣行で試してみます。（テストコメント${index+1}）`;}
export function coachIntroduction(index:number){return `${seedPeople[index].prefecture}の架空のテストコーチです。安全確認と道具の使い方から、初心者のペースに合わせて練習します。`}

function migrationBody(migration:string){return migration.replace(/^begin;\r?\n/m,'').replace(/^commit;\s*$/m,'');}
function adminBlock(email:string){
 return `
-- Resolve the current account by its explicitly authorized email, never by an old UUID.
do $grant_admin$
declare target_id uuid; matches integer;
begin
  select count(*) into matches from auth.users where lower(btrim(email))=lower(btrim(${sqlText(email)}));
  if matches<>1 then
    raise exception 'Expected exactly one registered account for the requested email. No access was granted.' using errcode='22023';
  end if;
  select id into target_id from auth.users where lower(btrim(email))=lower(btrim(${sqlText(email)}));
  -- A user created before the initial profile trigger may need their missing profile.
  insert into public.profiles(id,handle,display_name)
  select id,'u_'||left(replace(id::text,'-',''),24),coalesce(nullif(left(btrim(raw_user_meta_data->>'display_name'),40),''),'釣り人')
  from auth.users where id=target_id
  on conflict(id) do nothing;
  insert into app_private.admin_members(user_id) values(target_id) on conflict(user_id) do nothing;
  perform set_config('tsuri.seed_owner_id',target_id::text,true);
end;
$grant_admin$;
`;
}
function adminResult(email:string){
 return `select p.display_name,p.handle,'administrator' as app_role
from auth.users u join public.profiles p on p.id=u.id join app_private.admin_members a on a.user_id=u.id
where lower(btrim(u.email))=lower(btrim(${sqlText(email)}));\n`;
}
export function buildAdminBootstrap(migration:string,email:string){
 return '-- Apply in the SQL Editor of this development project. Does not change passwords.\nbegin;\n'+migrationBody(migration)+adminBlock(email)+'commit;\n'+adminResult(email);
}

export function buildDevelopmentBootstrap(migration:string,email:string,scope:string,accounts:SeedAccount[]){
 if(!/^[a-f0-9]{8}$/.test(scope)||accounts.length!==5)throw new Error('Invalid development fixture manifest');
 if(new Set(accounts.map(account=>account.id)).size!==5)throw new Error('Fixture accounts must be distinct');
 accounts.forEach((account,index)=>{
  if(!/^[a-f0-9-]{36}$/i.test(account.id)||account.email!==seedEmail(scope,index))throw new Error('Unexpected fixture account');
 });
 const statements:string[]=[];
 accounts.forEach((account,index)=>{
  const person=seedPeople[index],postId=fixtureId(scope,'coach-post-'+index);
  statements.push(`
  if not exists(select 1 from auth.users where id=${sqlText(account.id)}::uuid and lower(email)=lower(${sqlText(account.email)})) then
    raise exception 'A test account does not match its manifest. No data was applied.' using errcode='22023';
  end if;
  insert into public.profiles(id,handle,display_name,bio,prefecture)
  values(${sqlText(account.id)}::uuid,${sqlText(seedHandle(scope,index))},${sqlText(person.name)},${sqlText(coachIntroduction(index))},${sqlText(person.prefecture)})
  on conflict(id) do update set handle=excluded.handle,display_name=excluded.display_name,bio=excluded.bio,prefecture=excluded.prefecture;
  insert into public.coach_profiles(user_id,introduction,category,area,years_experience)
  values(${sqlText(account.id)}::uuid,${sqlText(coachIntroduction(index))},${sqlText(person.category)},${sqlText(person.prefecture+'・架空のテストエリア')},${6+index})
  on conflict(user_id) do nothing;
  perform set_config('request.jwt.claim.sub',owner_id::text,true);
  perform public.admin_set_coach_status(${sqlText(account.id)}::uuid,${sqlText(index===4?'pending':'approved')}::public.coach_status);
  insert into public.posts(id,user_id,title,species,size_cm,category,fished_on,area,method,rod,reel,lure,memo,is_public,created_at)
  values(${sqlText(postId)}::uuid,${sqlText(account.id)}::uuid,${sqlText('[テスト] '+person.title)},${sqlText(person.species)},${person.size},${sqlText(person.category)},today-${index},${sqlText(person.prefecture+'・架空のテスト釣り場')},'ルアー','テストロッド','テストリール','テストルアー','架空のテスト釣果です。道具や釣り方を記録して、次の釣行で試したいことを残しました。',true,now()-interval '${7+index} days')
  on conflict(id) do nothing;
  insert into public.posts(id,user_id,title,species,size_cm,category,fished_on,area,memo,is_public,created_at)
  values(${sqlText(fixtureId(scope,'owner-post-'+index))}::uuid,owner_id,${sqlText('[テスト・自分の記録] '+person.title)},${sqlText(person.species)},${person.size},${sqlText(person.category)},today-${index+1},${sqlText(person.prefecture+'・架空の練習場所')},${sqlText(index===4?'本人のみが閲覧できる非公開のテスト記録です。':'自分の記録一覧と公開フィードを確認するための架空の釣行メモです。')},${index!==4},now()-interval '${14+index} days')
  on conflict(id) do nothing;
  `);
 });
 const planNames=['はじめての堤防釣り','渓流キャストの基礎','岸釣りのポイント探し','アジングのアタリを学ぶ','道具選びの無料相談'];
 seedPlanCoaches.forEach((coachIndex,index)=>{
  const person=seedPeople[index];
  statements.push(`
  insert into public.coaching_plans(id,coach_id,title,description,duration_minutes,price_yen,is_active)
  values(${sqlText(fixtureId(scope,'plan-'+index))}::uuid,${sqlText(accounts[coachIndex].id)}::uuid,${sqlText('[テスト] '+planNames[index])},'架空のテストプランです。持ち物と安全確認から始め、道具の扱いと釣りの基本を一緒に練習します。',${person.duration},${person.price},true)
  on conflict(id) do update set is_active=true;
  `);
 });
 accounts.forEach((account,index)=>{
  const next=accounts[(index+1)%5],postId=fixtureId(scope,'coach-post-'+index),nextPost=fixtureId(scope,'coach-post-'+((index+1)%5));
  statements.push(`
  insert into public.post_likes(user_id,post_id) values(owner_id,${sqlText(postId)}::uuid),(${sqlText(account.id)}::uuid,${sqlText(nextPost)}::uuid) on conflict do nothing;
  insert into public.bookmarks(user_id,post_id) values(owner_id,${sqlText(postId)}::uuid),(${sqlText(account.id)}::uuid,${sqlText(nextPost)}::uuid) on conflict do nothing;
  insert into public.follows(follower_id,following_id) values(owner_id,${sqlText(account.id)}::uuid),(${sqlText(account.id)}::uuid,${sqlText(next.id)}::uuid) on conflict do nothing;
  insert into public.comments(post_id,user_id,body,created_at)
  select ${sqlText(nextPost)}::uuid,${sqlText(account.id)}::uuid,${sqlText(seedComment(index))},now()-interval '2 days'
  where not exists(select 1 from public.comments where post_id=${sqlText(nextPost)}::uuid and user_id=${sqlText(account.id)}::uuid and body=${sqlText(seedComment(index))});
  `);
 });
 seedRequestStatuses.forEach((status,index)=>{
  const id=fixtureId(scope,'request-'+index),coachId=accounts[seedPlanCoaches[index]].id;
  statements.push(`
  insert into public.coaching_requests(id,client_token,student_id,plan_id,preferred_date,preferred_time,experience,goal,message,created_at)
  values(${sqlText(id)}::uuid,${sqlText(fixtureId(scope,'request-token-'+index))}::uuid,owner_id,${sqlText(fixtureId(scope,'plan-'+index))}::uuid,today+${index+7},'morning','first','道具の使い方を学びたい','初心者向けの架空のテスト相談です。持ち物と基本操作を教えてください。',now()-interval '${7+index} days')
  on conflict(id) do nothing;
  `);
  if(status!=='requested')statements.push(`
  if exists(select 1 from public.coaching_requests where id=${sqlText(id)}::uuid and status='requested') then
    perform set_config('request.jwt.claim.sub',${status==='cancelled'?'owner_id::text':sqlText(coachId)},true);
    update public.coaching_requests set status=${sqlText(status)}::public.consultation_status,coach_note=${sqlText(status==='accepted'?'ご相談を承認しました。実施条件を確認しましょう。（テスト返信）':status==='declined'?'希望日は対応が難しいため、別の日程でご相談ください。（テスト返信）':'')}
    where id=${sqlText(id)}::uuid;
  end if;
  `);
 });
 const ids=accounts.map(account=>sqlText(account.id)+'::uuid').join(',');
 const postIds=accounts.flatMap((_,index)=>[fixtureId(scope,'coach-post-'+index),fixtureId(scope,'owner-post-'+index)]).map(id=>sqlText(id)+'::uuid').join(',');
 const planIds=accounts.map((_,index)=>sqlText(fixtureId(scope,'plan-'+index))+'::uuid').join(',');
 const requestIds=accounts.map((_,index)=>sqlText(fixtureId(scope,'request-'+index))+'::uuid').join(',');
 return '-- Development fixtures: existing real users and records are preserved.\nbegin;\n'+migrationBody(migration)+adminBlock(email)+`
do $seed_development$
declare owner_id uuid=current_setting('tsuri.seed_owner_id')::uuid; today date=(now() at time zone 'Asia/Tokyo')::date;
begin
${statements.join('\n')}
end;
$seed_development$;
commit;
`+adminResult(email)+`
select 'テスト会員' as item,count(*) as count from public.profiles where id in (${ids})
union all select 'テスト釣果',count(*) from public.posts where id in (${postIds})
union all select 'テストコーチ',count(*) from public.coach_profiles where user_id in (${ids})
union all select 'テストプラン',count(*) from public.coaching_plans where id in (${planIds})
union all select 'テスト相談',count(*) from public.coaching_requests where id in (${requestIds});
`;
}
