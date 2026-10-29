import {japanDate, type Category, type Profile, type PostCardData, type Coach, type Plan, type Consultation, type Comment} from './domain';
import {coachRankForLessons,priceRankedPlan,coachRankRates} from './coach-ranks';

export type DemoData={viewerId:string;profiles:Profile[];posts:PostCardData[];coaches:Coach[];plans:Plan[];requests:Consultation[];comments:Comment[];following:string[]};
// テスト画面だけの操作。実際のDBや実績には送信しない。
export function completeDemoLesson(data:DemoData,requestId:string,today=japanDate()):DemoData{
 const request=data.requests.find(item=>item.id===requestId);
 if(!request||request.student_id!==data.viewerId||request.status!=='accepted'||request.preferred_date>today)throw new Error('完了を確認できる相談ではありません。');
 if(request.completed_at)return data;
 const coach=data.coaches.find(coach=>coach.user_id===request.coach_id);
 if(!coach?.rankInfo)throw new Error('コーチの実績を確認できません。');
 const completedLessons=coach.rankInfo.completedLessons+1,rank=coachRankForLessons(completedLessons);
 return {...data,coaches:data.coaches.map(item=>item.user_id===coach.user_id?{...item,rankInfo:{rank,completedLessons}}:item),plans:data.plans.map(plan=>plan.coach_id===coach.user_id?priceRankedPlan(plan,rank):plan),requests:data.requests.map(item=>item.id===requestId?{...item,completed_at:today+'T03:00:00.000Z'}:item)};
}
const id=(n:number)=>`00000000-0000-4000-8000-${String(n).padStart(12,'0')}`;
const offsetDate=(today:string,days:number)=>new Date(Date.parse(today+'T12:00:00Z')+days*86400000).toISOString().slice(0,10);

