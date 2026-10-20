import sharp from 'sharp';
export async function encodePhoto(input:Buffer){
 const pipeline=sharp(input,{limitInputPixels:40000000,failOn:'warning'});
 const metadata=await pipeline.metadata();
 if(!metadata.format||!['jpeg','png','webp'].includes(metadata.format))throw new Error('Unsupported image format');
 return pipeline.rotate().resize({width:1600,height:1600,fit:'inside',withoutEnlargement:true}).webp({quality:82}).toBuffer();
}
