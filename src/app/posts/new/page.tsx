import {PostForm} from '@/components/post-form';
import {PageTitle} from '@/components/ui';
import {requireViewer} from '@/lib/auth';
import {japanDate} from '@/lib/domain';
export const metadata={title:'釣果を記録'};
export default async function NewPost(){
 await requireViewer('/posts/new');
 return <div className="narrow"><PageTitle kicker="NEW FISHING RECORD" title="今日の釣りを、記録に。" description="釣れた一尾も、釣れなかった日の発見も。"/><section className="panel"><PostForm today={japanDate()}/></section></div>;
}
