import {getOwnPointBalance} from '@/lib/point-queries';
import {PointBalanceCard} from './point-balance-card';
export async function PointSummary(){return <PointBalanceCard state={await getOwnPointBalance()}/>;}
