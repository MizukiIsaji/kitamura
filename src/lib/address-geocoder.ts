import 'server-only';
import {unstable_cache} from 'next/cache';
import {normalize} from '@geolonia/normalize-japanese-addresses';
import {locateFacilityAddress,type FacilityAddress} from './address-location';

// FR-04.8: only address-derived results are cached. Published DB rows are read outside this scope.
const cachedLocation=unstable_cache(async(facility:FacilityAddress)=>{
 let timer:ReturnType<typeof setTimeout>|undefined;
 try{
  const result=await Promise.race([
   locateFacilityAddress(facility,input=>normalize(input)),
   new Promise<never>((_,reject)=>{timer=setTimeout(()=>reject(new Error('ADDRESS_TIMEOUT')),8000);}),
  ]);
  // Failed requests are not retained as a successful location for the next month.
  if(!result)throw new Error('ADDRESS_UNAVAILABLE');
  return result;
 }finally{clearTimeout(timer);}
},['facility-address-location-v1'],{revalidate:60*60*24*30});

export async function getAddressLocation(facility:FacilityAddress){
 try{return await cachedLocation({prefecture:facility.prefecture,municipality:facility.municipality,address:facility.address});}
 catch{return undefined;}
}
