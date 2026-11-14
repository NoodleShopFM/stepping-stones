#!/usr/bin/env node
const {test}=require("node:test");
const assert=require("node:assert/strict");
const {tail,formatPercent,binomialTail}=require("../src/reward-probabilities.js");
const fs=require("node:fs/promises");
const path=require("node:path");
test("game-style three significant figure percentages",()=>{
 assert.equal(formatPercent(1),"100%");
 assert.equal(formatPercent(.85546),"85.5%");
 assert.equal(formatPercent(.14503),"14.5%");
 assert.equal(formatPercent(.010678),"1.07%");
 assert.equal(formatPercent(1/256),"0.391%");
 assert.equal(formatPercent(.00012345),"0.0123%");
});
test("skin probabilities match Bernoulli and binomial reference",()=>{
 assert.ok(Math.abs(binomialTail(1,1,1/256)-1/256)<1e-12);
 assert.ok(Math.abs(binomialTail(40,1,1/256)-(1-(255/256)**40))<1e-11);
 assert.equal(binomialTail(40,0,1/256),1);
 assert.equal(binomialTail(40,41,1/256),0);
});
test("offline reward lookup returns exact single-token probabilities",async()=>{
 const originalFetch=global.fetch;
 global.fetch=async url=>{
  const bytes=await fs.readFile(path.join(__dirname,"..",url));
  return {ok:true,json:async()=>JSON.parse(bytes.toString()),arrayBuffer:async()=>bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength)};
 };
 try{
  const tests=[
   ["hammers",1,224,1/128],
   ["coins",1,5100,1/128],
   ["hammers",1,74,1/32],
   ["coins",1,3100,1/32],
   ["hammers",1,0,1],
   ["coins",1,0,1]
  ];
  for(const [metric,n,value,expected] of tests){
   const got=await tail(metric,n,value);
   assert.ok(Math.abs(got.probability-expected)<1e-7,`${metric} ${value}: ${got.probability} != ${expected}`);
   assert.equal(got.approximate,false);
  }
  const t=await tail("hammers",40,0);
  assert.equal(t.probability,1);
  const rare=await tail("hammers",40,8960);
  assert.ok(rare.probability>=0&&rare.probability<=1);
 }finally{global.fetch=originalFetch;}
});
