// Tournament graph: explicit winner/loser routing, no guessed loser destinations.
export function makeBracket(ids,eventId){if(ids.length<2||ids.length>32)throw Error("2–32 players required");const size=2**Math.ceil(Math.log2(ids.length));const rounds=Math.log2(size),rows=[];for(let r=1;r<=rounds;r++)for(let i=0;i<size/2**r;i++)rows.push({id:eventId+"-W"+r+"-"+i,eventId,side:"W",round:r,slot:i,a:r===1?ids[2*i]??null:null,b:r===1?ids[2*i+1]??null:null,sourceA:r>1?{id:eventId+"-W"+(r-1)+"-"+(2*i),outcome:"winner"}:null,sourceB:r>1?{id:eventId+"-W"+(r-1)+"-"+(2*i+1),outcome:"winner"}:null,status:"Scheduled",scoreA:0,scoreB:0,court:i+1});return rows}
export function makeDoubleElimination(ids,eventId){if(![4,8,16,32].includes(ids.length))throw Error("Double elimination currently requires 4, 8, 16 or 32 participants");const n=ids.length,k=Math.log2(n),rows=[];const match=(side,round,slot,sourceA=null,sourceB=null,a=null,b=null)=>({id:eventId+"-"+side+round+"-"+slot,eventId,side,round,slot,sourceA,sourceB,a,b,status:"Scheduled",scoreA:0,scoreB:0,court:null});const ref=(side,r,i,outcome="winner")=>({id:eventId+"-"+side+r+"-"+i,outcome});
for(let r=1;r<=k;r++)for(let i=0;i<n/2**r;i++)rows.push(match("W",r,i,r>1?ref("W",r-1,2*i):null,r>1?ref("W",r-1,2*i+1):null,r===1?ids[2*i]:null,r===1?ids[2*i+1]:null));
for(let j=1;j<=2*k-2;j++){const count=n/2**(Math.floor((j+1)/2)+1);for(let i=0;i<count;i++){let a,b;if(j===1){a=ref("W",1,2*i,"loser");b=ref("W",1,2*i+1,"loser")}else if(j%2===0){a=ref("L",j-1,i);b=ref("W",j/2+1,i,"loser")}else{a=ref("L",j-1,2*i);b=ref("L",j-1,2*i+1)}rows.push(match("L",j,i,a,b))}}
rows.push(match("F",1,0,ref("W",k,0),ref("L",2*k-2,0)));
rows.push(match("F",2,0,ref("F",1,0,"loser"),ref("F",1,0,"winner")));return rows}
export function winner(m){return m.status==="Final"?(m.scoreA>m.scoreB?m.a:m.b):null}
export function loser(m){return m.status==="Final"?(m.scoreA>m.scoreB?m.b:m.a):null}
export function nextMatch(matches,id,outcome){return matches.find(m=>m.status!=="Not needed"&&(m.sourceA?.id===id&&m.sourceA.outcome===outcome||m.sourceB?.id===id&&m.sourceB.outcome===outcome))||null}
export function recordResult(matches,id,a,b){a=Number(a);b=Number(b);if(!Number.isInteger(a)||!Number.isInteger(b)||a<0||b<0||a===b)throw Error("Enter different nonnegative whole-number scores");const rows=matches.map(m=>({...m})),m=rows.find(x=>x.id===id);if(!m||!m.a||!m.b)throw Error("Both competitors must be assigned");if(m.status==="Final")throw Error("Result already final. Corrections require an audited director workflow.");if(m.side==="F"&&m.round===2){const first=rows.find(x=>x.eventId===m.eventId&&x.side==="F"&&x.round===1);if(!first||winner(first)!==first.b)throw Error("Reset final not required");}
m.scoreA=a;m.scoreB=b;m.status="Final";for(const target of rows){for(const side of ["A","B"]){const src=target["source"+side];if(src?.id!==id)continue;target[side.toLowerCase()]=src.outcome==="winner"?winner(m):loser(m);}}
if(m.side==="F"&&m.round===1){const reset=rows.find(x=>x.eventId===m.eventId&&x.side==="F"&&x.round===2);if(reset&&winner(m)===m.a){reset.status="Not needed";reset.a=null;reset.b=null;}}
return rows}
export function rating(players,matches){const map=Object.fromEntries(players.map(p=>[p.id,{id:p.id,rating:1500,games:0,wins:0}]));for(const m of matches.filter(x=>x.status==="Final"&&x.a&&x.b)){const a=map[m.a],b=map[m.b];if(!a||!b)continue;const expected=1/(1+10**((b.rating-a.rating)/400)),win=m.scoreA>m.scoreB?1:0,delta=32*(win-expected);a.rating+=delta;b.rating-=delta;a.games++;b.games++;a.wins+=win;b.wins+=1-win}return Object.values(map).map(x=>({...x,rating:Math.round(x.rating),provisional:x.games<8})).sort((a,b)=>b.rating-a.rating)}

/* Stable tournament-wide match numbering and dependency-aware board queue. */
export function matchOrder(matches){
 const rows=[...matches],n=Math.max(2,rows.filter(m=>m.side==="W"&&m.round===1).length*2);
 const k=Math.log2(n),order=[];
 const append=(side,round)=>rows.filter(m=>m.side===side&&m.round===round).sort((a,b)=>a.slot-b.slot).forEach(m=>order.push(m));
 for(let r=1;r<=k;r++){append("W",r);const lStart=r===1?1:2*r-2;const lEnd=Math.min(2*k-2,2*r-1);for(let j=lStart;j<=lEnd;j++)if(j>0&&!order.some(m=>m.side==="L"&&m.round===j))append("L",j)}
 append("F",1);append("F",2);
 const seen=new Set(order.map(m=>m.id));rows.filter(m=>!seen.has(m.id)).forEach(m=>order.push(m));
 return order;
}
export function numberedMatches(matches){const byEvent=new Map();return matches.map(m=>{if(!byEvent.has(m.eventId)){const own=matches.filter(x=>x.eventId===m.eventId),map=new Map(matchOrder(own).map((x,i)=>[x.id,i+1]));byEvent.set(m.eventId,map)}return {...m,matchNumber:byEvent.get(m.eventId).get(m.id)}})}
export function schedulingQueue(matches){
 const numbered=numberedMatches(matches);
 const occupied=new Set(numbered.filter(m=>m.status==="In Progress").flatMap(m=>[m.a,m.b]).filter(Boolean));
 const ready=numbered.filter(m=>m.status==="Scheduled"&&m.a!=null&&m.b!=null&&!occupied.has(m.a)&&!occupied.has(m.b));
 const active=numbered.filter(m=>m.status==="In Progress");
 return {active:active.sort((a,b)=>a.matchNumber-b.matchNumber),ready:ready.sort((a,b)=>a.matchNumber-b.matchNumber)};
}
export function assignNextBoard(matches,board){
 if(!Number.isInteger(Number(board))||Number(board)<1)throw Error("Invalid board");
 const occupied=matches.some(m=>m.status==="In Progress"&&Number(m.court)===Number(board));
 if(occupied)throw Error("Board already occupied");
 const next=schedulingQueue(matches).ready[0];
 if(!next)return {matches,next:null};
 return {matches:matches.map(m=>m.id===next.id?{...m,court:Number(board),status:"In Progress"}:m),next:{...next,court:Number(board),status:"In Progress"}};
}
