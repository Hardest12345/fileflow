import {PDFDocument, degrees, rgb, StandardFonts} from 'pdf-lib';
import {zipSync,unzipSync} from 'fflate';
import {baseName,parsePages} from './utils.js';
const bytes=async f=>new Uint8Array(await f.arrayBuffer());
const result=(data,name,type='application/pdf')=>({blob:data instanceof Blob?data:new Blob([data],{type}),name});
async function imageCanvas(file){
 const bitmap=await createImageBitmap(file); if(bitmap.width*bitmap.height>40000000){bitmap.close();throw new Error('Gambar maksimal 40 megapiksel.');} const c=document.createElement('canvas'); c.width=bitmap.width;c.height=bitmap.height;
 c.getContext('2d').drawImage(bitmap,0,0);bitmap.close();return c;
}
async function canvasBlob(c,type,q){const b=await new Promise(r=>c.toBlob(r,type,q));if(!b)throw new Error('Gambar gagal diproses.');if(b.type!==type)throw new Error('Format keluaran tidak didukung browser ini.');return b;}
async function imageOutput(file,options){
 let c=await imageCanvas(file);
 if(options.width!==undefined){if(!Number(options.width)||Number(options.width)<1||Number(options.width)>10000)throw new Error('Lebar harus antara 1 dan 10000 piksel.');const w=Math.min(10000,Math.max(1,Number(options.width)));if(!Number.isFinite(w))throw new Error('Lebar gambar tidak valid.');const height=Math.round(c.height*w/c.width);if(w*height>40000000)throw new Error('Ukuran hasil terlalu besar.');const d=document.createElement('canvas');d.width=w;d.height=height;d.getContext('2d').drawImage(c,0,0,w,height);c=d;}
 const type=`image/${options.format==='jpg'?'jpeg':options.format||'jpeg'}`;
 if(type==='image/jpeg'){const ctx=c.getContext('2d');ctx.globalCompositeOperation='destination-over';ctx.fillStyle='white';ctx.fillRect(0,0,c.width,c.height);}
 return canvasBlob(c,type,Number(options.quality)/100);
}
let pdfjsPromise;
async function openPdf(file){
 pdfjsPromise ||= import('pdfjs-dist').then(async p=>{p.GlobalWorkerOptions.workerSrc=(await import('pdfjs-dist/build/pdf.worker.min.mjs?url')).default;return p;});
 const p=await pdfjsPromise;
 return p.getDocument({data:await bytes(file),isEvalSupported:false}).promise;
}
async function render(page,scale=1.5){const view=page.getViewport({scale});if(view.width*view.height>40000000)throw new Error('Halaman terlalu besar untuk diproses.');const canvas=document.createElement('canvas');canvas.width=view.width;canvas.height=view.height;await page.render({canvasContext:canvas.getContext('2d'),viewport:view}).promise;return canvas;}
async function makeWord(texts,name){const {Document,Packer,Paragraph,TextRun}=await import('docx');const doc=new Document({sections:texts.map(text=>({children:text.split('\n').map(line=>new Paragraph({children:[new TextRun(line)]}))}))});return result(await Packer.toBlob(doc),name,'application/vnd.openxmlformats-officedocument.wordprocessingml.document');}
export async function processFiles(id,files,o,progress=()=>{}){
 const name=baseName(files[0].name), outputs=[];progress('Menyiapkan file…');
 if(id==='zip'){const entries={};files.forEach((f,i)=>entries[`${i+1}-${f.name}`]=null);await Promise.all(files.map(async(f,i)=>entries[`${i+1}-${f.name}`]=await bytes(f)));return [result(zipSync(entries,{level:9}),'fileflow-arsip.zip','application/zip')];}
 if(['compress-image','image-convert','resize'].includes(id)){
 for(const [i,f] of files.entries()){progress(`Memproses gambar ${i+1}/${files.length}…`);const format=id==='compress-image'?(f.type==='image/png'?'png':f.type==='image/webp'?'webp':'jpg'):o.format;const b=await imageOutput(f,{...o,format,width:id==='resize'?o.width:undefined});
 outputs.push(id==='compress-image'&&b.size>=f.size?{...result(f,f.name,f.type),info:'File asli dipertahankan karena hasil kompresi lebih besar.'}:result(b,`${baseName(f.name)}-fileflow.${format}`));}return outputs;}
 if(id==='remove-bg'){progress('Mengunduh / memuat model AI…');const {removeBackground}=await import('@imgly/background-removal');const b=await removeBackground(files[0],{device:'cpu',model:'isnet_quint8',progress:(key,current,total)=>progress(`Model AI: ${total?Math.round(current/total*100):0}% · ${key.startsWith('fetch')?'mengunduh':'memproses'}`)});return [result(b,`${name}-tanpa-background.png`,'image/png')];}
 if(id==='office'){
 const body=new FormData();body.append('file',files[0]);progress('Mengonversi di server Office…');const res=await fetch('/api/office',{method:'POST',headers:{'X-Office-Key':o.accessKey||''},body});
 if(!res.ok){const err=await res.json().catch(()=>({error:'Layanan Office tidak tersedia. Jalankan melalui Vercel atau vercel dev.'}));throw new Error(err.error);}
 return [result(await res.blob(),`${name}.pdf`)];
 }
 if(id==='compress-office'){
 const zipped=await bytes(files[0]); // Read declared sizes before allocation to reject oversized archives.
 let expanded=0;
 const entries=unzipSync(zipped,{filter:entry=>{expanded+=entry.originalSize;if(expanded>150*1024*1024)throw new Error('Isi dokumen terlalu besar (maksimal 150 MB).');return true;}});
 for(const [path,data] of Object.entries(entries))if(/\/(media)\/.*\.jpe?g$/i.test(path)){const b=await imageOutput(new Blob([data],{type:'image/jpeg'}),{...o,format:'jpg'});if(b.size<data.length)entries[path]=new Uint8Array(await b.arrayBuffer());}
 const out=zipSync(entries,{level:9});return [out.length<files[0].size?result(out,`${name}-compressed.${files[0].name.split('.').pop()}`,files[0].type):{...result(files[0],files[0].name,files[0].type),info:'Dokumen sudah optimal; file asli dipertahankan.'}];
 }
 if(id==='image-pdf'){
 const doc=await PDFDocument.create();for(const f of files){const b=await imageOutput(f,{quality:92,format:'jpg'});const img=await doc.embedJpg(await b.arrayBuffer());const page=doc.addPage([595.28,841.89]);const d=img.scaleToFit(547.28,793.89);page.drawImage(img,{x:(page.getWidth()-d.width)/2,y:(page.getHeight()-d.height)/2,...d});}return [result(await doc.save(),'fileflow-gambar.pdf')];
 }
 if(['compress-pdf','pdf-image','ocr','pdf-word'].includes(id)){
 const pdf=await openPdf(files[0]);let worker;try{
 if(pdf.numPages>(id==='ocr'?30:150))throw new Error(`Maksimal ${id==='ocr'?30:150} halaman untuk alat ini.`);
 const doc=id==='compress-pdf'?await PDFDocument.create():null,texts=[],images={};
 if(id==='ocr'){progress('Memuat OCR Indonesia + Inggris…');const {createWorker}=await import('tesseract.js');worker=await createWorker('ind+eng',1,{logger:m=>{if(m.status==='recognizing text')progress(`OCR: ${Math.round(m.progress*100)}% pada halaman aktif…`);}});}
 for(let i=1;i<=pdf.numPages;i++){
 progress(`Memproses halaman ${i}/${pdf.numPages}…`);const page=await pdf.getPage(i);
 if(id==='pdf-word'){const content=await page.getTextContent();let text='';for(const item of content.items)text+=item.str+(item.hasEOL?'\n':' ');texts.push(text);continue;}
 const canvas=await render(page,id==='compress-pdf'?1.15:1.7);
 if(id==='ocr'){const {data}=await worker.recognize(canvas);texts.push(data.text);}
 else {const b=await canvasBlob(canvas,'image/jpeg',Number(o.quality)/100);if(doc){const img=await doc.embedJpg(await b.arrayBuffer());const v=page.getViewport({scale:1});doc.addPage([v.width,v.height]).drawImage(img,{x:0,y:0,width:v.width,height:v.height});}else images[`halaman-${i}.jpg`]=new Uint8Array(await b.arrayBuffer());}canvas.width=canvas.height=1;
 }
 if(id==='pdf-word'||id==='ocr'){if(!texts.join('').trim())throw new Error('Tidak ada teks ditemukan. Coba alat OCR untuk PDF hasil scan.');return [await makeWord(texts,`${name}.docx`)];}
 if(doc){const out=await doc.save();return [out.length<files[0].size?result(out,`${name}-compressed.pdf`):{...result(files[0],files[0].name),info:'Hasil tidak lebih kecil; file asli dipertahankan.'}];}
 return [result(zipSync(images),`${name}-gambar.zip`,'application/zip')];
 }finally{if(worker)await worker.terminate();await pdf.destroy();}
 }
 if(id==='merge'){
 if(files.length<2)throw new Error('Pilih minimal dua PDF untuk digabungkan.');const doc=await PDFDocument.create();for(const f of files){const source=await PDFDocument.load(await bytes(f));const pages=await doc.copyPages(source,source.getPageIndices());pages.forEach(p=>doc.addPage(p));}return [result(await doc.save(),'fileflow-gabungan.pdf')];
 }
 const doc=await PDFDocument.load(await bytes(files[0]));
 if(id==='split'){const selection=parsePages(o.pages,doc.getPageCount());const target=await PDFDocument.create();(await target.copyPages(doc,selection)).forEach(p=>target.addPage(p));return [result(await target.save(),`${name}-halaman.pdf`)];}
 if(id==='rotate'){for(const p of doc.getPages())p.setRotation(degrees((p.getRotation().angle+Number(o.angle))%360));}
 if(id==='watermark'){if(!o.watermark.trim())throw new Error('Isi teks watermark terlebih dahulu.');const font=await doc.embedFont(StandardFonts.Helvetica);try{font.encodeText(o.watermark);}catch{throw new Error('Watermark mendukung karakter Latin. Gunakan teks tanpa emoji.');}for(const p of doc.getPages()){const fontSize=Math.min(42,(p.getWidth()-40)/font.widthOfTextAtSize(o.watermark,1));p.drawText(o.watermark,{x:20,y:p.getHeight()/2,size:fontSize,font,color:rgb(.35,.4,.38),opacity:.3});}}
 return [result(await doc.save(),`${name}-fileflow.pdf`)];
}
