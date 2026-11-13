import test from "node:test";
import assert from "node:assert/strict";
import {seedTournamentHistory} from "../src/season-history.js";
import {playerStats,includesPlayer,sameTeam,roundSide,doublesRatings} from "../src/player-statistics.js";
import {scorecard} from "../src/scorecard.js";
test("ten completed singles and doubles tournaments provide 30+ player matches",()=>{
 const s=seedTournamentHistory();
 assert.equal(s.events.length,10);
 assert.equal(s.events.filter(e=>e.format==="Singles").length,6);
 assert.equal(s.events.filter(e=>e.format==="Doubles").length,4);
 const matches=s.matches.filter(m=>m.status==="Final");
 const player=playerStats(matches,s.scorecards,1);
 assert.ok(player.games>=30);
 assert.ok(player.wins>player.losses&&player.losses>0,"Good but not undefeated results");
 for(const e of s.events){
  const own=s.matches.filter(m=>m.eventId===e.id);
  assert.ok(own.some(m=>m.side==="F"&&m.status==="Final"),e.name);
  assert.equal(own.filter(m=>m.status==="Scheduled"&&m.a!=null&&m.b!=null).length,0);
 }
});
test("recorded bag rounds reconcile with simulated bracket scores",()=>{
 const s=seedTournamentHistory();
 for(const m of s.matches.filter(m=>m.status==="Final")){
  const rows=s.scorecards.filter(r=>r.matchId===m.id);
  assert.ok(rows.length>0);
  const summary=scorecard(rows,m.a,m.b);
  assert.equal(summary.scoreA,m.scoreA,m.id);
  assert.equal(summary.scoreB,m.scoreB,m.id);
  assert.ok(summary.finished);
 }
});
test("doubles stats credit only the designated thrower",()=>{
 const s=seedTournamentHistory(),doublesIds=new Set(s.events.filter(e=>e.format==="Doubles").map(e=>e.id));
 const games=s.matches.filter(m=>doublesIds.has(m.eventId));
 const ids=new Set(games.map(m=>m.id));
 const rows=s.scorecards.filter(r=>ids.has(r.matchId));
 const st=playerStats(games,rows,1);
 assert.ok(st.games>0);
 assert.ok(st.rounds>0);
 assert.ok(st.rounds<rows.filter(r=>includesPlayer(r.a,1)||includesPlayer(r.b,1)).length);
 assert.ok(st.ppr>5);
 assert.equal(st.wins+st.losses,st.games);
 assert.equal(roundSide({a:[1,3],b:[2,4],throwerA:3,throwerB:2},1),null);
 assert.equal(roundSide({a:[1,3],b:[2,4],throwerA:1,throwerB:4},1),"a");
 assert.ok(sameTeam([1,3],[1,3]));
});
test("fixture generation is deterministic and does not rely on randomness at runtime",()=>{
 const a=seedTournamentHistory(),b=seedTournamentHistory();
 assert.deepEqual(a,b);
});

test("doubles rating is built from completed teams and distinguishes singles from doubles",()=>{
 const season=seedTournamentHistory();
 const doubles=new Set(season.events.filter(e=>e.format==="Doubles").map(e=>e.id));
 const matches=season.matches.filter(m=>doubles.has(m.eventId));
 const players=Array.from({length:8},(_,i)=>({id:i+1}));
 const rates=doublesRatings(players,matches);
 const first=rates.find(p=>p.id===1);
 assert.ok(first.games>=8);
 assert.ok(first.rating>1500);
 assert.equal(first.provisional,false);
 assert.ok(Math.abs(rates.reduce((sum,p)=>sum+p.rating,0)-1500*players.length)<=players.length,"Ratings conserve rating pool within rounding");
});
