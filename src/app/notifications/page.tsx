import {requireViewer} from '@/lib/auth';
import {getOwnNotifications} from '@/lib/notification-queries';
import {summarizeNotification} from '@/lib/notifications';
import {PageTitle,EmptyState,Avatar} from '@/components/ui';
import {MemberRanks} from '@/components/member-ranks';
import {openNotification} from './actions';

export const metadata={title:'通知'};

// 通知 FR-02.1〜FR-02.3: 自分宛の通知を新しい順に表示し、開くと既読にして対象の相談へ移動する。
export default async function Notifications(){
 await requireViewer('/notifications');
 const list=await getOwnNotifications();
 return <>
  <PageTitle kicker="NOTIFICATIONS" title="通知" description="相談の状態が変わると、ここに表示されます。"/>
  {list.status!=='ready'&&<p className="notice">通知を取得できませんでした。しばらくしてから再度お試しください。</p>}
  {list.status==='ready'&&(list.entries.length?<ul className="notification-list">{list.entries.map(n=><li key={n.id}>
   <form action={openNotification}>
    <input type="hidden" name="id" value={n.id}/>
    <button type="submit" className={'notification-item member-surface'+(n.read_at?'':' unread')} data-rank-theme={n.pointRank?.tier}>
     <Avatar name={n.counterpart_name||'相手'} userId={n.counterpart_id??undefined} size="small"/><span className="notification-identity"><span>{summarizeNotification(n)}</span><MemberRanks pointRank={n.pointRank}/></span>
     <time dateTime={n.created_at}>{new Intl.DateTimeFormat('ja-JP',{timeZone:'Asia/Tokyo',dateStyle:'short',timeStyle:'short'}).format(new Date(n.created_at))}</time>
    </button>
   </form>
  </li>)}</ul>:<EmptyState title="通知はまだありません" description="新しい相談や、相談への返信があるとここに表示されます。" href="/requests" label="相談履歴へ"/>)}
 </>;
}
