import test from "node:test";import assert from "node:assert/strict";import {validateBags,addRound,summarizeRounds,exportRoundsCSV} from "../src/scoring.js";
test("invalid bags rejected",()=>{assert.throws(()=>validateBags([1,2,0,3]));assert.throws(()=>validateBags([1,3,0]))});
test("bag stats calculate PPR and placement",()=>{const rows=addRound([],{matchId:"m",playerId:1,bags:[3,1,0,3]});const s=summarizeRounds(rows);assert.equal(s.ppr,7);assert.deepEqual(s.counts,{off:1,board:1,hole:2});assert.equal(s.accuracy,75)});
test("round entry preserves previous array",()=>{const a=[];const b=addRound(a,{matchId:"m",playerId:1,bags:[0,0,0,0]});assert.equal(a.length,0);assert.equal(b.length,1)});
test("CSV exports bag details",()=>{const s=exportRoundsCSV(addRound([],{matchId:"m",playerId:1,bags:[3,1,0,3]}));assert.match(s,/match_id,player_id/);assert.match(s,/"7"/)});
