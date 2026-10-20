import {test} from 'node:test';
import assert from 'node:assert/strict';
import sharp from 'sharp';
import {encodePhoto} from '../src/lib/photo';
test('photos are resized, converted to WebP and stripped of source metadata',async()=>{const input=await sharp({create:{width:2400,height:1200,channels:3,background:'#34634a'}}).jpeg().withMetadata({orientation:1}).toBuffer();const output=await encodePhoto(input),meta=await sharp(output).metadata();assert.equal(meta.format,'webp');assert.equal(meta.width,1600);assert.equal(meta.height,800);assert.equal(meta.exif,undefined);});
test('invalid and disguised SVG images are rejected',async()=>{await assert.rejects(()=>encodePhoto(Buffer.from('not an image')));await assert.rejects(()=>encodePhoto(Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10"><rect width="10" height="10"/></svg>')));});
