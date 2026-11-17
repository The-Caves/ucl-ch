import test from "node:test";
import assert from "node:assert/strict";
import {renderPlayersHome,renderDeepPlayer,renderEventDirectory,renderEventOverview,renderEventScores} from "../src/hub-views.js";
test("player dashboard can search follow and view profiles",()=>{
 const p={id:1,name:"Jordan Matthews",city:"Charlotte",state:"NC",games:22,activeEvents:2,ppr:7.5,singles:{qualified:true,csr:1750},doubles:{qualified:false}};
 const h=renderPlayersHome({players:[p],query:"Jordan",tab:"discover",following:[]});
 assert.match(h,/Players/);assert.match(h,/hubPlayerSearch/);assert.match(h,/playerdetail:1/);assert.match(h,/toggleplayerfollow:1/);
 const followed=renderPlayersHome({players:[p],query:"",tab:"following",following:["1"]});
 assert.match(followed,/Following ✓/);
});
test("expanded profile exposes stats, all three event statuses, and follow action",()=>{
 const s={parent:{id:"e",name:"Sample Event",venue:"Hall",city:"Raleigh"},tournaments:[{id:"b"}],status:"Active"};
 const h=renderDeepPlayer({player:{id:1,name:"Jordan Matthews",city:"Charlotte",state:"NC"},followed:false,singles:{qualified:true,csr:1700},doubles:{qualified:true,csr:1600},metrics:{ppr:8,wins:20,losses:3,games:23,fourBagPct:14},singlesRank:1,stateRank:1,events:[s],history:[]});
 for(const word of ["Active Events","Upcoming Events","Completed Events","Match record","4-Bagger","toggleplayerfollow:1","eventgroup:e"])assert.match(h,new RegExp(word));
});
test("event overview includes multiple independent child tournaments",()=>{
 const e={id:"parent",name:"Venue Event",venue:"Hall",city:"Raleigh"};
 const tournaments=[{id:"a",name:"Singles",status:"Active",format:"Singles",ids:[1,2,3,4]},{id:"b",name:"Doubles",status:"Active",format:"Doubles",ids:[[1,2],[3,4]]}];
 const h=renderEventOverview({event:e,brackets:tournaments,view:"overview"});
 assert.match(h,/event:a/);assert.match(h,/event:b/);assert.match(h,/eventgrouptab:scores/);
 assert.match(renderEventDirectory([{...e,count:2,status:"Active"}]),/eventgroup:parent/);
});
test("event-wide scores have independently expandable sections and actionable match links",()=>{
 const e={id:"p",name:"Raleigh Night"},one={id:"a",name:"Singles"},two={id:"b",name:"Doubles"};
 const sections=[{tournament:one,matches:[{id:"m1",status:"In Progress",a:1,b:2,matchNumber:1,court:3,scoreA:5,scoreB:2}]},{tournament:two,matches:[{id:"m2",status:"Final",a:[1,3],b:[2,4],matchNumber:2,scoreA:21,scoreB:10}]}];
 const h=renderEventScores({event:e,sections,person:n=>Array.isArray(n)?n.join("&"):String(n),scoreOf:m=>({a:m.scoreA,b:m.scoreB})});
 assert.equal((h.match(/<details /g)||[]).length,2);
 assert.match(h,/data-action="match:m1"/);assert.match(h,/data-action="match:m2"/);
 assert.match(h,/eventScoresSearch/);assert.match(h,/LIVE/);assert.match(h,/FINAL/);
});
