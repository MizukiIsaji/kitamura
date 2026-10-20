export const categories = {sea:'海釣り',bass:'バス釣り',trout:'渓流・トラウト',aji:'アジング',eging:'エギング'} as const;
export type Category=keyof typeof categories;
export const times={morning:'午前',afternoon:'午後',evening:'夕方',flexible:'相談して決める'} as const;
export const experiences={first:'はじめて',beginner:'初心者（1年未満）',experienced:'経験あり（1年以上）'} as const;
export const statuses={requested:'相談受付',accepted:'コーチが相談を承認',declined:'お見送り',cancelled:'取り下げ済み'} as const;
export type RequestStatus=keyof typeof statuses;
export function japanDate(date=new Date()){return new Intl.DateTimeFormat('sv-SE',{timeZone:'Asia/Tokyo'}).format(date);}
export function money(value:number){return new Intl.NumberFormat('ja-JP',{style:'currency',currency:'JPY',maximumFractionDigits:0}).format(value);}
export function safeReturnTo(value:unknown,fallback='/'){return typeof value==='string'&&value.startsWith('/')&&!value.startsWith('//')&&!/[\\\u0000-\u0020\u007f]/.test(value)?value:fallback;}
export function canTransition(status:RequestStatus,next:RequestStatus,isCoach:boolean){return isCoach?status==='requested'&&['accepted','declined'].includes(next):['requested','accepted'].includes(status)&&next==='cancelled';}
export type Profile={id:string;handle:string;display_name:string;bio:string;prefecture:string;created_at:string;updated_at:string};
export type Post={id:string;user_id:string;title:string;species:string;size_cm:number|null;category:Category;fished_on:string;area:string;method:string;rod:string;reel:string;lure:string;memo:string;image_path:string|null;image_paths?:string[];is_public:boolean;created_at:string;updated_at:string};
export type Coach={user_id:string;status:'pending'|'approved'|'suspended';introduction:string;category:Category;area:string;years_experience:number;created_at:string;updated_at:string};
export type Plan={id:string;coach_id:string;title:string;description:string;duration_minutes:number;price_yen:number;is_active:boolean;created_at:string;updated_at:string};
export type Consultation={id:string;client_token:string;student_id:string;coach_id:string;plan_id:string;plan_title:string;price_yen:number;duration_minutes:number;preferred_date:string;preferred_time:keyof typeof times;experience:keyof typeof experiences;goal:string;message:string;status:RequestStatus;coach_note:string;created_at:string;updated_at:string};
export type Comment={id:string;post_id:string;user_id:string;body:string;created_at:string};
export type PostCardData=Post&{profile:Profile|null;imageUrl:string|null;imageUrls?:string[];likeCount:number;commentCount:number;liked:boolean;bookmarked:boolean};
export const facilityKinds={pond:'釣り堀',spot:'釣りスポット',shop:'釣具店'} as const;
export type FacilityKind=keyof typeof facilityKinds;
export type Facility={id:string;kind:FacilityKind;name:string;description:string;prefecture:string;municipality:string;address:string;phone:string;business_hours:string;price_info:string;is_published:boolean;created_at:string;updated_at:string};
