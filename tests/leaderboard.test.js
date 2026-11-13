import test from "node:test";
import assert from "node:assert/strict";
import {BASE_PLAYERS,searchableRoster,buildLeaderboard,leaderboardCities,leaderboardLocations,filterLeaderboard} from "../src/leaderboard.js";

const matches=[
 {status:"Final",a:1,b:2,scoreA:21,scoreB:15},
 {status:"Final",a:2,b:1,scoreA:21,scoreB:10},
 ...Array.from({length:12},(_,i)=>({status:"Final",a:1,b:3,scoreA:21,scoreB:11,id:"x"+i}))
];
test("player search covers the entire roster and locally registered demo profiles without replacing players",()=>{
 const registered=searchableRoster(BASE_PLAYERS,[{id:"player-demo",role:"player",name:"Jordan Matthews"},{id:"demo-112",role:"player",name:"Demo Newcomer"},{id:"director-demo",role:"director",name:"Demo Director"}]);
 assert.equal(registered.length,BASE_PLAYERS.length+1);
 assert.equal(registered.find(p=>p.name==="Demo Newcomer").local,true);
 assert.equal(registered.filter(p=>p.name==="Jordan Matthews").length,1);
 assert.equal(BASE_PLAYERS.length,8);
});
test("singles leaderboard sorts by rated CSR, excludes provisional from rank, and derives stats from results",()=>{
 const board=buildLeaderboard(BASE_PLAYERS,matches);
 assert.equal(board[0].name,"Jordan Matthews");
 assert.equal(board[0].globalRank,1);
 assert.equal(board[0].games,14);
 assert.equal(board[0].wins,13);
 assert.equal(board.find(p=>p.id===2).globalRank,null);
 assert.equal(board.find(p=>p.id===8).globalRank,null);
});
test("doubles leaderboard uses doubles wins and independent ranking",()=>{
 const rows=[...matches,...Array.from({length:9},(_,i)=>({status:"Final",a:[1,3],b:[2,4],scoreA:21,scoreB:15,id:"d"+i}))];
 const singles=buildLeaderboard(BASE_PLAYERS,rows,"singles"),doubles=buildLeaderboard(BASE_PLAYERS,rows,"doubles");
 assert.equal(singles.find(p=>p.id===1).games,14);
 assert.equal(doubles.find(p=>p.id===1).games,9);
 assert.equal(doubles.find(p=>p.id===1).globalRank,1);
 assert.equal(doubles.find(p=>p.id===2).wins,0);
});
test("state and city choices are based on roster; geographic ranks do not change while text-searching",()=>{
 assert.deepEqual(leaderboardLocations(BASE_PLAYERS),["NC","SC"]);
 assert.deepEqual(leaderboardCities(BASE_PLAYERS,"SC"),["Columbia"]);
 const board=buildLeaderboard(BASE_PLAYERS,matches);
 assert.equal(filterLeaderboard(board,{state:"SC"}).every(p=>p.state==="SC"),true);
 assert.equal(filterLeaderboard(board,{city:"Raleigh"}).length,2);
 const searched=filterLeaderboard(board,{state:"NC",query:"jordan"});
 assert.equal(searched.length,1);
 assert.equal(searched[0].areaRank,1);
 assert.equal(filterLeaderboard(board,{query:"random nobody"}).length,0);
});
test("the two cities named Raleigh and Greensboro remain separate filters",()=>{
 const board=buildLeaderboard(BASE_PLAYERS,matches);
 assert.deepEqual(new Set(filterLeaderboard(board,{city:"Raleigh"}).map(p=>p.city)),new Set(["Raleigh"]));
 assert.equal(filterLeaderboard(board,{state:"SC",city:"Raleigh"}).length,0);
});
