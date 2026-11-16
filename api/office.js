import Busboy from 'busboy';
import {timingSafeEqual} from 'node:crypto';
export const config={api:{bodyParser:false}};
const MAX=4*1024*1024;
export function authorized(supplied,expected){
 if(!expected||typeof supplied!=='string')return false;
 const a=Buffer.from(supplied),b=Buffer.from(expected);
 return a.length===b.length&&timingSafeEqual(a,b);
}
export function readUpload(req){return new Promise((resolve,reject)=>{
 let parser;try{parser=Busboy({headers:req.headers,limits:{files:1,fileSize:MAX,fields:0,parts:2}});}catch{return reject(new Error('Permintaan multipart tidak valid.'));}
 let upload,failed=false;
 const fail=message=>{failed=true;reject(new Error(message));};
 parser.on('file',(field,stream,info)=>{
  if(field!=='file'||!/^.+\.(docx?|pptx?|xlsx?|odt)$/i.test(info.filename)){stream.resume();fail('Format Office tidak didukung.');return;}
  const ext=info.filename.split('.').pop().toLowerCase(),chunks=[];
  stream.on('data',b=>chunks.push(b));stream.on('limit',()=>fail('File maksimal 4 MB.'));
  stream.on('end',()=>{upload={name:`document.${ext}`,buffer:Buffer.concat(chunks)};});
 });
 parser.on('fieldsLimit',()=>fail('Hanya file diizinkan.'));parser.on('filesLimit',()=>fail('Pilih satu file.'));parser.on('partsLimit',()=>fail('Hanya satu file diizinkan.'));parser.on('error',()=>fail('Gagal membaca file.'));
 req.on('aborted',()=>fail('Unggahan terputus.'));req.on('error',()=>fail('Unggahan gagal.'));
 parser.on('close',()=>{if(!failed){if(!upload?.buffer.length)fail('File kosong atau tidak ditemukan.');else resolve(upload);}});req.pipe(parser);
});}
export default async function handler(req,res){
 res.setHeader('Cache-Control','no-store');
 if(req.method!=='POST'){res.setHeader('Allow','POST');return res.status(405).json({error:'Gunakan POST.'});}
 const {GOTENBERG_URL,GOTENBERG_USERNAME,GOTENBERG_PASSWORD,OFFICE_ACCESS_KEY}=process.env;
 if(!GOTENBERG_URL||!OFFICE_ACCESS_KEY)return res.status(503).json({error:'Server Office belum dikonfigurasi. Ikuti bagian Gotenberg di README.'});
 if(!authorized(req.headers['x-office-key'],OFFICE_ACCESS_KEY))return res.status(401).json({error:'Kunci akses Office salah.'});
 if(Number(req.headers['content-length'])>MAX+65536)return res.status(413).json({error:'File maksimal 4 MB.'});
 try{
  const upstream=new URL(GOTENBERG_URL);if(upstream.protocol!=='https:')return res.status(503).json({error:'GOTENBERG_URL harus menggunakan HTTPS.'});
  const file=await readUpload(req);const form=new FormData();form.append('files',new Blob([file.buffer]),file.name);
  const headers={};if(GOTENBERG_USERNAME&&GOTENBERG_PASSWORD)headers.Authorization=`Basic ${Buffer.from(`${GOTENBERG_USERNAME}:${GOTENBERG_PASSWORD}`).toString('base64')}`;
  const converted=await fetch(new URL('/forms/libreoffice/convert',upstream),{method:'POST',headers,body:form,redirect:'error',signal:AbortSignal.timeout(45000)});
  if(!converted.ok)return res.status(502).json({error:'Server Office gagal mengonversi dokumen. Periksa file dan server.'});
  const result=await converted.arrayBuffer();if(!Buffer.from(result).subarray(0,5).equals(Buffer.from('%PDF-')))return res.status(502).json({error:'Server tidak mengembalikan PDF yang valid.'});
  res.setHeader('Content-Type','application/pdf');res.setHeader('Content-Disposition','attachment; filename="converted.pdf"');return res.status(200).send(Buffer.from(result));
 }catch(e){const invalid=/multipart|maksimal|Format Office|satu file|kosong|diizinkan/.test(e.message);return res.status(invalid?400:502).json({error:invalid?e.message:'Layanan Office tidak merespons. Periksa koneksi dan konfigurasi server.'});}
}