/** Fictional fixtures for the development preview; never inserts into Supabase. */
export function createDemoData(today=japanDate()):DemoData{
 const timestamp=today+'T03:00:00.000Z';
 const people=[
  ['あなた（テスト）','test_angler','東京都','釣りを始めたばかり。週末の釣行を記録しています。'],
  ['海野 あおい（テスト）','test_aoi','神奈川県','堤防の海釣りが好きです。安全な道具の使い方から一緒に練習しましょう。'],
  ['川辺 みずき（テスト）','test_mizuki','長野県','渓流でのキャストや流れの読み方を、初心者向けにお伝えします。'],
  ['湖畔 そら（テスト）','test_sora','滋賀県','バス釣りの道具選びと岸釣りを中心に活動しています。'],
  ['夕凪 なぎ（テスト）','test_nagi','静岡県','アジングとエギングを練習中。小さな発見をメモしています。'],
  ['はじめての釣り人（テスト）','test_newcomer','千葉県','まだ投稿がない、新規会員のテスト用プロフィールです。'],
 ];
 const profiles:Profile[]=people.map(([display_name,handle,prefecture,bio],i)=>({id:id(i+1),display_name,handle,prefecture,bio,created_at:timestamp,updated_at:timestamp}));
 const samples:[string,string,number|null,Category,string,string][]=[
  ['朝の堤防でアジに出会えた','アジ',23,'sea','神奈川県・架空のテスト堤防','朝の短い時間に回遊。足元の安全を確認してから釣りを始めました。'],
  ['流れの脇にルアーを通してみた','ニジマス',31,'trout','長野県・架空のテスト渓流','流れの速さに合わせて巻き速度を調整。キャストの練習もできました。'],
  ['岸際の変化を探して一尾','ブラックバス',42,'bass','滋賀県・架空のテスト湖','同じ場所に立ち続けず、足元の地形が変わる場所を探しました。'],
  ['小さなアタリを感じる練習','アジ',18,'aji','静岡県・架空のテスト港','軽いジグヘッドでレンジを変えながら探しました。サイズ以上にうれしい一尾。'],
  ['夕方のエギング記録','アオリイカ',null,'eging','静岡県・架空のテスト岸壁','サイズ未測定の表示例です。周囲との間隔を空けて練習しました。'],
  ['初めてのシロギス','シロギス',19,'sea','千葉県・架空のテスト海岸','投げ方を教わってから少し遠くへ。次回は仕掛けの扱いを覚えたいです。'],
  ['雨上がりの渓流メモ','ヤマメ',24,'trout','長野県・架空のテスト川','釣行時の気づきを複数行で表示するテストです。\n水位を確認し、無理のない区間だけ歩きました。'],
  ['ルアーの色を変えて反応を比較','ブラックバス',35.5,'bass','滋賀県・架空のテスト池','小数点を含むサイズの表示例。色だけでなく、通す深さも記録しました。'],
  ['風の弱い場所でアジング','アジ',21,'aji','神奈川県・架空のテスト港','糸ふけを取り、アタリを待つ練習。写真なしの投稿も記録できます。'],
  ['エギの沈む時間を計ってみた','アオリイカ',27,'eging','静岡県・架空のテスト海岸','着底の感覚を覚える練習をしました。釣り場のルールも確認済み。'],
  ['親子で楽しむ堤防の一日','サバ',28,'sea','千葉県・架空のテスト堤防','ライフジャケットと休憩を忘れずに。道具の片付けまで一緒に練習しました。'],
  ['今日は釣れなくても発見があった','',null,'trout','長野県・架空のテスト渓流','釣果なし・魚種なしの記録例。次に試したいことを残しておきます。'],
  ['自分だけの練習メモ（非公開）','アジ',17,'aji','東京都・架空のテストエリア','自分の記録にだけ表示される非公開データです。'],
  ['他の人の非公開記録（表示対象外）','ブラックバス',38,'bass','滋賀県・架空のテストエリア','公開フィードや保存一覧には出ないことを確認するテスト用です。'],
 ];
 const authors=[1,2,3,4,4,0,2,3,0,4,1,2,0,3];
 const posts:PostCardData[]=samples.map(([title,species,size_cm,category,area,memo],i)=>{
  const profile=profiles[authors[i]];
  return {id:id(101+i),user_id:profile.id,title,species,size_cm,category,area,memo,method:category==='sea'?'サビキ・ちょい投げ':'ルアー',rod:'テスト用ロッド',reel:'テスト用リール',lure:category==='sea'?'サビキ釣り':category==='eging'?'エギング・イカ釣り':category==='aji'?'ライトゲーム':'ショアルアー',fished_on:offsetDate(today,-i),image_path:null,imageUrl:null,is_public:i<12,created_at:offsetDate(today,-i)+'T03:00:00.000Z',updated_at:timestamp,profile,likeCount:i%4===0?0:3+i*2,commentCount:0,liked:i===1,bookmarked:i===2||i===6};
 });
 const coaches:Coach[]=[1,2,3,4,5].map((person,i)=>({user_id:profiles[person].id,status:i===4?'pending':'approved',category:(['sea','trout','bass','eging','sea'] as const)[i],area:profiles[person].prefecture+'・架空のテストエリア',introduction:profiles[person].bio+' こちらは架空の指導者によるテスト表示です。',years_experience:[12,9,15,4,0][i],rankInfo:i<4?{rank:coachRankForLessons([100,99,29,9][i]),completedLessons:[100,99,29,9][i]}:null,created_at:timestamp,updated_at:timestamp}));
 const planSamples:[number,string,number,number][]=[[1,'はじめての堤防釣り',120,7000],[1,'道具選びのオンライン相談',30,0],[2,'渓流キャストの基礎',180,9000],[3,'岸釣りのポイント探し',120,4000],[3,'非公開プランのテスト',60,3000],[2,'2時間の渓流レッスン',120,5000],[4,'2時間のエギング入門',120,3000]];
 const plans:Plan[]=planSamples.map(([person,title,duration_minutes,price_yen],i)=>priceRankedPlan({id:id(201+i),coach_id:profiles[person].id,title,description:'持ち物と安全確認から始め、基本操作を自分のペースで練習する架空のプランです。',duration_minutes,price_yen,is_active:i!==4,created_at:timestamp,updated_at:timestamp},coaches.find(coach=>coach.user_id===profiles[person].id)?.rankInfo?.rank||null));
 const requests:Consultation[]=(['requested','accepted','declined','cancelled'] as const).map((status,i)=>{
  const plan=plans[[0,6,3,0][i]];
  const rank=coaches.find(coach=>coach.user_id===plan.coach_id)?.rankInfo?.rank;
  return {id:id(301+i),client_token:id(401+i),student_id:profiles[0].id,coach_id:plan.coach_id,plan_id:plan.id,plan_title:plan.title,price_yen:plan.price_yen,duration_minutes:plan.duration_minutes,compensation:plan.duration_minutes===120&&rank?{rank,coach_payout_yen:coachRankRates[rank].coachPayoutYen}:null,preferred_date:status==='accepted'?today:offsetDate(today,7+i),preferred_time:'morning',experience:'first',preferred_area:'神奈川県',equipment_status:'none',goal:'道具の使い方と安全な釣り方を覚えたい',message:'藤沢市の湘南エリアで希望します。必要な持ち物から教えてください。（架空のテスト相談）',status,coach_note:status==='accepted'?'ご相談ありがとうございます。持ち物と実施条件を確認しましょう。（テスト返信）':status==='declined'?'希望日は対応が難しいため、別の日程でご相談ください。（テスト返信）':'',created_at:timestamp,updated_at:timestamp};
 });
 const comments:Comment[]=[{id:id(501),post_id:posts[1].id,user_id:profiles[0].id,body:'流れの見方を参考にしたいです。（テストコメント）',created_at:timestamp},{id:id(502),post_id:posts[1].id,user_id:profiles[2].id,body:'まずは岸から流れを観察してみてください。（テスト返信）',created_at:timestamp}];
 posts.forEach(post=>{post.commentCount=comments.filter(comment=>comment.post_id===post.id).length;});
 return {viewerId:profiles[0].id,profiles,posts,coaches,plans,requests,comments,following:[profiles[2].id]};
}

export function filterDemoPosts(data:DemoData,{view='feed',category='',q=''}:{view?:string;category?:string;q?:string}={}){
 return data.posts.filter(post=>{
  if(!post.is_public&&post.user_id!==data.viewerId)return false;
  if(view==='mine') {if(post.user_id!==data.viewerId)return false;}
  else if(view==='saved') {if(!post.bookmarked)return false;}
  else if(!post.is_public)return false;
  if(view==='following'&&!data.following.includes(post.user_id))return false;
  return (!category||post.category===category)&&(!q||[post.title,post.species,post.area,post.memo].some(value=>value.toLocaleLowerCase('ja-JP').includes(q.trim().toLocaleLowerCase('ja-JP'))));
 }).sort((a,b)=>b.created_at.localeCompare(a.created_at)||a.id.localeCompare(b.id));
}
