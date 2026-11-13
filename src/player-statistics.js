// Keep singles and doubles participation separate from recorded individual turns.
export function includesPlayer(team,id){
 return Array.isArray(team)?team.some(x=>Number(x)===Number(id)):team!=null&&Number(team)===Number(id);
}
export function sameTeam(a,b){
 if(Array.isArray(a)||Array.isArray(b))return Array.isArray(a)&&Array.isArray(b)&&a.length===b.length&&a.every((x,i)=>Number(x)===Number(b[i]));
 return a!=null&&b!=null&&Number(a)===Number(b);
}
export function teamKey(team){return Array.isArray(team)?"team:"+team.map(Number).join(","):"single:"+Number(team)}
export function participated(m,id){return includesPlayer(m.a,id)||includesPlayer(m.b,id)}
export function roundSide(row,id){
 if(Array.isArray(row.a)){if(Number(row.throwerA)===Number(id)&&row.throwerA!=null)return "a"}
 else if(includesPlayer(row.a,id))return "a";
 if(Array.isArray(row.b)){if(Number(row.throwerB)===Number(id)&&row.throwerB!=null)return "b"}
 else if(includesPlayer(row.b,id))return "b";
 return null;
}
export function playerStats(matches,scorecards,id){
 const finals=matches.filter(m=>m.status==="Final"&&participated(m,id));
 const matchIds=new Set(finals.map(m=>m.id));
 const rows=scorecards.filter(r=>matchIds.has(r.matchId)).map(r=>({r,side:roundSide(r,id)})).filter(x=>x.side);
 const wins=finals.filter(m=>includesPlayer(m.scoreA>m.scoreB?m.a:m.b,id)).length;
 let points=0,opponent=0,fours=0;
 for(const {r,side} of rows){
  const opposite=side==="a"?"b":"a";
  points+=3*Number(r[side+"In"])+Number(r[side+"On"]);
  opponent+=3*Number(r[opposite+"In"])+Number(r[opposite+"On"]);
  fours+=Number(r[side+"In"]===4);
 }
 return {games:finals.length,wins,losses:finals.length-wins,rounds:rows.length,points,opponent,fours,
  ppr:rows.length?points/rows.length:null,opponentPpr:rows.length?opponent/rows.length:null,
  dpr:rows.length?(points-opponent)/rows.length:null,fourBagPct:rows.length?100*fours/rows.length:null};
}

export function doublesRatings(players,matches){
 const map=new Map(players.map(p=>[p.id,{id:p.id,rating:1500,games:0,wins:0}]));
 for(const m of matches){
  if(m.status!=="Final"||!Array.isArray(m.a)||!Array.isArray(m.b))continue;
  const teamA=m.a.map(id=>map.get(Number(id))),teamB=m.b.map(id=>map.get(Number(id)));
  if(teamA.some(x=>!x)||teamB.some(x=>!x))continue;
  const avg=team=>team.reduce((n,p)=>n+p.rating,0)/team.length;
  const expected=1/(1+10**((avg(teamB)-avg(teamA))/400));
  const win=m.scoreA>m.scoreB?1:0,delta=32*(win-expected);
  for(const player of teamA){player.rating+=delta;player.games++;player.wins+=win}
  for(const player of teamB){player.rating-=delta;player.games++;player.wins+=1-win}
 }
 return [...map.values()].map(p=>({...p,rating:Math.round(p.rating),provisional:p.games<8})).sort((a,b)=>b.rating-a.rating);
}
