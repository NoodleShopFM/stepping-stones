#!/usr/bin/env node
const {test}=require("node:test");
const assert=require("node:assert/strict");
const {MEANS,percentOfExpected,formatPercent}=require("../src/reward-efficiency.js");
test("theoretical reward means agree with exact game payout distribution",()=>{
 const {PAYOUT}=require("../src/game-core.js");
 const weights=[128,64,32,16,8,4,2,1,1];
 for(const metric of Object.keys(MEANS)){
   const expected=PAYOUT.reduce((sum,reward,i)=>sum+weights[i]/256*reward[metric],0);
   assert.equal(MEANS[metric],expected,metric);
 }
});
test("efficiency has a meaningful neutral rate and handles zero attempts",()=>{
 assert.equal(percentOfExpected("set",0,0),null);
 assert.equal(formatPercent(percentOfExpected("set",0,0)),"—");
 assert.equal(formatPercent(percentOfExpected("set",1,1)),"25,600%");
 assert.equal(formatPercent(percentOfExpected("set",100,1)),"256%");
 assert.equal(formatPercent(percentOfExpected("basic",64,1)),"100%");
 assert.equal(formatPercent(percentOfExpected("hammers",64,427)),"100%");
 assert.equal(formatPercent(percentOfExpected("coins",8,3225)),"100%");
 assert.equal(formatPercent(percentOfExpected("coins",8,0)),"0%");
});
test("three significant figures without unnecessary zeros",()=>{
 assert.equal(formatPercent(120),"120%");
 assert.equal(formatPercent(86.832),"86.8%");
 assert.equal(formatPercent(1.23456),"1.23%");
 assert.equal(formatPercent(0.00123456),"0.00123%");
});
