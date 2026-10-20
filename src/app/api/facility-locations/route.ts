import {createClient} from '@/lib/supabase/server';
import {municipalityById} from '@/lib/localities';
import {locateMunicipalityFacilities,type FacilityAddress} from '@/lib/address-location';
import {getAddressLocation} from '@/lib/address-geocoder';

export const runtime='nodejs';
export const dynamic='force-dynamic';
const headers={'Cache-Control':'private, no-store'};

// FR-04.8: accept a catalog municipality, never an arbitrary address or an untrusted URL.
export async function GET(request:Request){
 const city=municipalityById.get(new URL(request.url).searchParams.get('municipality')||'');
 if(!city)return Response.json({error:'市区町村を選択してください。'},{status:400,headers});
 try{
  const db=await createClient();
  const rows:(FacilityAddress&{id:string;is_published:boolean})[]=[];
  for(let offset=0;;offset+=1000){
   const {data,error}=await db.from('facilities').select('id,prefecture,municipality,address,is_published').eq('is_published',true).eq('prefecture',city.prefecture).order('id').range(offset,offset+999).abortSignal(AbortSignal.timeout(10000));
   if(error)throw new Error('FACILITY_QUERY_FAILED');
   rows.push(...(data||[]));
   if(!data||data.length<1000)break;
  }
  const locations=await locateMunicipalityFacilities(rows,city.id,getAddressLocation);
  return Response.json({municipality:city.id,locations},{headers});
 }catch{
  return Response.json({error:'位置を取得できませんでした。市区町村の目安で表示します。'},{status:503,headers});
 }
}
