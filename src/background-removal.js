import {cleanMask,applyAlphaMask} from './background-mask.js';
// One config per model: IMG.LY memoizes sessions by JSON(config). Keep the
// callback stable so repeated photos reuse the model rather than reload it.
let report=()=>{};
const modelProgress=(key,current,total)=>{
 if(key.startsWith('fetch'))report(`Mengunduh model AI: ${total?Math.round(current/total*100):0}%…`);
 else if(key==='compute:inference')report('AI sedang memisahkan subjek dan latar…');
 else if(key==='compute:encode')report('Menyusun gambar transparan…');
};
export const modelConfig=quality=>({device:'cpu',model:quality==='balanced'?'isnet_fp16':'isnet',rescale:true,output:{format:'image/png',quality:1},progress:modelProgress});
const blobOf=canvas=>new Promise((resolve,reject)=>canvas.toBlob(b=>b?resolve(b):reject(new Error('Gagal menyimpan PNG transparan.')),'image/png'));
export async function removeImageBackground(file,options={},progress=()=>{}){
 report=progress;let bitmap,canvas,maskCanvas;
 try{
  bitmap=await createImageBitmap(file);
  if(bitmap.width*bitmap.height>24000000)throw new Error('Hapus background mendukung maksimal 24 megapiksel. Perkecil gambar terlebih dahulu.');
  // Decode once and normalize EXIF/transparency. Composite inference input on
  // white so hidden RGB from transparent inputs cannot confuse segmentation.
  canvas=document.createElement('canvas');canvas.width=bitmap.width;canvas.height=bitmap.height;
  const ctx=canvas.getContext('2d',{willReadFrequently:true});ctx.drawImage(bitmap,0,0);bitmap.close();bitmap=null;
  const original=ctx.getImageData(0,0,canvas.width,canvas.height);
  ctx.globalCompositeOperation='destination-over';ctx.fillStyle='#fff';ctx.fillRect(0,0,canvas.width,canvas.height);ctx.globalCompositeOperation='source-over';
  const input=await blobOf(canvas);progress('Memuat model AI kualitas tinggi…');
  const {segmentForeground}=await import('@imgly/background-removal');
  const mask=await segmentForeground(input,modelConfig(options.bgQuality));
  bitmap=await createImageBitmap(mask);
  // Clean up at model resolution (max 1024) for bounded memory and runtime.
  const scale=Math.min(1,1024/Math.max(canvas.width,canvas.height));
  maskCanvas=document.createElement('canvas');maskCanvas.width=Math.max(1,Math.round(canvas.width*scale));maskCanvas.height=Math.max(1,Math.round(canvas.height*scale));
  const mctx=maskCanvas.getContext('2d',{willReadFrequently:true});mctx.drawImage(bitmap,0,0,maskCanvas.width,maskCanvas.height);bitmap.close();bitmap=null;
  const data=mctx.getImageData(0,0,maskCanvas.width,maskCanvas.height),alpha=new Uint8ClampedArray(maskCanvas.width*maskCanvas.height);
  for(let i=0;i<alpha.length;i++)alpha[i]=data.data[i*4+3];
  progress('Membersihkan sisa latar dan menjaga tepi subjek…');
  const cleaned=cleanMask(alpha,maskCanvas.width,maskCanvas.height,{mode:options.bgCleanup||'speckles'});
  // Cleanup is an allowance mask, not a replacement for the full-resolution AI
  // alpha. Preserve all original fine edges inside allowed connected regions.
  for(let i=0;i<alpha.length;i++){data.data[i*4]=data.data[i*4+1]=data.data[i*4+2]=255;data.data[i*4+3]=(cleaned[i]>0||alpha[i]===0)?255:0;}
  mctx.putImageData(data,0,0);
  ctx.clearRect(0,0,canvas.width,canvas.height);
  bitmap=await createImageBitmap(mask);ctx.drawImage(bitmap,0,0,canvas.width,canvas.height);bitmap.close();bitmap=null;
  const fullMask=ctx.getImageData(0,0,canvas.width,canvas.height);
  ctx.clearRect(0,0,canvas.width,canvas.height);ctx.imageSmoothingEnabled=true;ctx.drawImage(maskCanvas,0,0,canvas.width,canvas.height);
  const allowance=ctx.getImageData(0,0,canvas.width,canvas.height);
  applyAlphaMask(original.data,fullMask.data,allowance.data);
  ctx.putImageData(original,0,0);return await blobOf(canvas);
 }catch(e){
  if(/fetch|network|Failed to create session|memory|allocation|WASM/i.test(e.message||''))throw new Error('Model AI gagal dimuat atau memori tidak cukup. Periksa internet, lalu coba mode Seimbang atau foto berukuran lebih kecil.');
  throw e;
 }finally{bitmap?.close();if(canvas)canvas.width=canvas.height=1;if(maskCanvas)maskCanvas.width=maskCanvas.height=1;report=()=>{};}
}
