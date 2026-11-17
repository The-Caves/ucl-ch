import test from "node:test";
import assert from "node:assert/strict";
import {playerStats} from "../src/player-statistics.js";
test("live rounds immediately update PPR without changing win-loss record",()=>{
 const matches=[{id:"m1",status:"In Progress",a:1,b:2,scoreA:0,scoreB:0}];
 const rows=[{matchId:"m1",a:1,b:2,aIn:2,aOn:1,bIn:1,bOn:1}];
 const a=playerStats(matches,rows,1);
 assert.equal(a.games,0);
 assert.equal(a.wins,0);assert.equal(a.losses,0);
 assert.equal(a.rounds,1);assert.equal(a.ppr,7);
 assert.equal(a.opponentPpr,4);
 matches[0].status="Final";matches[0].scoreA=21;matches[0].scoreB=10;
 const b=playerStats(matches,rows,1);
 assert.equal(b.games,1);assert.equal(b.wins,1);
 assert.equal(b.ppr,7);
});
test("doubles live PPR attributes only the actual thrower",()=>{
 const match={id:"d1",status:"In Progress",a:[1,3],b:[2,4],scoreA:0,scoreB:0};
 const rounds=[
  {matchId:"d1",a:match.a,b:match.b,aIn:2,aOn:1,bIn:1,bOn:0,throwerA:1,throwerB:2},
  {matchId:"d1",a:match.a,b:match.b,aIn:0,aOn:3,bIn:1,bOn:1,throwerA:3,throwerB:4}
 ];
 assert.equal(playerStats([match],rounds,1).rounds,1);
 assert.equal(playerStats([match],rounds,1).ppr,7);
 assert.equal(playerStats([match],rounds,3).ppr,3);
});
