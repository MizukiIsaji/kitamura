import Link from 'next/link';
import {Fish,ArrowRight} from 'lucide-react';
export function PageTitle({kicker,title,description,action}:{kicker:string;title:string;description?:string;action?:React.ReactNode}){return <div className="page-title"><div><p className="kicker">{kicker}</p><h1>{title}</h1>{description&&<p>{description}</p>}</div>{action}</div>;}
export function Avatar({name,size=''}:{name:string;size?:string}){return <span className={'avatar '+size}>{name.slice(0,1)}</span>;}
export function EmptyState({title,description,href,label}:{title:string;description:string;href?:string;label?:string}){return <div className="empty-state"><span><Fish size={31}/></span><h2>{title}</h2><p>{description}</p>{href&&<Link className="button primary" href={href}>{label}<ArrowRight size={15}/></Link>}</div>;}
export function SetupNotice(){return <EmptyState title="サービスの準備を進めています" description="釣りの記録と、新しい出会いを楽しめる場所を準備中です。公開までしばらくお待ちください。" href="/setup" label="運営者向け初期設定"/>;}
