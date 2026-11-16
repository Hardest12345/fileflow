// Generates the corresponding source archive served alongside the application.
import {readdirSync,readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {join} from 'node:path';
import {zipSync} from 'fflate';
const excluded=new Set(['node_modules','dist','.git','.vercel']);const entries={};
function walk(dir='.') {for(const entry of readdirSync(dir,{withFileTypes:true})){if(excluded.has(entry.name)||entry.name.startsWith('.env')&&entry.name!=='.env.example')continue;const path=join(dir,entry.name);if(entry.isDirectory())walk(path);else if(entry.isFile()&&!path.endsWith('.zip'))entries[`fileflow/${path}`]=new Uint8Array(readFileSync(path));}}
walk();mkdirSync('public',{recursive:true});writeFileSync('public/fileflow-source.zip',zipSync(entries,{level:9}));console.log('Source archive ready.');
