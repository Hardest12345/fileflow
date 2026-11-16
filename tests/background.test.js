import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
import {cleanMask,applyAlphaMask} from '../src/background-mask.js';
import {modelConfig} from '../src/background-removal.js';
import {patchImgly} from '../scripts/patch-imgly.mjs';

test('Installed IMG.LY alpha conversion clamps predictions instead of wrapping them',()=>{
 patchImgly();
 for(const file of ['index.mjs','index.cjs']){
  const source=readFileSync(new URL(`../node_modules/@imgly/background-removal/dist/${file}`,import.meta.url),'utf8');
  const fn=source.match(/function convertFloat32ToUint8\(float32Array\) \{[\s\S]*?\n\}/)?.[0];assert.ok(fn);
  const context={import_ndarray2:{default:(data,shape)=>({data,shape})},input:{data:new Float32Array([-.01,-1,0,.5,1,1.01,2,NaN]),shape:[8]}};
  const out=vm.runInNewContext(`${fn};convertFloat32ToUint8(input)`,context);
  assert.deepEqual(Array.from(out.data),[0,0,0,128,255,255,255,0]);
 }
});
test('Quality defaults to full precision and balanced mode uses fp16',()=>{
 assert.equal(modelConfig().model,'isnet');assert.equal(modelConfig('balanced').model,'isnet_fp16');assert.equal(modelConfig('high').rescale,true);
});
function fixture(){const w=50,h=40,a=new Uint8ClampedArray(w*h);for(let y=12;y<35;y++)for(let x=15;x<30;x++)a[y*w+x]=255;return {w,h,a};}
test('Speckle cleanup removes disconnected noise and retains soft subject edges',()=>{
 const {w,h,a}=fixture();a[3*w+3]=250;a[12*w+14]=80;a[12*w+13]=5;
 const out=cleanMask(a,w,h);assert.equal(out[3*w+3],0);assert.equal(out[20*w+20],255);assert.equal(out[12*w+14],80);assert.equal(out[12*w+13],5);assert.equal(a[3*w+3],250);
});
test('Multiple subjects survive normal cleanup; main-subject mode removes separate objects',()=>{
 const {w,h,a}=fixture();for(let y=5;y<12;y++)for(let x=38;x<45;x++)a[y*w+x]=255;
 assert.equal(cleanMask(a,w,h)[7*w+40],255);assert.equal(cleanMask(a,w,h,{mode:'main'})[7*w+40],0);assert.equal(cleanMask(a,w,h,{mode:'main'})[20*w+20],255);
});
test('Diagonal fine detail is connected; off mode preserves exact alpha',()=>{
 const {w,h,a}=fixture();a[11*w+14]=100;a[10*w+13]=70;a[3*w+3]=1;
 const cleaned=cleanMask(a,w,h);assert.equal(cleaned[10*w+13],70);assert.deepEqual(cleanMask(a,w,h,{mode:'off'}),a);
});
test('Empty and uncertain masks stay safe; malformed dimensions are rejected',()=>{
 assert.deepEqual(cleanMask(new Uint8ClampedArray(9),3,3),new Uint8ClampedArray(9));assert.deepEqual(cleanMask(new Uint8ClampedArray([5,5,5,5]),2,2),new Uint8ClampedArray([5,5,5,5]));assert.throws(()=>cleanMask(new Uint8ClampedArray(3),2,2));
});

test('Final composition preserves RGB and original transparency; rejects dimensions mismatch',()=>{
 const source=new Uint8ClampedArray([12,34,56,255, 65,43,21,255, 100,80,60,128, 2,4,6,0]);
 const mask=new Uint8ClampedArray([255,255,255,255, 255,255,255,0, 255,255,255,128, 255,255,255,255]);
 const allowance=new Uint8ClampedArray(16).fill(255);const result=applyAlphaMask(source,mask,allowance);
 assert.deepEqual(Array.from(result),[12,34,56,255,65,43,21,0,100,80,60,64,2,4,6,0]);assert.throws(()=>applyAlphaMask(source,new Uint8ClampedArray(4),allowance));
});
