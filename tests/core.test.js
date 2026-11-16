import test from 'node:test';
import assert from 'node:assert/strict';
import {PDFDocument,StandardFonts} from 'pdf-lib';
import {unzipSync} from 'fflate';
import {parsePages,validateFiles} from '../src/utils.js';
import {processFiles} from '../src/processor.js';
import handler,{authorized,readUpload} from '../api/office.js';
import {Readable} from 'node:stream';
async function pdfFile(name,count){const doc=await PDFDocument.create();const font=await doc.embedFont(StandardFonts.Helvetica);for(let i=0;i<count;i++)doc.addPage([name.startsWith('a')?300+i:400+i,600]).drawText(`${name} page ${i+1}`,{font});return new File([await doc.save()],name,{type:'application/pdf'});}
test('Page ranges preserve requested order and reject invalid ranges',()=>{assert.deepEqual(parsePages('4, 1-2, 2',5),[3,0,1]);assert.deepEqual(parsePages('',2),[0,1]);for(const value of ['0','3-1','1-8','abc','1,'])assert.throws(()=>parsePages(value,5));});
test('Validation rejects mismatched formats, empty files, and Office over limit',()=>{assert.throws(()=>validateFiles([new File(['x'],'x.png')],{accept:'.pdf'}));assert.throws(()=>validateFiles([new File([],'x.pdf')],{accept:'.pdf'}));assert.throws(()=>validateFiles([new File([new Uint8Array(4*1024*1024+1)],'x.docx')],{accept:'.docx',server:true}));});
test('Merge preserves pages; extract reorders; rotate and watermark output valid PDF',async()=>{const a=await pdfFile('a.pdf',2),b=await pdfFile('b.pdf',1);const [merged]=await processFiles('merge',[a,b],{});assert.deepEqual((await PDFDocument.load(await merged.blob.arrayBuffer())).getPages().map(p=>p.getWidth()),[300,301,400]);const [split]=await processFiles('split',[new File([merged.blob],'all.pdf')],{pages:'3,1'});assert.deepEqual((await PDFDocument.load(await split.blob.arrayBuffer())).getPages().map(p=>p.getWidth()),[400,300]);const [rotated]=await processFiles('rotate',[a],{angle:'90'});assert.equal((await PDFDocument.load(await rotated.blob.arrayBuffer())).getPage(0).getRotation().angle,90);const [watermark]=await processFiles('watermark',[a],{watermark:'CONFIDENTIAL'});assert.equal((await PDFDocument.load(await watermark.blob.arrayBuffer())).getPageCount(),2);await assert.rejects(()=>processFiles('merge',[a],{}));});
test('ZIP supports arbitrary types and duplicate file names without losing entries',async()=>{const [r]=await processFiles('zip',[new File(['one'],'a.doc'),new File(['two'],'a.doc')],{});const entries=unzipSync(new Uint8Array(await r.blob.arrayBuffer()));assert.equal(Object.keys(entries).length,2);assert.equal(new TextDecoder().decode(entries['2-a.doc']),'two');});
test('Office secret validation fails closed',()=>{assert.equal(authorized('a','a'),true);assert.equal(authorized('a','b'),false);assert.equal(authorized('',undefined),false);assert.equal(authorized(['a'],'a'),false);});
test('Office API refuses GET and unconfigured POST',async()=>{const res={headers:{},setHeader(k,v){this.headers[k]=v;},status(n){this.code=n;return this;},json(v){this.data=v;return this;}};await handler({method:'GET'},res);assert.equal(res.code,405);await handler({method:'POST'},res);assert.equal(res.code,503);});
function multipart(filename,content){const boundary='fileflow-test';const raw=Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="${filename}"\r\nContent-Type: application/octet-stream\r\n\r\n${content}\r\n--${boundary}--\r\n`);const req=Readable.from(raw);req.headers={'content-type':`multipart/form-data; boundary=${boundary}`};return req;}
test('Office multipart accepts Office and rejects unsupported formats',async()=>{const upload=await readUpload(multipart('private.docx','test'));assert.equal(upload.name,'document.docx');assert.equal(upload.buffer.toString(),'test');await assert.rejects(()=>readUpload(multipart('x.exe','test')),/tidak didukung/);});

test('Office proxy authenticates before upload and returns upstream PDF',async()=>{
 const previous={...process.env},originalFetch=globalThis.fetch;
 const response=()=>({headers:{},setHeader(k,v){this.headers[k]=v;},status(n){this.code=n;return this;},json(v){this.data=v;return this;},send(v){this.body=v;return this;}});
 try{
 process.env.GOTENBERG_URL='https://office.example.com';process.env.OFFICE_ACCESS_KEY='long-secret';
 let calls=0;globalThis.fetch=async(url,opts)=>{calls++;assert.equal(url.toString(),'https://office.example.com/forms/libreoffice/convert');assert.equal(opts.body.get('files').name,'document.docx');return new Response('%PDF-1.7 fake upstream for transport testing',{headers:{'content-type':'application/pdf'}});};
 let res=response();await handler({method:'POST',headers:{'x-office-key':'wrong'}},res);assert.equal(res.code,401);assert.equal(calls,0);
 const req=multipart('myfile.docx','office bytes');req.method='POST';req.headers['x-office-key']='long-secret';res=response();await handler(req,res);assert.equal(res.code,200);assert.equal(calls,1);assert.ok(res.body.toString().startsWith('%PDF-'));assert.equal(res.headers['Cache-Control'],'no-store');
 }finally{globalThis.fetch=originalFetch;for(const key of ['GOTENBERG_URL','OFFICE_ACCESS_KEY']){if(previous[key]===undefined)delete process.env[key];else process.env[key]=previous[key];}}
});
