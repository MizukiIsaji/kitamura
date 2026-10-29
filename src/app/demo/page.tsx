import {notFound} from 'next/navigation';
import {DemoWorkspace} from '@/components/demo-workspace';
import {createDemoData} from '@/lib/demo-data';

export const metadata={title:'開発用テスト画面'};
export default async function DemoPage({searchParams}:{searchParams:Promise<Record<string,string|undefined>>}){
 if(process.env.NODE_ENV==='production')notFound();
 const params=await searchParams,initialView=params.view==='coaches'?'coaches':params.view==='requests'?'requests':'feed';
 return <DemoWorkspace initialData={createDemoData()} initialView={initialView}/>;
}
