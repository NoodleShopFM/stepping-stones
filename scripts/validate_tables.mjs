#!/usr/bin/env node
/** Validate static tables. Run: node scripts/validate_tables.mjs
 * Zero dependencies; uses a separate recurrence with exact integer enumeration
 * for n=1..3, plus double-precision DP spot checks and full structural checks.
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
const data = (file) => join(ROOT, 'data', file);
const p = Array.from({length: 9}, (_, k) => k < 8 ? 2**(-k-1) : 1/256);
const h = [0,2,6,14,34,74,74,224,224];
const coins = [0,200,700,1400,2100,3100,3100,5100,5100];
const moments = a => {
  const mean = a.reduce((v,x,k) => v+x*p[k],0);
  return [mean, a.reduce((v,x,k) => v+(x-mean)**2*p[k],0)];
};
const near=(a,b,tol=1e-9)=>assert.ok(Math.abs(a-b)<=tol, `${a} != ${b} (tol ${tol})`);
near(p.reduce((a,b)=>a+b,0),1);
for (const [name,a,mean,variance] of [
 ['steps',[0,1,2,3,4,5,6,7,8],255/256,126719/65536],
 ['hammers',h,427/64,2169671/4096],
 ['coins',coins,3225/8,38239375/64]]) {
 const [m,v]=moments(a);near(m,mean);near(v,variance);
 console.log('PASS',name,'mean=',m,'variance=',v);
}
near(p.slice(6).reduce((a,b)=>a+b,0),1/64);
near(p[8],1/256);
assert.equal(h[8],224);assert.equal(coins[8],5100);

const index=JSON.parse(readFileSync(data('index.json'),'utf8'));
assert.equal(index.format,'stepping-stones-steps-v1');
assert.equal(index.max_attempts,630);
assert.equal(index.records.length,631);
assert.equal(index.stride_bytes,12);
const chunks=index.chunks.map(c=>readFileSync(data(c.file)));
chunks.forEach((buf,i)=>assert.equal(buf.length,index.chunks[i].bytes));
function read(n) {
 const r=index.records[n]; assert.ok(r);
 const buf=chunks[r.chunk], arr=[];
 assert.ok(r.offset>=0 && r.offset+r.count*12<=buf.length);
 for(let j=0;j<r.count;j++) {
   const off=r.offset+j*12;
   arr.push([buf.readFloatLE(off),buf.readFloatLE(off+4),buf.readFloatLE(off+8)]);
 }
 return {r,arr};
}
// Independent exact integer convolution on denominators 256^n for tiny n.
let counts=[1n], den=1n;
const weights=[128n,64n,32n,16n,8n,4n,2n,1n,1n];
for(let n=1;n<=3;n++) {
 const next=Array(counts.length+8).fill(0n);
 counts.forEach((v,j)=>weights.forEach((w,k)=>next[j+k]+=v*w));
 counts=next;den*=256n;
 const {r,arr}=read(n);
 assert.equal(r.min,0);assert.equal(r.count,8*n+1);
 let cumulative=0n;
 for(let k=0;k<counts.length;k++) {
   cumulative+=counts[k];
   const c=Number(cumulative)/Number(den);
   const pmf=Number(counts[k])/Number(den);
   const sf=1-Number(cumulative-counts[k])/Number(den);
   near(arr[k][0],pmf,5e-8);near(arr[k][1],c,5e-8);near(arr[k][2],sf,5e-8);
 }
}
console.log('PASS independent exact integer checks (n=1,2,3)');

const checkpoints=new Set([1,8,42,150,300,450,630]);
let dist=new Float64Array([1]), maxError=0, maxIdentity=0;
for(let n=1;n<=630;n++) {
 const next=new Float64Array(dist.length+8);
 for(let k=0;k<dist.length;k++)for(let j=0;j<9;j++)next[k+j]+=dist[k]*p[j];
 dist=next;
 const {r,arr}=read(n);
 assert.ok(r.min>=0 && r.min+r.count<=8*n+1);
 let prevCDF=-1,prevSF=2,sum=0;
 for(let i=0;i<arr.length;i++){
  const [pmf,cdf,sf]=arr[i];
  assert.ok(pmf>=0 && pmf<=1 && cdf>=prevCDF-5e-8 && sf<=prevSF+5e-8);
  maxIdentity=Math.max(maxIdentity,Math.abs(cdf+sf-pmf-1));
  prevCDF=cdf;prevSF=sf;sum+=pmf;
 }
 assert.ok(Math.abs(sum-1)<2e-6,`PMF mass: n=${n}`);
 if(checkpoints.has(n)){
   const cdf=new Float64Array(dist.length),sf=new Float64Array(dist.length);
   let v=0;
   for(let i=0;i<dist.length;i++){v+=dist[i];cdf[i]=v}
   near(v,1,2e-12);v=0;
   for(let i=dist.length-1;i>=0;i--){v+=dist[i];sf[i]=v}
   for(let j=0;j<r.count;j++){
     const i=r.min+j;
     maxError=Math.max(maxError,Math.abs(arr[j][0]-dist[i]),Math.abs(arr[j][1]-cdf[i]),Math.abs(arr[j][2]-sf[i]));
   }
   const omittedLeft=r.min?cdf[r.min-1]:0;
   const omittedRight=r.min+r.count<dist.length?sf[r.min+r.count]:0;
   assert.ok(omittedLeft<5.01e-13 && omittedRight<5.01e-13);
 }
}
assert.ok(maxIdentity<1.2e-7,`CDF/SF identity: ${maxIdentity}`);
assert.ok(maxError<3e-8,`Float32 table error: ${maxError}`);
console.log('PASS all 630 records, bounds, monotonicity, mass, and CDF identities');
console.log('PASS independent Float64 comparisons at n=1,8,42,150,300,450,630');
console.log('Maximum checked absolute Float32 error:',maxError);
console.log('Validation complete.');
