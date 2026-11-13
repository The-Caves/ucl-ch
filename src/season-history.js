import {makeDoubleElimination,recordResult} from "./engine.js";
import {scorecard} from "./scorecard.js";

// Seeded fictional competition history for the browser-only demonstration.
export const HISTORY_VERSION=1;
const events=[
 ["Queen City Winter Classic","Charlotte, NC","The Toss House","2026-01-24","Singles"],
 ["Triangle Winter Throwdown","Raleigh, NC","Triangle Bag Co.","2026-02-21","Doubles"],
 ["Piedmont Bag Masters","Greensboro, NC","Civic Recreation Center","2026-03-14","Singles"],
 ["Carolina Spring Open","Charlotte, NC","The Toss House","2026-04-11","Singles"],
 ["Capital City Doubles Open","Raleigh, NC","Triangle Bag Co.","2026-05-09","Doubles"],
 ["Summer Boards Championship","Charlotte, NC","Carolina Cornhole Hall","2026-06-13","Singles"],
 ["Midseason Team Challenge","Greensboro, NC","Civic Recreation Center","2026-07-18","Doubles"],
 ["Carolina State Qualifier","Raleigh, NC","Triangle Bag Co.","2026-08-22","Singles"],
 ["Queen City Pairs Classic","Charlotte, NC","The Toss House","2026-09-19","Doubles"],
 ["Autumn Championship","Raleigh, NC","Carolina Cornhole Hall","2026-10-17","Singles"]
];
function random(seed){let x=seed>>>0;return ()=>{x=(Math.imul(1664525,x)+1013904223)>>>0;return x/4294967296}}
function toss(rng,id){
 const skill=id===1?.47:id===3?.42:.25+((id*7)%9)*.018;
 let holes=0,on=0;
 for(let bag=0;bag<4;bag++){const r=rng();if(r<skill)holes++;else if(r<skill+.27)on++}
 return {holes,on};
}
export function seedTournamentHistory(){
 const result={events:[],matches:[],scorecards:[]};
 events.forEach(([name,city,venue,date,format],index)=>{
  const id="ucl-history-"+(index+1),ids=format==="Doubles"?[[1,3],[2,4],[5,6],[7,8]]:[1,2,3,4,5,6,7,8];
  result.events.push({id,name,city,venue,date,status:"Completed",format,ids,registeredIds:[1],fictional:true});
  let bracket=makeDoubleElimination(ids,id);
  const rng=random(86413+index*1009);
  for(let step=0;step<40;step++){
   const match=bracket.find(m=>m.status==="Scheduled"&&m.a!=null&&m.b!=null);
   if(!match)break;
   const rounds=[];let final=null;
   for(let turn=0;turn<100;turn++){
    const throwerA=Array.isArray(match.a)?match.a[turn%match.a.length]:match.a;
    const throwerB=Array.isArray(match.b)?match.b[turn%match.b.length]:match.b;
    const a=toss(rng,throwerA),b=toss(rng,throwerB);
    rounds.push({matchId:match.id,a:match.a,b:match.b,aIn:a.holes,aOn:a.on,bIn:b.holes,bOn:b.on,throwerA,throwerB});
    final=scorecard(rounds,match.a,match.b);
    if(final.finished)break;
   }
   if(!final?.finished)throw Error("Could not complete fixture "+match.id);
   result.scorecards.push(...rounds);
   bracket=recordResult(bracket,match.id,final.scoreA,final.scoreB);
   bracket.find(m=>m.id===match.id).court=1+step%8;
  }
  if(bracket.some(m=>m.status==="Scheduled"&&m.a!=null&&m.b!=null))throw Error("Unfinished bracket "+id);
  result.matches.push(...bracket);
 });
 return result;
}
