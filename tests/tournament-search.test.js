import test from "node:test";
import assert from "node:assert/strict";
import {matchesTournamentSearch} from "../src/tournament-search.js";

const tournament={name:"Queen City Winter Classic",city:"Charlotte, NC",venue:"The Toss House",format:"Doubles",date:"2026-02-21"};
test("finds a tournament by event name",()=>{
 assert.ok(matchesTournamentSearch(tournament,"Queen City"));
 assert.ok(matchesTournamentSearch(tournament,"WINTER"));
});
test("finds a tournament by city, state, venue or format",()=>{
 assert.ok(matchesTournamentSearch(tournament,"charlotte"));
 assert.ok(matchesTournamentSearch(tournament,"NC"));
 assert.ok(matchesTournamentSearch(tournament,"Toss House"));
 assert.ok(matchesTournamentSearch(tournament,"Doubles"));
});
test("matches separate terms across city and tournament name",()=>{
 assert.ok(matchesTournamentSearch(tournament,"Charlotte winter"));
 assert.ok(matchesTournamentSearch(tournament,"toss queen"));
 assert.equal(matchesTournamentSearch(tournament,"Raleigh winter"),false);
});
test("empty input includes all tournaments and unrelated terms exclude them",()=>{
 assert.equal(matchesTournamentSearch(tournament,""),true);
 assert.equal(matchesTournamentSearch(tournament,"  "),true);
 assert.equal(matchesTournamentSearch(tournament,"Carolina"),false);
});
