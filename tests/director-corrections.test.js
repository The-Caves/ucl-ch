import test from "node:test";
import assert from "node:assert/strict";
import {makeDoubleElimination,recordResult} from "../src/engine.js";
import {directorCorrectMatch,directorAuditFor} from "../src/director-corrections.js";
import {scorecard} from "../src/scorecard.js";
import {playerStats} from "../src/player-statistics.js";
function singles(n=4){return {director:true,events:[{id:"t",name:"Singles",format:"Singles",ids:Array.from({length:n},(_,i)=>i+1)}],matches:makeDoubleElimination(Array.from({length:n},(_,i)=>i+1),"t"),scorecards:[],boardStations:[],directorAudit:[]}}
const admin={actor:"Director Demo",reason:"Correcting event records"};
function correct(state,type,matchId,additional={}){return directorCorrectMatch(state,{...admin,type,matchId,...additional})}
const m=s=>s.matches.find(x=>x.id==="t-W1-0");
test("manual scores, forfeits and wrong-winner corrections repair unplayed downstream bracket paths",()=>{
 const state=singles(),id=m(state).id;
 const first=correct(state,"result",id,{scoreA:21,scoreB:13});
 assert.equal(m(state).status,"Final");assert.equal(m(state).resultType,"Director entry");
 assert.equal(state.matches.find(x=>x.id==="t-W2-0").a,1);
 assert.equal(first.audit.changes.some(x=>x.id==="t-W2-0"),true);
 correct(state,"forfeit",id,{winnerSide:"B"});
 assert.equal(m(state).scoreA,0);assert.equal(m(state).scoreB,21);
 assert.equal(state.matches.find(x=>x.id==="t-W2-0").a,2);
 assert.equal(state.matches.find(x=>x.id==="t-L1-0").a,1);
 assert.equal(state.directorAudit.length,2);
 assert.equal(directorAuditFor(state,id)[0].action,"forfeit");
});
test("corrections changing winner fail atomically when a downstream match is already active",()=>{
 const state=singles();correct(state,"result",m(state).id,{scoreA:21,scoreB:5});
 correct(state,"result","t-W1-1",{scoreA:21,scoreB:5});
 state.matches.find(x=>x.id==="t-W2-0").status="In Progress";
 const before=JSON.stringify(state);
 assert.throws(()=>correct(state,"result","t-W1-0",{scoreA:3,scoreB:21}),/Downstream match/);
 assert.equal(JSON.stringify(state),before);
 assert.equal(state.directorAudit.length,2);
});
test("forfeits cannot be recorded without a selected winner or a real director reason",()=>{
 const state=singles();let id=m(state).id;
 assert.throws(()=>directorCorrectMatch(state,{type:"forfeit",matchId:id,actor:"",reason:"Wrong player",winnerSide:"A"}),/Director identity/);
 assert.throws(()=>directorCorrectMatch(state,{type:"forfeit",matchId:id,actor:"Director",reason:"bad",winnerSide:"A"}),/reason/);
 assert.throws(()=>correct(state,"forfeit",id,{winnerSide:"C"}),/forfeit winner/);
 state.director=false;
 assert.throws(()=>correct(state,"forfeit",id,{winnerSide:"A"}),/Enable demo director/);
 assert.equal(state.directorAudit.length,0);
});
test("director changes doubles round bags and thrower attribution without altering the other player stats",()=>{
 const state={director:true,events:[{id:"d",ids:[[1,3],[2,4],[5,6],[7,8]],format:"Doubles"}],matches:makeDoubleElimination([[1,3],[2,4],[5,6],[7,8]],"d"),scorecards:[],boardStations:[],directorAudit:[]};
 const id="d-W1-0",match=state.matches.find(x=>x.id===id);match.status="In Progress";
 state.scorecards.push({id:"r1",matchId:id,a:match.a,b:match.b,aIn:2,aOn:1,bIn:1,bOn:0,throwerA:3,throwerB:2});
 const x=correct(state,"round",id,{roundNumber:1,throwerA:1,throwerB:4,aIn:3,aOn:1});
 assert.equal(x.rounds,1);
 assert.equal(state.scorecards[0].throwerA,1);
 assert.equal(playerStats(state.matches,state.scorecards,1).ppr,10);
 assert.equal(playerStats(state.matches,state.scorecards,3).rounds,0);
 assert.equal(playerStats(state.matches,state.scorecards,4).ppr,3);
 assert.equal(state.directorAudit.length,1);
 assert.throws(()=>correct(state,"round",id,{roundNumber:1,aIn:4,aOn:1}),/0–4 bags/);
});
test("an edited round cannot silently invalidate a finished result; reopening must be explicit",()=>{
 const state=singles(),id=m(state).id,match=m(state);
 match.status="In Progress";
 for(let i=0;i<7;i++)state.scorecards.push({matchId:id,a:match.a,b:match.b,aIn:1,aOn:0,bIn:0,bOn:0});
 state.matches=recordResult(state.matches,id,21,0);
 assert.throws(()=>correct(state,"round",id,{roundNumber:7,aIn:0}),/Reopen the match/);
 const audit=correct(state,"reopen",id);
 assert.equal(m(state).status,"Scheduled");
 assert.equal(state.scorecards.filter(r=>r.matchId===id).length,0);
 assert.equal(audit.audit.action,"reopen");
});
test("matchup correction validates registered opening-round players and duplicates",()=>{
 const state=singles(8);
 const id=m(state).id;
 assert.throws(()=>correct(state,"matchup",id,{teamA:1,teamB:3}),/already assigned/);
 correct(state,"matchup",id,{teamA:2,teamB:1});
 assert.equal(m(state).a,2);
 assert.equal(m(state).b,1);
 assert.throws(()=>correct(state,"matchup",id,{teamA:2,teamB:2}),/both sides/);
});
test("director can atomically swap two opening-round match competitors and preserve audit",()=>{
 const state=singles(8);
 const x=correct(state,"swap","t-W1-0",{otherMatchId:"t-W1-1",sideA:"B",sideB:"A"});
 assert.equal(state.matches.find(m=>m.id==="t-W1-0").b,3);
 assert.equal(state.matches.find(m=>m.id==="t-W1-1").a,2);
 assert.equal(x.audit.changes.some(c=>c.id==="t-W1-1"),true);
 assert.throws(()=>correct(state,"swap","t-W1-0",{otherMatchId:"t-W2-0",sideA:"A",sideB:"B"}),/opening-round/);
});
test("correcting winner after dependent bracket is played requires supervised rebuild",()=>{
 const state=singles();
 correct(state,"result","t-W1-0",{scoreA:21,scoreB:7});
 correct(state,"result","t-W1-1",{scoreA:21,scoreB:12});
 correct(state,"result","t-W2-0",{scoreA:21,scoreB:13});
 const before=JSON.stringify(state);
 assert.throws(()=>correct(state,"forfeit","t-W1-0",{winnerSide:"B"}),/Downstream match/);
 assert.equal(JSON.stringify(state),before);
});
