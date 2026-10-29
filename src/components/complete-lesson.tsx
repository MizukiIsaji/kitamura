import {ActionForm} from './action-form';
import {completeConsultation} from '@/app/actions';
import {japanDate,type Consultation} from '@/lib/domain';

export function CompleteLesson({request}:{request:Consultation}){
 if(request.completed_at||request.status!=='accepted')return null;
 if(request.preferred_date>japanDate())return <p className="field-help">指導を受けた後、希望日以降に完了を確認できます。</p>;
 return <ActionForm action={completeConsultation} label="指導完了を確認する">
  <input type="hidden" name="id" value={request.id}/>
  <label className="check-label"><input name="confirm_completion" type="checkbox" required/><span>この指導を受け終えました。完了後は取り下げできないことを確認しました。</span></label>
  <p className="field-help">受講者の確認で、コーチの指導実績に1件加算されます。決済・精算は行いません。</p>
 </ActionForm>;
}
