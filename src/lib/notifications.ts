import type {PointRank} from './points';
export const NOTIFICATION_PAGE_SIZE=20;
export type NotificationKind='new_consultation'|'accepted'|'declined'|'cancelled';
export type Notification={id:string;kind:NotificationKind;consultation_id:string;read_at:string|null;created_at:string;counterpart_name:string|null;pointRank?:PointRank|null;counterpart_id?:string|null};
export type NotificationList={status:'ready';entries:Notification[];hasNext:boolean}|{status:'unavailable'};

const summaries:Record<NotificationKind,string>={
 new_consultation:'から新しい相談が届きました',
 accepted:'が相談を承認しました',
 declined:'が相談をお見送りしました',
 cancelled:'が相談を取り下げました',
};

// FR-02.2: 相談の本文・料金を含めず、相手・種類・日時だけで要約する。
export function summarizeNotification({kind,counterpart_name}:{kind:NotificationKind;counterpart_name:string|null}):string{
 return (counterpart_name||'相手')+'さん'+summaries[kind];
}
