#!/usr/bin/env node
const {test}=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const html=fs.readFileSync("index.html","utf8");
const app=fs.readFileSync("src/app.js","utf8");
test("all six supplied game icon assets are referenced and available",()=>{
 for(const name of ["stepping_stones","hammer_icon","coin","helmet_100","set5_cat_helmet","token"]){
   assert.match(html,new RegExp("assets/icons/"+name+"\\.webp"));
   assert.ok(fs.statSync(path.join("assets","icons",name+".webp")).size>0);
 }
});
test("step chart is player-facing without technical distribution labels",()=>{
 assert.match(html,/Successful Steps<\/h2>/);
 assert.match(html,/>Expected steps<\/span>/);
 assert.match(html,/Play the game to begin tracking/);
 assert.doesNotMatch(html,/id="luck-method"|Total Successful Steps|Each attempt costs one token/);
 assert.doesNotMatch(app,/\$\("#luck-method"\)/);
});
test("reward names are updated",()=>{
 assert.match(html,/>\+1% Skins<\/span>/);
 assert.match(html,/>Set skins<\/span>/);
});
