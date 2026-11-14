#!/usr/bin/env node
const {test}=require("node:test");
const assert=require("node:assert/strict");
const {calculate,approx,cdfApprox,luckLabel}=require("../src/luck.js");
test("exact lookup at one run reproduces geometric distribution",async()=>{
 const originalFetch=global.fetch;
 const fs=require("node:fs/promises");
 const path=require("node:path");
 global.fetch=async url=>{
   const buffer=await fs.readFile(path.join(__dirname,"..",url));
   return {ok:true,json:async()=>JSON.parse(buffer.toString()),arrayBuffer:async()=>buffer.buffer.slice(buffer.byteOffset,buffer.byteOffset+buffer.byteLength)};
 };
 try{
  const zero=await calculate(1,0);
  assert.ok(Math.abs(zero.pmf-.5)<1e-7);
  assert.ok(Math.abs(zero.mid-.25)<1e-7);
  assert.equal(zero.label,"Average luck");
  const eight=await calculate(1,8);
  assert.ok(Math.abs(eight.pmf-1/256)<1e-7);
  assert.ok(Math.abs(eight.mid-(1-1/512))<1e-7);
  assert.equal(eight.label,"Extremely lucky!");
  const large=await calculate(630,630);
  assert.ok(Math.abs(large.mean-630*255/256)<1e-9);
  assert.ok(large.values.length>50);
  assert.equal(large.approximate,false);
 }finally{global.fetch=originalFetch;}
});
test("large session uses cheap approximation without network",async()=>{
 const originalFetch=global.fetch;
 global.fetch=()=>{throw Error("Unexpected network fetch");};
 try{
  const r=await calculate(631,628);
  assert.equal(r.approximate,true);
  assert.ok(r.mid>0&&r.mid<1);
  assert.ok(r.values.length>50);
  assert.ok(cdfApprox(1000,1000)>cdfApprox(1000,999));
 }finally{global.fetch=originalFetch;}
});
test("luck categories use agreed percentile thresholds",()=>{
 assert.equal(luckLabel(.01),"Terrible luck");
 assert.equal(luckLabel(.10),"Unlucky");
 assert.equal(luckLabel(.5),"Average luck");
 assert.equal(luckLabel(.9),"Lucky!");
 assert.equal(luckLabel(.99),"Extremely lucky!");
 assert.ok(approx(1000,996).pmf>0);
});
