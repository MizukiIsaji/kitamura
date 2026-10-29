import type {RegistrationRewardCampaign} from '@/lib/points';
const dateFormat=new Intl.DateTimeFormat('ja-JP',{timeZone:'Asia/Tokyo',dateStyle:'long',timeStyle:'short'});
export function RegistrationRewardNotice({campaign}:{campaign:RegistrationRewardCampaign|null}){
 if(!campaign)return <p className="field-help">登録特典の対象期間は現在確認できません。</p>;
 return <div className="notice point-campaign"><strong>アカウント登録特典 5,000pt</strong>
  <p>対象期間内に発行されたアカウントへ、一度だけ付与します。既存の会員も対象です。</p>
  <p>発行日時：{campaign.starts_at?`${dateFormat.format(new Date(campaign.starts_at))}以降`:'開始日の制限なし'} ～ {dateFormat.format(new Date(campaign.ends_at))}より前（日本時間）</p>
 </div>;
}
// ポイント FR-02, FR-03: explain the same fixed rules enforced by the DB.
export function PointRewardRules({campaign}:{campaign:RegistrationRewardCampaign|null}){
 return <section className="panel point-rules"><h2>ポイントの貯め方</h2>
  <dl><div><dt>釣行記録の投稿</dt><dd>100pt / 投稿</dd></div><div><dt>写真</dt><dd>10pt / 枚（最大5枚）</dd></div><div><dt>タックルの記載</dt><dd>10pt / 投稿</dd></div><div><dt>釣行メモ100文字以上</dt><dd>50pt / 投稿</dd></div></dl>
  <p className="field-help">タックルはロッド・リール・ルアー／仕掛けのいずれかを記載すると加算。メモは任意で、空白を除いて数えます。</p>
  <p className="field-help">公開・自分のみの両方が対象です。保存完了時に一度付与し、編集による追加付与はありません。投稿を削除すると、その投稿分を取り消します。</p>
  <RegistrationRewardNotice campaign={campaign}/>
 </section>;
}
