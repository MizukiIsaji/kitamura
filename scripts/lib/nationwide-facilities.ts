import fixtures from '../data/nationwide-facilities.json';
import {facilitySchema,idSchema} from '../../src/lib/validation';
import type {FacilityKind} from '../../src/lib/domain';

export const nationwideFixtureScope=fixtures.scope;
export const nationwideFixtureTag=fixtures.tag;
export type NationwideFacility={id:string;kind:FacilityKind;name:string;description:string;prefecture:string;municipality:string;address:string;phone:string;business_hours:string;price_info:string;is_published:boolean};
export const nationwideFacilities:readonly NationwideFacility[]=fixtures.rows.map(row=>({id:idSchema.parse(row.id),...facilitySchema.parse(row)}));
if(new Set(nationwideFacilities.map(row=>row.id)).size!==nationwideFacilities.length)throw new Error('DUPLICATE_FIXTURE_ID');

/** Insert missing IDs only. Existing fixture edits and all unrelated rows stay untouched. */
export function planNationwideFacilities(existing:readonly {id:string;name:string;description:string}[]){
 const ids=new Set(nationwideFacilities.map(row=>row.id));
 const present=new Set<string>();
 for(const row of existing){
  if(!ids.has(row.id))continue;
  if(!row.name.startsWith('[テスト]')||!row.description.startsWith(nationwideFixtureTag))throw new Error('FIXTURE_ID_COLLISION');
  present.add(row.id);
 }
 return {missing:nationwideFacilities.filter(row=>!present.has(row.id)),existingCount:present.size};
}
