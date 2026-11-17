import test from "node:test";
import assert from "node:assert/strict";
import {recordResult} from "../src/engine.js";
import {createConfiguredTournament,addSignup,launchTournament,rounderStandings,advanceSwapToBracket,markDoorPaid,setEventDoorFee} from "../src/tournament-formats.js";
import {playerStats} from "../src/player-statistics.js";
function state(){return {director:true,eventGroups:[{id:"parent",date:"2026-11-17"}],events:[],matches:[],scorecards:[],seedMetrics:{}}}
const players=Array.from({length:20},(_,i)=>({id:i+1,name:"Player "+(i+1)}));
function create(s,format){const t=createConfiguredTournament(s,{parentId:"parent",name:"Test Swap",format,rounders:2,elimination:"double",seeding:"rounder-ppr",partnerMode:"top-bottom"});for(let i=1;i<=8;i++)addSignup(s,t.id,i,players);return t}
function complete(s,t){
 for(const m of [...s.matches.filter(x=>x.eventId===t.id&&x.rounder)]){
  const rows=Array.from({length:7},(_,i)=>({
   matchId:m.id,a:m.a,b:m.b,aIn:1,aOn:0,bIn:0,bOn:0,
   ...(Array.isArray(m.a)?{throwerA:m.a[i%2],throwerB:m.b[i%2]}:{})
  }));
  s.scorecards.push(...rows);
  s.matches=recordResult(s.matches,m.id,21,0);
 }
}
test("doubles swap rounders convert to PPR-ranked playoff pairs, retaining scorecards",()=>{
 const s=state(),t=create(s,"swap-doubles");
 launchTournament(s,t.id);
 const n=s.matches.length;complete(s,t);
 assert.equal(s.matches.filter(m=>m.rounder).every(m=>m.status==="Final"),true);
 const ranks=rounderStandings(s,t.id);assert.equal(ranks.length,8);
 assert.equal(ranks.every(x=>x.ppr!=null),true);
 const converted=advanceSwapToBracket(s,t.id);
 assert.equal(converted.stage,"bracket");
 assert.equal(s.matches.filter(x=>x.rounder).length,n);
 assert.ok(s.matches.some(m=>m.eventId===t.id&&!m.rounder));
 assert.equal(new Set(converted.teams.flat()).size,8);
 assert.equal(t.swapStandings.length,8);
 assert.ok(playerStats(s.matches,s.scorecards,1).rounds>0);
});
test("singles swap random opponent rounds preserve PPR for all entrants and seed playoff",()=>{
 const s=state(),t=create(s,"swap-singles");launchTournament(s,t.id);
 complete(s,t);
 const result=advanceSwapToBracket(s,t.id);
 assert.equal(result.stage,"bracket");
 assert.equal(result.teams.length,8);
 assert.ok(s.matches.some(m=>!m.rounder&&m.eventId===t.id));
});
test("door admission per day is independent from event-wide entry",()=>{
 const s=state();setEventDoorFee(s,"parent",{amount:10,scope:"day"});
 markDoorPaid(s,"parent",1,{date:"2026-11-17"});
 assert.equal(s.eventGroups[0].doorPayments["1:2026-11-17"],true);
 assert.equal(Boolean(s.eventGroups[0].doorPayments["1:2026-11-18"]),false);
 markDoorPaid(s,"parent",1,{date:"2026-11-18"});
 assert.equal(s.eventGroups[0].doorPayments["1:2026-11-18"],true);
});
