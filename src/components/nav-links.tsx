'use client';
import Link from 'next/link';
import {usePathname} from 'next/navigation';
import {Grid2X2,Compass,BookOpen,MessageCircle,Map,Plus} from 'lucide-react';
import {mainNavigation,activeNavigationHref} from '@/lib/navigation';
const icons={map:Map,feed:Grid2X2,create:Plus,records:BookOpen,coach:Compass,requests:MessageCircle};
export function NavLinks({variant='sidebar'}:{variant?:'sidebar'|'mobile'}){
 const active=activeNavigationHref(usePathname());
 return <nav className={variant==='mobile'?'mobile-nav':'nav-links'} aria-label={variant==='mobile'?'モバイルナビゲーション':'メインナビゲーション'}>{mainNavigation.map(item=>{
  const Icon=icons[item.icon],current=active===item.href;
  const className=[variant==='mobile'&&item.icon==='create'?'mobile-create':'',current?'active':''].filter(Boolean).join(' ');
  return <Link key={item.href} href={item.href} className={className||undefined} aria-current={current?'page':undefined}><Icon size={19}/>{item.label}</Link>;
 })}</nav>;
}
