export function parsePages(value,count){
 if(!value.trim()) return Array.from({length:count},(_,i)=>i);
 const out=[];
 for(const piece of value.split(',')){
  const m=piece.trim().match(/^(\d+)(?:\s*-\s*(\d+))?$/);
  if(!m)throw new Error('Format halaman tidak valid. Contoh: 1-3, 5, 7.');
  const a=Number(m[1]),b=Number(m[2]||a);
  if(a<1||b<a||b>count)throw new Error(`Rentang halaman harus antara 1 dan ${count}.`);
  for(let i=a;i<=b;i++)if(!out.includes(i-1))out.push(i-1);
 }
 return out;
}
export const baseName=name=>name.replace(/\.[^.]+$/,'');
export const size=n=>n<1024?`${n} B`:n<1048576?`${(n/1024).toFixed(1)} KB`:`${(n/1048576).toFixed(1)} MB`;
export function validateFiles(files,tool){
 if(!files.length)throw new Error('Pilih file terlebih dahulu.');
 if(files.length>30)throw new Error('Maksimal 30 file per proses.');
 if(!tool.multi&&files.length>1)throw new Error('Pilih satu file untuk alat ini.');
 if(files.reduce((n,f)=>n+f.size,0)>100*1024*1024)throw new Error('Total file maksimal 100 MB.');
 for(const f of files){
  if(f.size===0)throw new Error(`${f.name} kosong.`);
  if(tool.server&&f.size>4*1024*1024)throw new Error('Konversi Office maksimal 4 MB per file di Vercel.');
  if(tool.accept!=='*'&&!tool.accept.split(',').some(ext=>f.name.toLowerCase().endsWith(ext)))throw new Error(`Format ${f.name} tidak didukung alat ini.`);
 }
}
