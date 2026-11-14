#!/usr/bin/env node
/** Regenerate static reward survival tables. No dependencies.
 * Run: node scripts/generate_reward_tables.mjs
 * Output: data/rewards/{hammers,coins}_*.bin and *_index.json
 */
import {mkdirSync,writeFileSync} from "node:fs";
import {dirname,join} from "node:path";
import {fileURLToPath} from "node:url";
const root=dirname(dirname(fileURLToPath(import.meta.url)));
const dir=join(root,"data","rewards");
mkdirSync(dir,{recursive:true});
const ends=[8,42,90,150,210,270,330,390,450,510,570,630];
for(const spec of [
 {name:"hammers",unit:2,rewards:[0,1,3,7,17,37,112]},
 {name:"coins",unit:100,rewards:[0,2,7,14,21,31,51]}
]){
 const weights=[128,64,32,16,8,6,2];
 let previous=new Float64Array([1]),records=[null],chunks=[],parts=[],offset=0,first=1,chunkIndex=0;
 for(let n=1;n<=630;n++){
  const next=new Float64Array(previous.length+spec.rewards[6]);
  for(let i=0;i<previous.length;i++){
   const value=previous[i];if(!value)continue;
   for(let k=0;k<7;k++)next[i+spec.rewards[k]]+=value*weights[k]/256;
  }
  previous=next;
  const sf=new Float64Array(next.length);let sum=0;
  for(let i=next.length-1;i>=0;i--){sum+=next[i];sf[i]=sum}
  let low=0,high=next.length-1;
  while(low<high&&1-sf[low]+next[low]<5e-13)low++;
  while(high>low&&sf[high]<5e-13)high--;
  const count=high-low+1,buf=Buffer.allocUnsafe(count*4);
  for(let i=low;i<=high;i++)buf.writeFloatLE(sf[i],(i-low)*4);
  parts.push(buf);records.push({chunk:chunkIndex,offset,min:low,count});offset+=buf.length;
  if(ends.includes(n)){
   const file=`${spec.name}_${String(first).padStart(3,"0")}_${String(n).padStart(3,"0")}.bin`;
   writeFileSync(join(dir,file),Buffer.concat(parts));
   chunks.push({file,bytes:offset,first,last:n});
   parts=[];offset=0;first=n+1;chunkIndex++;
  }
 }
 const index={format:"reward-survival-v1",metric:spec.name,unit:spec.unit,dtype:"float32",max_attempts:630,tail_trim_each_side:5e-13,chunks,records};
 writeFileSync(join(dir,`${spec.name}_index.json`),JSON.stringify(index)+"\n");
 console.log(spec.name,chunks.reduce((s,c)=>s+c.bytes,0),"bytes");
}
