// IMG.LY 1.7.0 writes floating point alpha into Uint8Array, which wraps
// out-of-range predictions (e.g. -0.01 -> 254) instead of saturating them.
// Keep this patch until upstream clamps alpha before converting to bytes.
import {readFileSync,writeFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
export function patchImgly(){
 const root=new URL('../node_modules/@imgly/background-removal/',import.meta.url);
 const pkg=JSON.parse(readFileSync(new URL('package.json',root),'utf8'));
 if(pkg.version!=='1.7.0')throw new Error('Review IMG.LY alpha patch before changing version.');
 const before='const uint8Array = new Uint8Array(float32Array.data.length);';
 const after='const uint8Array = new Uint8ClampedArray(float32Array.data.length);';
 for(const name of ['dist/index.mjs','dist/index.cjs']){
  const path=new URL(name,root),source=readFileSync(path,'utf8');
  if(source.includes(after))continue;
  if(source.split(before).length!==2)throw new Error(`Expected alpha conversion missing in ${name}`);
  writeFileSync(path,source.replace(before,after));
 }
 console.log('IMG.LY alpha conversion patched (saturating bytes).');
}
if(process.argv[1]===fileURLToPath(import.meta.url))patchImgly();
