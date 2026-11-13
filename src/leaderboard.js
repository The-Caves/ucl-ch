import {rating} from "./engine.js";
import {doublesRatings} from "./player-statistics.js";

export const BASE_PLAYERS=[
 {id:1,name:"Jordan Matthews",city:"Charlotte",state:"NC"},
 {id:2,name:"Alex Carter",city:"Raleigh",state:"NC"},
 {id:3,name:"Taylor Brooks",city:"Columbia",state:"SC"},
 {id:4,name:"Marcus Reed",city:"Greensboro",state:"NC"},
 {id:5,name:"Morgan Hayes",city:"Charlotte",state:"NC"},
 {id:6,name:"Drew Wilson",city:"Raleigh",state:"NC"},
 {id:7,name:"Sam Rivera",city:"Columbia",state:"SC"},
 {id:8,name:"Casey Bennett",city:"Greensboro",state:"NC"}
];

export function searchableRoster(basePlayers,accounts=[]){
 const base=basePlayers.map(p=>({...p}));
 const local=accounts.filter(a=>a&&a.role==="player"&&a.id!=="player-demo"&&String(a.name||"").trim()).map(a=>({
  id:"local-account-"+String(a.id),name:String(a.name).trim(),city:"",state:"",local:true
 }));
 return [...base,...local];
}

export function buildLeaderboard(players,matches,format="singles"){
 if(!["singles","doubles"].includes(format))throw Error("Invalid leaderboard format");
 const minimumGames=format==="doubles"?8:10;
 const rated=format==="doubles"?doublesRatings(players,matches):rating(players,matches);
 const ratings=new Map(rated.map(r=>[String(r.id),r]));
 const rows=players.map(player=>{
  const value=ratings.get(String(player.id))||{rating:1500,games:0,wins:0};
  return {...player,csr:value.rating,games:value.games,wins:value.wins,losses:value.games-value.wins,
   qualified:value.games>=minimumGames};
 }).sort((a,b)=>Number(b.qualified)-Number(a.qualified)||
      (a.qualified&&b.qualified?b.csr-a.csr:0)||
      b.games-a.games||a.name.localeCompare(b.name));
 let rank=0;
 return rows.map(row=>({...row,globalRank:row.qualified?++rank:null}));
}

export function leaderboardLocations(players){
 return [...new Set(players.map(p=>String(p.state||"").trim()).filter(Boolean))].sort();
}
export function leaderboardCities(players,state="all"){
 return [...new Set(players.filter(p=>state==="all"||p.state===state).map(p=>String(p.city||"").trim()).filter(Boolean))].sort();
}
export function filterLeaderboard(rows,{query="",state="all",city="all"}={}){
 const area=rows.filter(p=>(state==="all"||p.state===state)&&(city==="all"||p.city===city));
 let rank=0;
 return area.map(p=>({...p,areaRank:p.qualified?++rank:null})).filter(p=>{
  const q=String(query).trim().toLowerCase().split(/\s+/).filter(Boolean);
  const haystack=[p.name,p.city,p.state].join(" ").toLowerCase();
  return q.every(term=>haystack.includes(term));
 });
}
