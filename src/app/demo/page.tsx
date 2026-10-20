import {notFound} from 'next/navigation';
import {DemoWorkspace} from '@/components/demo-workspace';
import {createDemoData} from '@/lib/demo-data';

export const metadata={title:'開発用テスト画面'};
export default function DemoPage(){
 if(process.env.NODE_ENV==='production')notFound();
 return <DemoWorkspace initialData={createDemoData()}/>;
}
