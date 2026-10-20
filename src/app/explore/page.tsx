import {Plus} from 'lucide-react';
import Link from 'next/link';
import {FishingMap} from '@/components/fishing-map';
import {PageTitle,SetupNotice} from '@/components/ui';
import {getFishingMap} from '@/lib/queries';
import {isConfigured} from '@/lib/env';
import {mapKinds,type MapKind} from '@/lib/fishing-map';
export const metadata={title:'日本の釣りマップ'};
// 日本の釣りマップ FR-01〜03（docs/ai-dlc/specs/02-records/explore-screen）
export default async function Explore({searchParams}:{searchParams:Promise<Record<string,string|undefined>>}){
 if(!isConfigured())return <SetupNotice/>;
 const params=await searchParams,kind=params.type&&Object.hasOwn(mapKinds,params.type)?params.type as MapKind:'all';
 const {entries,totalCatches}=await getFishingMap();
 return <><PageTitle kicker="JAPAN FISHING ATLAS" title="日本中に、釣りの楽しみを。" description="海へ、川へ、まだ見ぬ一尾へ。地図をめくって、次の釣りのきっかけを見つけよう。" action={<Link className="button primary" href="/posts/new"><Plus size={16}/>釣果を記録</Link>}/><FishingMap key={kind} entries={entries} initialKind={kind} totalCatches={totalCatches}/></>;
}
