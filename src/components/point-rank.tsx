import {PointRankIcon} from './rank-icons';
import type {PointRank} from '@/lib/points';

// ADR-012: 階級アイコン＋Lv数字だけを表示する。フル名はtitle/aria-labelで提供し、残高そのものは表示しない。
export function PointRankBadge({rank,iconOnly=false}:{rank:PointRank;iconOnly?:boolean}){
 return <span className={'point-rank '+rank.tier+(iconOnly?' rank-icon-only':'')} title={rank.label} aria-label={rank.label} role="img"><PointRankIcon tier={rank.tier}/>{!iconOnly&&rank.level!==null&&<span>{rank.level}</span>}</span>;
}
