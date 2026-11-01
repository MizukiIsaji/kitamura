import Link from 'next/link';
import {Bell} from 'lucide-react';
import {getOwnUnreadNotificationCount} from '@/lib/notification-queries';

// 通知 FR-03.1: 未読件数を共通ヘッダーに表示する。0件のときは件数を表示しない。
export async function NotificationBell({iconOnly=false}:{iconOnly?:boolean}={}){
 const count=await getOwnUnreadNotificationCount();
 const label=count?'通知：未読'+count+'件':'通知';
 return <Link href="/notifications" className="icon-button notification-bell" aria-label={label} title={label}>
  <Bell size={18}/>
  {!!count&&(iconOnly?<span className="notification-dot" aria-hidden="true"/>:<span className="notification-count">{count>99?'99+':count}</span>)}
 </Link>;
}
