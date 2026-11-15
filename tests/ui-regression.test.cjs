#!/usr/bin/env node
const {test}=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs");
const html=fs.readFileSync("index.html","utf8");
const app=fs.readFileSync("src/app.js","utf8");
test("every reward efficiency output exists and has a renderer",()=>{
 for(const metric of ["hammers","coins","basic","set"]){
  assert.match(html,new RegExp('id="'+metric+'-efficiency"'));
 }
 assert.match(app,/function renderRewardEfficiency\(\)/);
 assert.match(app,/renderRewardEfficiency\(\);/);
 assert.match(app,/maximumSignificantDigits:3/);
 assert.doesNotMatch(html,/src\/reward-efficiency\.js/);
});
test("tile status is communicated without footprints, X marks, or highlights",()=>{
 assert.doesNotMatch(app,/👣|✕|classList\.add\("current"\)/);
 assert.doesNotMatch(html,/\.stone\.current\{/);
 assert.match(app,/button\.textContent="✓"/);
});
test("no active-game instructions or bridge replay in auto-run",()=>{
 assert.doesNotMatch(app,/Choose pair|highlighted stone|showBoard\(pseudoAttempt/);
 assert.match(app,/elements\.message\.hidden=quiet/);
 assert.match(app,/await sleep\(40\)/);
});
