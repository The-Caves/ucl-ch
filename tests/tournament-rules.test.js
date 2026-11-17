import test from "node:test";
import assert from "node:assert/strict";
import {makeBracket,makeDoubleElimination,recordResult} from "../src/engine.js";
import {scheduleCandidates} from "../src/scheduling-policy.js";
import {scorecard} from "../src/scorecard.js";
import {makeRounders,placeBracketSeeds} from "../src/tournament-formats.js";
test("non-power-of-two single/double brackets resolve all byes without fabricated matches",()=>{
 for(const size of [3,5,6,7,9,11,17,24,33,65,127]){
  for(const elim of ["single","double"]){
   const ids=placeBracketSeeds(Array.from({length:size},(_,i)=>i+1));
   let matches=elim==="single"?makeBracket(ids,"t"):makeDoubleElimination(ids,"t");
   assert.ok(matches.some(m=>m.status==="Bye"),"missing bye size "+size);
   let recorded=0;
   for(;recorded<300;recorded++){
    const ready=scheduleCandidates(matches,new Set(["t"])).ready;
    if(!ready.length)break;
    matches=recordResult(matches,ready[0].id,21,10);
   }
   assert.ok(recorded>=size-1,"must play enough rounds");
   assert.equal(recorded,elim==="single"?size-1:2*size-2,"match count n="+size+" type="+elim);
   assert.equal(matches.filter(m=>m.status==="Scheduled"&&m.a!=null&&m.b!=null).length,0);
   assert.ok(matches.some(m=>m.status==="Final"&&(elim==="single"?m.side==="W"&&m.round===Math.log2(ids.length):m.side==="F"&&m.round===1)));
  }
 }
});
const row=(aIn,aOn,bIn,bOn)=>({matchId:"m",a:1,b:2,aIn,aOn,bIn,bOn});
test("a round-limited match finishes with the leader at cap even below 21",()=>{
 const results=scorecard([row(1,0,0,0),row(1,0,1,0),row(0,1,0,0)],1,2,{maxRounds:3});
 assert.equal(results.scoreA,4);assert.equal(results.scoreB,0);
 assert.equal(results.finished,true);
 assert.equal(results.history.length,3);
});
test("tied round limit requires decisive sudden-death round rather than a tied final",()=>{
 const tied=[row(1,0,0,0),row(0,0,1,0)];
 const a=scorecard(tied,1,2,{maxRounds:2});
 assert.equal(a.finished,false);assert.equal(a.needsTiebreak,true);assert.equal(a.scoreA,a.scoreB);
 const b=scorecard([...tied,row(1,0,0,0)],1,2,{maxRounds:2});
 assert.equal(b.finished,true);assert.equal(b.overtime,true);assert.notEqual(b.scoreA,b.scoreB);
});
test("swap rounder 2 cannot be scheduled while a game in round 1 is unfinished",()=>{
 const matches=makeRounders([1,2,3,4,5,6,7,8],"swap-singles",2,"s",4);
 const a=scheduleCandidates(matches,new Set(["s"]));
 assert.equal(a.ready.every(m=>m.round===1),true);
 assert.ok(a.held.some(m=>m.round===2));
 let changed=matches;
 for(const game of a.ready)changed=recordResult(changed,game.id,21,10);
 const b=scheduleCandidates(changed,new Set(["s"]));
 assert.ok(b.ready.some(m=>m.round===2));
});
