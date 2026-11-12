import test from "node:test";
import assert from "node:assert/strict";
import {seedDemoSeason} from "../src/demo.js";
import {scorecard} from "../src/scorecard.js";

test("fictional season completes tournaments and gives Jordan ten games",()=>{
  const s=seedDemoSeason();
  assert.equal(s.events.length,4);
  assert.ok(s.matches.filter(m=>m.status==="Final"&&(m.a===1||m.b===1)).length>=10);
  for(const e of s.events){
    const finals=s.matches.filter(m=>m.eventId===e.id&&m.side==="F");
    const played=finals.filter(m=>m.status==="Final");
    assert.ok(played.length===1||played.length===2,"One championship or championship plus reset");
    assert.equal(played[0].id,e.id+"-F1-0");
    const reset=finals.find(m=>m.round===2);
    if(played.length===2){
      assert.equal(reset?.status,"Final");
      assert.equal(played[0].scoreA<played[0].scoreB,true,"Reset only if winners finalist loses first final");
    }else{
      assert.equal(reset?.status,"Not needed");
      assert.ok(played[0].scoreA>played[0].scoreB,"Winners finalist takes first final");
    }
    assert.equal(s.matches.filter(m=>m.eventId===e.id&&m.status==="Scheduled"&&m.a&&m.b).length,0);
  }
});
test("simulated scorecards agree with bracket finals",()=>{
  const s=seedDemoSeason();
  for(const m of s.matches.filter(m=>m.status==="Final")){
    const rounds=s.scorecards.filter(r=>r.matchId===m.id);
    const sc=scorecard(rounds,m.a,m.b);
    assert.equal(sc.scoreA,m.scoreA);
    assert.equal(sc.scoreB,m.scoreB);
  }
});
