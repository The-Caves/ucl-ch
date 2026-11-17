import {directorAuditFor} from "./director-corrections.js";
const esc=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const mk=(label,action,cls="")=>'<button type="button" data-action="'+esc(action)+'" class="action '+cls+'">'+label+'</button>';
const select=(name,values,selected)=>'<select name="'+name+'" class="field">'+values.map(v=>'<option value="'+esc(v.value)+'" '+(String(v.value)===String(selected)?"selected":"")+'>'+esc(v.label)+'</option>').join("")+'</select>';
const numberInput=(name,value,label)=>'<label>'+label+'<input class="field" type="number" name="'+name+'" min="0" max="21" step="1" required value="'+esc(value)+'"></label>';
const bagInput=(name,value,label)=>'<label>'+label+'<input class="field" type="number" name="'+name+'" min="0" max="4" step="1" required value="'+esc(value)+'"></label>';

export function renderDirectorCorrectionPage(state,{tournamentId,matchId,kind="result",roundNumber=1,person}){
 const tournaments=[...(state.events||[])].sort((a,b)=>(["Live","Active"].includes(a.status)?0:a.status==="Upcoming"?1:2)-(["Live","Active"].includes(b.status)?0:b.status==="Upcoming"?1:2)||a.name.localeCompare(b.name));
 const tournament=tournaments.find(t=>t.id===tournamentId)||tournaments[0];
 const matches=(state.matches||[]).filter(m=>m.eventId===tournament?.id).sort((a,b)=>{
  const score=x=>x.status==="In Progress"?0:x.status==="Final"?1:2;
  return score(a)-score(b)||a.round-b.round||a.slot-b.slot;
 });
 const match=matches.find(m=>m.id===matchId)||matches[0],rows=match?(state.scorecards||[]).filter(r=>r.matchId===match.id):[];
 const available=['result','forfeit','round','matchup','swap','reopen'];
 if(!available.includes(kind))kind='result';
 const round=rows[Number(roundNumber)-1]||rows[0];
 const sourceFree=match?.side==="W"&&match?.round===1&&!match?.sourceA&&!match?.sourceB;
 const editable=sourceFree&&match?.status==="Scheduled"&&rows.length===0;
 const isDouble=Array.isArray(tournament?.ids?.[0]);
 const optTeam=(team)=>({value:Array.isArray(team)?team.join(","):String(team),label:person(team)});
 const roster=(tournament?.ids||[]).map(optTeam);
 const key=team=>Array.isArray(team)?team.join(","):String(team??"");
 const w1=matches.filter(m=>m.side==="W"&&m.round===1&&m.id!==match?.id);
 const audit=match?directorAuditFor(state,match.id):[];
 const kindLabels=[["result","Enter / Correct Result"],["forfeit","Record Forfeit"],["round","Edit Saved Round"],["matchup","Correct Matchup"],["swap","Swap Opening-Round Competitors"],["reopen","Reopen / Clear Match"]];
 const head='<div class="director-correction-nav">'+mk("← Director Tools","page:director","ghost")+'<div><span class="section-kicker">DIRECTOR OPERATIONS</span><h1>Match Corrections</h1><p>Record manual games, fix scores and player statistics, or make audited bracket corrections.</p></div></div><div class="board-local-notice"><strong>Demo only</strong> — changes persist in this browser. Production use requires authenticated director permissions and transactional server audits.</div>';
 const filters='<section class="panel director-correction-filters"><label>Child tournament<select id="correctionTournamentSelect" class="field">'+tournaments.map(t=>'<option value="'+esc(t.id)+'" '+(t.id===tournament?.id?"selected":"")+'>'+esc(t.name)+'</option>').join("")+'</select></label><label>Match<select id="correctionMatchSelect" class="field">'+matches.map(m=>'<option value="'+esc(m.id)+'" '+(m.id===match?.id?"selected":"")+'>'+esc(m.side)+' / Round '+m.round+' · '+esc(person(m.a))+' vs '+esc(person(m.b))+' ['+esc(m.status)+']</option>').join("")+'</select></label></section>';
 if(!match)return head+filters+'<section class="panel"><p>No matches in this tournament.</p></section>';
 const summary='<section class="panel director-match-summary"><div class="director-correction-status"><span>Selected Match</span><strong>'+esc(match.status)+'</strong></div><h2>'+esc(person(match.a))+' <span>vs</span> '+esc(person(match.b))+'</h2><p>'+esc(tournament.name)+' · '+esc(match.side)+' Bracket / Round '+match.round+' · Board '+esc(match.court??"Unassigned")+'</p><div class="director-match-score"><span>'+match.scoreA+'</span><span>–</span><span>'+match.scoreB+'</span></div><p class="small">Changing the winning side recalculates unplayed downstream matches. If a dependent match is active or final, the correction will be blocked to protect tournament integrity.</p></section>';
 let fields="",canSubmit=true,warning="";
 if(kind==="result"){
  fields='<div class="director-correction-grid">'+numberInput("scoreA",match.status==="Final"?match.scoreA:21,"Side A final score")+numberInput("scoreB",match.scoreB||0,"Side B final score")+'</div><p class="small">Record a full game without tablets, or correct the winner / score. For round-capped games, any non-tied score of 0–21 is valid; otherwise one side must reach 21. Manually entered results have no bag-by-bag PPR and replace existing rounds for this game.</p>';
 }else if(kind==="forfeit"){
  fields='<label>Forfeit winner'+select("winnerSide",[{value:"A",label:person(match.a)},{value:"B",label:person(match.b)}],"A")+'</label><p class="small">A forfeit is recorded as 21–0. No bag statistics are credited for the forfeit.</p>';
 }else if(kind==="round"){
  canSubmit=!!round;warning=canSubmit?"":"No recorded rounds to edit. Use manual result entry if the tablets were not used.";
  if(round){
   fields='<label>Saved round<select id="correctionRoundSelect" name="roundNumber" class="field">'+rows.map((r,i)=>'<option value="'+(i+1)+'" '+(Number(roundNumber)===i+1?"selected":"")+'>'+(i+1)+'</option>').join("")+'</select></label><div class="director-correction-grid">'+bagInput("aIn",round.aIn,"Side A · In")+bagInput("aOn",round.aOn,"Side A · On")+bagInput("bIn",round.bIn,"Side B · In")+bagInput("bOn",round.bOn,"Side B · On")+'</div>';
   if(isDouble){
    const thrower=(side,team,id)=>'<label>Side '+side+' thrower'+select("thrower"+side,team.map(playerId=>({value:playerId,label:person(playerId)})),id)+'</label>';
    fields+='<div class="director-correction-grid">'+thrower("A",match.a,round.throwerA)+thrower("B",match.b,round.throwerB)+'</div>';
   }
   fields+='<p class="small">Edit bag totals or reassign a doubles turn to the correct player. PPR is recalculated from saved rounds.</p>';
  }
 }else if(kind==="matchup"){
  canSubmit=editable;warning=editable?"":"Only unplayed opening-round matches can have their opponents changed. Correct earlier results instead when this pairing was created by bracket advancement.";
  if(editable)fields='<div class="director-correction-grid"><label>Side A competitor / team'+select("teamA",roster,key(match.a))+'</label><label>Side B competitor / team'+select("teamB",roster,key(match.b))+'</label></div><p class="small">Competitors must be registered in this bracket and cannot appear in another opening-round match.</p>';
 }else if(kind==="swap"){
  canSubmit=editable&&w1.length>0;warning=canSubmit?"":"Swapping players requires two unplayed first-round matches.";
  if(canSubmit)fields='<label>Other opening-round match'+select("otherMatchId",w1.map(m=>({value:m.id,label:person(m.a)+" vs "+person(m.b)})),w1[0].id)+'</label><div class="director-correction-grid"><label>From this match'+select("sideA",[{value:"A",label:"Side A"},{value:"B",label:"Side B"}],"A")+'</label><label>From other match'+select("sideB",[{value:"A",label:"Side A"},{value:"B",label:"Side B"}],"A")+'</label></div><p class="small">Swap entire singles competitors or registered doubles teams atomically, without introducing duplicate players.</p>';
 }else if(kind==="reopen"){
  canSubmit=["Final","In Progress"].includes(match.status);warning=canSubmit?"":"Only started or completed games can be reopened.";
  if(canSubmit)fields='<p class="director-danger">This clears the selected match score and its saved rounds, releases its board, and resets any unplayed downstream participants. Already-started dependent matches are protected.</p>';
 }
 const changeKind='<label>Correction type<select id="correctionKindSelect" class="field">'+kindLabels.map(([id,label])=>'<option value="'+id+'" '+(kind===id?"selected":"")+'>'+label+'</option>').join("")+'</select></label>';
 const form='<section class="panel director-correction-form"><h2>Make a Correction</h2><div class="director-correction-fields">'+changeKind+(warning?'<p class="director-validation">'+esc(warning)+'</p>':'')+'<form id="directorCorrectionForm" '+(canSubmit?"":'data-disabled="true"')+'>'+fields+'<label>Reason for correction<textarea class="field" name="reason" required minlength="6" rows="3" placeholder="What happened, and why is this change needed?"></textarea></label><button type="submit" class="action '+(kind==="reopen"?"director-danger-button":"primary")+'" '+(canSubmit?"":"disabled")+'>'+(kind==="reopen"?"Reopen and Clear Match":"Save Audited Correction")+'</button></form></div></section>';
 const entries=audit.length?audit.slice(0,25).map(a=>'<div class="director-audit-row"><div><strong>'+esc(a.action)+' · '+esc(a.actor)+'</strong><small>'+esc(a.timestamp)+'</small><p>'+esc(a.reason)+'</p></div><span>'+a.affected.length+' affected</span></div>').join(""):'<p class="small">No corrections recorded for this match.</p>';
 const auditHtml='<section class="panel director-audit-section"><h2>Correction History</h2><p class="small">The original and corrected records are retained in the audit history.</p>'+entries+'</section>';
 return '<div class="director-corrections">'+head+filters+summary+form+auditHtml+'</div>';
}
