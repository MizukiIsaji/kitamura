'use client';
import Link from 'next/link';
import {usePathname} from 'next/navigation';
import {Grid2X2,Compass,BookOpen,MessageCircle,Map} from 'lucide-react';
export function NavLinks(){const path=usePathname();return <nav className="nav-links" aria-label="メインナビゲーション">{[['/','釣果を見つける',Grid2X2],['/explore','マップで探す',Map],['/coaches','コーチを探す',Compass],['/records','マイレコード',BookOpen],['/requests','相談・依頼履歴',MessageCircle]].map(([href,label,Icon])=>{const Href=href as string,Component=Icon as typeof Grid2X2,active=Href==='/'?path==='/':path.startsWith(Href);return <Link key={Href} href={Href} className={active?'active':''} aria-current={active?'page':undefined}><Component size={19}/>{label as string}</Link>;})}</nav>;}
