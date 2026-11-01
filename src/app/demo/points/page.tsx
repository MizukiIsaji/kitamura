import {notFound} from 'next/navigation';
import {PointDashboardPreview} from '@/components/point-dashboard-preview';
import {PageTitle} from '@/components/ui';

export const metadata={title:'ポイント画面の開発用プレビュー'};
export default function PointPreviewPage(){
 if(process.env.NODE_ENV==='production')notFound();
 return <div className="narrow points-page"><PageTitle kicker="POINTS PREVIEW" title="ポイント画面の確認" description="残高・ランク・進捗・取得状態を切り替えて確認できます。"/><PointDashboardPreview/></div>;
}
