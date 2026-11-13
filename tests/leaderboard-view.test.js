import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {renderLeaderboardTeaser,renderLeaderboardDirectory,renderPublicPlayer} from "../src/leaderboard-view.js";
import {BASE_PLAYERS,buildLeaderboard,filterLeaderboard,leaderboardLocations,leaderboardCities} from "../src/leaderboard.js";

test("UCL header is a keyboard-accessible dashboard action",()=>{
 const html=readFileSync(new URL("../index.html",import.meta.url),"utf8");
 assert.match(html,/<button type="button" class="brand" data-action="page:home"/);
 assert.match(html,/aria-label="UCL Player Hub/);
});
test("dashboard leaderboard appears as navigable card with CSR preview",()=>{
 const players=buildLeaderboard(BASE_PLAYERS,Array.from({length:12},(_,i)=>({id:"m"+i,status:"Final",a:1,b:2,scoreA:21,scoreB:8})));
 const html=renderLeaderboardTeaser(players);
 assert.match(html,/Players & Leaderboard/);
 assert.match(html,/data-action="page:leaderboard"/);
 assert.match(html,/Jordan Matthews/);
});
test("leaderboard page has state, city, text search, CSR and distinct doubles controls",()=>{
 const all=buildLeaderboard(BASE_PLAYERS,[]);
 const rows=filterLeaderboard(all,{state:"NC",city:"Charlotte"});
 const html=renderLeaderboardDirectory({rows,states:leaderboardLocations(BASE_PLAYERS),cities:leaderboardCities(BASE_PLAYERS,"NC"),format:"singles",state:"NC",city:"Charlotte",query:""});
 assert.match(html,/id="leaderboardSearch"/);
 assert.match(html,/id="leaderboardState"/);
 assert.match(html,/id="leaderboardCity"/);
 assert.match(html,/data-action="leaderboardformat:doubles"/);
 assert.match(html,/Provisional & unranked/);
 assert.match(html,/playerdetail:1/);
 assert.doesNotMatch(html,/Taylor Brooks/);
});
test("player detail escapes names, shows separate ratings and recent matches",()=>{
 const html=renderPublicPlayer({
  player:{id:"test",name:"<script>alert(1)</script>",city:"Raleigh",state:"NC"},
  stats:{wins:2,losses:1,games:3},
  singles:{csr:1644,qualified:true,games:10},
  doubles:{csr:1500,qualified:false,games:2},
  history:[{id:"t-1",eventName:"Summer Open",sideA:"Demo A",sideB:"Demo B",scoreA:21,scoreB:8}]
 });
 assert.match(html,/&lt;script&gt;/);
 assert.doesNotMatch(html,/<script>/);
 assert.match(html,/Singles CSR/);
 assert.match(html,/Doubles CSR/);
 assert.match(html,/1644/);
 assert.match(html,/Provisional/);
 assert.match(html,/data-action="match:t-1"/);
});
