/** Clean disconnected AI-mask noise without selecting subjects by colour.
 * Connectivity runs on a bounded mask grid, never the full photo resolution.
 * Multi-subject mode preserves components >= max(3 pixels, 0.05% of image).
 * Main-subject mode keeps the largest component plus its soft alpha fringe.
 */
export function cleanMask(alpha,width,height,{mode='speckles',cutoff=12}={}){
 if(!Number.isInteger(width)||!Number.isInteger(height)||width<1||height<1||width*height!==alpha.length)throw new Error('Invalid mask dimensions');
 if(!['off','speckles','main'].includes(mode))throw new Error('Invalid cleanup mode');
 const output=new Uint8ClampedArray(alpha);
 if(mode==='off')return output;
 const n=width*height,labels=new Int32Array(n),queue=new Int32Array(n),counts=[0];let label=0;
 const minimumAlpha=Math.max(1,Math.min(254,Number(cutoff)||12));
 for(let start=0;start<n;start++){
  if(labels[start]||alpha[start]<=minimumAlpha)continue;
  label++;let head=0,tail=0;queue[tail++]=start;labels[start]=label;
  while(head<tail){const i=queue[head++],x=i%width,y=Math.floor(i/width);
   for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++){
    const nx=x+dx,ny=y+dy;if(nx<0||nx>=width||ny<0||ny>=height||(dx===0&&dy===0))continue;
    const j=ny*width+nx;if(labels[j]||alpha[j]<=minimumAlpha)continue;labels[j]=label;queue[tail++]=j;
   }
  }
  counts[label]=tail;
 }
 if(!label) return output; // Do not erase an uncertain mask automatically.
 let largest=1;for(let i=2;i<counts.length;i++)if(counts[i]>counts[largest])largest=i;
 const minSize=Math.max(3,Math.round(n*.0005)),keep=new Uint8Array(label+1);
 for(let i=1;i<=label;i++)if(mode==='main'?i===largest:counts[i]>=minSize||i===largest)keep[i]=1;
 const support=new Uint8Array(n);
 for(let i=0;i<n;i++)if(keep[labels[i]])support[i]=1;
 // Retain a 2px band around accepted components to protect fine hair/antialiasing.
 const dilated=new Uint8Array(support);
 for(let y=0;y<height;y++)for(let x=0;x<width;x++)if(support[y*width+x]){
  for(let dy=-2;dy<=2;dy++)for(let dx=-2;dx<=2;dx++){const nx=x+dx,ny=y+dy;if(nx>=0&&nx<width&&ny>=0&&ny<height)dilated[ny*width+nx]=1;}
 }
 for(let i=0;i<n;i++)if(!dilated[i])output[i]=0;
 return output;
}

// Modify alpha only; preserve original RGB and pre-existing transparency.
export function applyAlphaMask(rgba,mask,allowance){
 if(rgba.length%4||rgba.length!==mask.length||rgba.length!==allowance.length)throw new Error('Mask sizes do not match image');
 for(let i=3;i<rgba.length;i+=4)rgba[i]=Math.round(rgba[i]*mask[i]/255*allowance[i]/255);
 return rgba;
}
