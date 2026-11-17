// Director-controlled, dependency-aware scheduling for double-elimination brackets.
// A match must be fully seeded and players must not already be on a live board.
const teamIds=team=>Array.isArray(team)?team.map(String):team==null?[]:[String(team)];
export function schedulingWave(match){
 if(match.side==="F")return 1e6+match.round;
 if(match.side==="W")return match.round===1?0:3*(match.round-2)+2;
 if(match.side==="L")return match.round===1?1:3*Math.floor((match.round-2)/2)+3+(match.round%2===1?1:0);
 return match.round||0;
}
export function needsLosersCatchup(all,match){
 if(match.side!=="W"||match.round<3)return false;
 const requiredLosersRound=2*match.round-4;
 const stage=all.filter(m=>m.eventId===match.eventId&&m.side==="L"&&m.round===requiredLosersRound);
 return stage.length>0&&stage.some(m=>!["Final","Not needed","Bye"].includes(m.status));
}
export function scheduleCandidates(all,scopeIds){
 const selected=all.filter(m=>scopeIds.has(m.eventId));
 const activePlayers=new Set(all.filter(m=>m.status==="In Progress").flatMap(m=>[...teamIds(m.a),...teamIds(m.b)]));
 const ready=selected.filter(m=>m.status==="Scheduled"&&m.a!=null&&m.b!=null&&[...teamIds(m.a),...teamIds(m.b)].every(p=>!activePlayers.has(p)));
 const isHeld=m=>needsLosersCatchup(all,m)||(m.rounder&&all.some(prev=>prev.eventId===m.eventId&&prev.rounder&&prev.round<m.round&&!["Final","Not needed","Bye"].includes(prev.status)));
 const allowed=ready.filter(m=>!isHeld(m));
 const held=ready.filter(isHeld);
 // Wave ordering is tournament-relative. Spread slots fairly across simultaneous brackets:
 // wave first, then least completed games, then stable event/round/slot order.
 const completedByEvent=new Map();
 for(const m of selected)if(m.status==="Final")completedByEvent.set(m.eventId,(completedByEvent.get(m.eventId)||0)+1);
 allowed.sort((a,b)=>schedulingWave(a)-schedulingWave(b)||
  (completedByEvent.get(a.eventId)||0)-(completedByEvent.get(b.eventId)||0)||
  String(a.eventId).localeCompare(String(b.eventId))||a.slot-b.slot);
 return {ready:allowed,held,active:selected.filter(m=>m.status==="In Progress")};
}
