// Event formats, signup, seeding, rounders, and conversion into elimination brackets.
// Browser-local prototype. Replace mutations with authenticated transactions for production.
import {makeBracket,makeDoubleElimination} from "./engine.js";
import {roundPoints} from "./scorecard.js";
import {roundSide} from "./player-statistics.js";
export const SOLO_PARTNER_ID=-1;
export const FORMAT_TYPES=["singles","fixed-doubles","blind-draw","swap-singles","swap-doubles"];
export const SEED_MODES=["random","event-points","state-ranking","national-ranking","rounder-ppr"];
export const PARTNER_MODES=["top-bottom","top-middle","top-bottom-random","blind-draw"];
export const realIds=team=>Array.isArray(team)?team.filter(x=>Number(x)!==SOLO_PARTNER_ID).map(Number):[Number(team)].filter(x=>Number.isInteger(x)&&x!==SOLO_PARTNER_ID);
function rand(seed=1234567){let x=(Number(seed)||1234567)>>>0;return()=>((x=Math.imul(1664525,x)+1013904223>>>0)/4294967296)}
function mix(items,seed){const a=[...items],r=rand(seed);for(let i=a.length-1;i>0;i--){const j=Math.floor(r()*(i+1));[a[i],a[j]]=[a[j],a[i]]}return a}
function uniqueIds(ids){const a=ids.map(Number);if(a.some(x=>!Number.isSafeInteger(x)||x<1)||new Set(a).size!==a.length)throw Error("Players must be unique registered IDs");return a}
export function seedPositions(size){if(!Number.isInteger(size)||size<2||(size&(size-1))!==0)throw Error("Seed field must be a power of 2");let a=[1,2];while(a.length<size){const next=a.length*2+1;a=a.flatMap(x=>[x,next-x])}return a}
export function seedEntrants(entrants,{mode="random",rankings={},seed=1234,standings=[]}={}){
 if(!SEED_MODES.includes(mode))throw Error("Unsupported seeding mode");
 const teams=[...entrants],str=team=>realIds(team).join(",");
 if(mode==="random")return mix(teams,seed);
 const stat=new Map(standings.map(x=>[Number(x.id),Number(x.ppr)]));
 const key=p=>{const m=rankings?.[String(p)]||{};
  if(mode==="rounder-ppr")return stat.get(Number(p));
  return Number(m[mode==="event-points"?"points":mode==="state-ranking"?"stateRank":"nationalRank"]);
 };
 const scored=teams.map(t=>{const values=realIds(t).map(key);if(!values.length||values.some(x=>!Number.isFinite(x)))throw Error("Missing "+mode+" values for one or more players; enter verified scores/ranks before seeding");return {team:t,v:values.reduce((a,b)=>a+b,0)/values.length}});
 const smaller=mode.includes("ranking");
 scored.sort((a,b)=>(smaller?a.v-b.v:b.v-a.v)||str(a.team).localeCompare(str(b.team)));
 return scored.map(x=>x.team);
}
export function placeBracketSeeds(seeded){const n=2**Math.ceil(Math.log2(Math.max(seeded.length,2))),order=seedPositions(n);return order.map(seed=>seeded[seed-1]??null)}
export function pairTeams(ids,mode="blind-draw",seed=1234){
 if(!PARTNER_MODES.includes(mode))throw Error("Unknown partner assignment");
 const list=uniqueIds(ids),sorted=[...list],half=Math.ceil(sorted.length/2);
 let left,right;
 if(mode==="top-bottom"){left=sorted.slice(0,half);right=sorted.slice(half).reverse()}
 else if(mode==="top-middle"){left=sorted.slice(0,half);right=sorted.slice(half)}
 else if(mode==="top-bottom-random"){left=sorted.slice(0,half);right=mix(sorted.slice(half),seed)}
 else {const random=mix(sorted,seed);left=random.slice(0,Math.ceil(random.length/2));right=random.slice(Math.ceil(random.length/2))}
 return left.map((id,i)=>[id,right[i]??SOLO_PARTNER_ID]);
}
function circlePairs(ids,round,seed){
 const real=uniqueIds(ids),arr=mix(real,seed);
 if(arr.length%2)arr.push(SOLO_PARTNER_ID);
 const k=(round-1)%(arr.length-1),ring=arr.slice(1),rotated=[...ring.slice(ring.length-k),...ring.slice(0,ring.length-k)],slots=[arr[0],...rotated];
 return Array.from({length:slots.length/2},(_,i)=>[slots[i],slots[slots.length-1-i]]);
}
function pairRounderPlayers(ids,format,roundIndex,seed){
 const pairs=circlePairs(ids,roundIndex,seed);
 if(format==="swap-singles"){
  return {matches:pairs.filter(p=>!p.includes(SOLO_PARTNER_ID)),bye:pairs.filter(p=>p.includes(SOLO_PARTNER_ID))};
 }
 const teams=pairs.map(p=>p);
 // Mix teams into opponents; if an odd number of teams, rotate the sit-out.
 const shuffled=mix(teams,seed+roundIndex*7123);
 if(shuffled.length%2){
  const sitting=shuffled.splice((roundIndex-1)%shuffled.length,1);
  return {matches:Array.from({length:shuffled.length/2},(_,i)=>[shuffled[2*i],shuffled[2*i+1]]),bye:sitting};
 }
 return {matches:Array.from({length:shuffled.length/2},(_,i)=>[shuffled[2*i],shuffled[2*i+1]]),bye:[]};
}
export function makeRounders(ids,format,roundCount,tournamentId,seed=1234){
 if(!["swap-singles","swap-doubles"].includes(format))throw Error("Rounders require a swap format");
 if(!Number.isInteger(roundCount)||roundCount<1||roundCount>20)throw Error("Rounders must be 1–20");
 const roster=uniqueIds(ids);if(roster.length<4)throw Error("At least four players required for rounders");
 const matches=[];
 for(let round=1;round<=roundCount;round++){
  const p=pairRounderPlayers(roster,format,round,seed);
  p.matches.forEach(([a,b],slot)=>matches.push({id:tournamentId+"-R"+round+"-"+slot,eventId:tournamentId,side:"R",round,slot,a,b,sourceA:null,sourceB:null,status:"Scheduled",scoreA:0,scoreB:0,court:null,rounder:true}));
 }
 return matches;
}
export function rounderStandings(state,tournamentId){
 const event=state.events.find(t=>t.id===tournamentId);
 if(!event)throw Error("Tournament not found");
 const rows=state.matches.filter(m=>m.eventId===tournamentId&&m.rounder);
 const playerIds=event.registeredIds||[];
 return playerIds.map(id=>{
  const completed=rows.filter(m=>m.status==="Final"&&(realIds(m.a).includes(id)||realIds(m.b).includes(id)));
  const ledger=state.scorecards.filter(r=>completed.some(m=>m.id===r.matchId));
  const individual=ledger.filter(r=>roundSide(r,id)!=null);
  const total=individual.reduce((sum,r)=>{const side=roundSide(r,id);return sum+roundPoints(r[side+"In"],r[side+"On"])},0);
  const won=completed.filter(m=>{const winning=m.scoreA>m.scoreB?m.a:m.b;return realIds(winning).includes(id)}).length;
  return {id,games:completed.length,wins:won,ppr:individual.length?Number((total/individual.length).toFixed(2)):null,rounds:individual.length};
 }).sort((a,b)=>(b.ppr??-1)-(a.ppr??-1)||b.wins-a.wins||a.id-b.id);
}
function ensureParent(state,parentId){if(!state.eventGroups?.some(x=>x.id===parentId))throw Error("Choose a hosted parent event")}
export function createConfiguredTournament(state,config){
 if(state.director!==true)throw Error("Enable director demo access");
 const {parentId,name,format="singles",elimination="double",rounders=4,seeding="random",partnerMode="top-bottom",roundLimit=0,feeAmount=0,seed=1234}=config;
 ensureParent(state,parentId);
 if(!String(name||"").trim())throw Error("Tournament name is required");
 if(!FORMAT_TYPES.includes(format))throw Error("Unsupported tournament format");
 if(!["single","double"].includes(elimination))throw Error("Choose single or double elimination");
 if(!SEED_MODES.includes(seeding)||!PARTNER_MODES.includes(partnerMode))throw Error("Invalid seeding or partner configuration");
 if(seeding==="rounder-ppr"&&!format.startsWith("swap-"))throw Error("Rounder PPR seeding is available only in swap formats");
 const maxRounds=Number(roundLimit),fee=Number(feeAmount);
 if(!Number.isInteger(maxRounds)||maxRounds<0||maxRounds>30)throw Error("Round cap must be 0 or 1–30");
 if(!Number.isInteger(Number(rounders))||Number(rounders)<1||Number(rounders)>20)throw Error("Rounders must be 1–20");
 if(!Number.isFinite(fee)||fee<0)throw Error("Entry fee cannot be negative");
 const id="format-t-"+Date.now()+"-"+state.events.length;
 const parent=state.eventGroups.find(x=>x.id===parentId);
 const t={id,parentEventId:parentId,name:String(name).trim(),venue:parent.venue,city:parent.city,date:parent.date,status:"Upcoming",format,elimination,rounders:Number(rounders),seeding,partnerMode,roundLimit:maxRounds,feeAmount:fee,randomSeed:Number(seed)||1234,ids:[],registeredIds:[],registration:[],fixedTeams:[],stage:"signup",frozen:false,fictional:true};
 state.events.push(t);return t;
}
export function setEventDoorFee(state,parentId,{amount=0,scope="event"}={}){
 if(state.director!==true)throw Error("Director access required");
 ensureParent(state,parentId);
 const n=Number(amount);
 if(!Number.isFinite(n)||n<0)throw Error("Invalid door fee");
 if(!["event","day"].includes(scope))throw Error("Door fee scope must be event or day");
 const event=state.eventGroups.find(x=>x.id===parentId);
 event.doorFee={amount:n,scope};event.doorPayments??={};return event.doorFee;
}
export function markDoorPaid(state,parentId,playerId,{date,paid=true}={}){
 if(state.director!==true)throw Error("Director access required");
 const parent=state.eventGroups.find(x=>x.id===parentId);if(!parent)throw Error("Event not found");
 parent.doorPayments??={};const key=String(playerId)+(parent.doorFee?.scope==="day"?":"+String(date||parent.date||"date-unspecified"):"");
 parent.doorPayments[key]=Boolean(paid);return key;
}
export function addSignup(state,tournamentId,playerId,roster){
 if(state.director!==true)throw Error("Director access required");
 const t=state.events.find(x=>x.id===tournamentId);if(!t)throw Error("Tournament not found");
 if(t.stage!=="signup"||t.status!=="Upcoming")throw Error("Registration is closed after launch");
 const player=roster.find(p=>String(p.id)===String(playerId));if(!player)throw Error("Player not found in roster");
 if(t.registeredIds.some(id=>Number(id)===Number(player.id)))throw Error("Player already registered");
 t.registeredIds.push(Number(player.id));t.registration??=[];
 t.registration.push({playerId:Number(player.id),paid:false,createdAt:new Date().toISOString()});
 return t.registration.at(-1);
}
export function setEntryPaid(state,tournamentId,playerId,paid=true){
 if(state.director!==true)throw Error("Director access required");
 const t=state.events.find(x=>x.id===tournamentId);const row=t?.registration?.find(r=>Number(r.playerId)===Number(playerId));
 if(!row)throw Error("Signup not found");row.paid=Boolean(paid);return row;
}
export function addFixedTeam(state,tournamentId,a,b){
 if(state.director!==true)throw Error("Director access required");
 const t=state.events.find(x=>x.id===tournamentId);if(!t||t.stage!=="signup"||t.format!=="fixed-doubles")throw Error("Only unstarted fixed doubles teams can be edited");
 const ids=[Number(a),Number(b)];
 if(ids[0]===ids[1]||ids.some(id=>!t.registeredIds.includes(id)))throw Error("Choose two different registered players");
 if((t.fixedTeams||[]).some(team=>ids.some(id=>team.includes(id))))throw Error("Player already belongs to another team");
 t.fixedTeams.push(ids);return ids;
}
export function setPlayerSeedMetrics(state,playerId,{points,stateRank,nationalRank}={}){
 if(state.director!==true)throw Error("Director access required");
 state.seedMetrics??={};const record=state.seedMetrics[String(playerId)]||{};
 for(const [name,value] of Object.entries({points,stateRank,nationalRank})){
  if(value==null||value==="")continue;
  const n=Number(value);if(!Number.isFinite(n)||n<0||(name!=="points"&&!Number.isInteger(n)))throw Error("Invalid "+name);
  record[name]=n;
 }
 state.seedMetrics[String(playerId)]=record;return record;
}
export function launchTournament(state,tournamentId){
 if(state.director!==true)throw Error("Director access required");
 const t=state.events.find(x=>x.id===tournamentId);
 if(!t||t.stage!=="signup"||t.status!=="Upcoming")throw Error("Only unstarted tournaments can launch");
 const players=uniqueIds(t.registeredIds||[]);
 if(players.length<3)throw Error("Register at least three players to start");
 let teams;
 if(t.format==="singles"||t.format==="swap-singles")teams=[...players];
 else if(t.format==="fixed-doubles"){
  teams=[...(t.fixedTeams||[])];const used=new Set(teams.flatMap(realIds));
  const left=players.filter(p=>!used.has(p));if(left.length===1)teams.push([left[0],SOLO_PARTNER_ID]);
  else if(left.length>1)throw Error("Assign all registered players to fixed teams (one solo seat allowed)");
 }else teams=pairTeams(players,"blind-draw",t.randomSeed);
 if(t.format.startsWith("swap-")){
  const matches=makeRounders(players,t.format,t.rounders,t.id,t.randomSeed);
  t.stage="rounders";t.status="Active";t.ids=teams;
  state.matches.push(...matches);return {stage:t.stage,matchCount:matches.length};
 }
 if(teams.length<(t.elimination==="double"?3:2))throw Error("This bracket requires at least "+(t.elimination==="double"?3:2)+" teams");
 const ordered=seedEntrants(teams,{mode:t.seeding,rankings:state.seedMetrics||{},seed:t.randomSeed});
 const positions=placeBracketSeeds(ordered);
 const bracket=t.elimination==="double"?makeDoubleElimination(positions,t.id):makeBracket(positions,t.id);
 t.ids=teams;t.stage="bracket";t.status="Active";state.matches.push(...bracket);
 return {stage:t.stage,matchCount:bracket.length};
}
export function advanceSwapToBracket(state,tournamentId){
 if(state.director!==true)throw Error("Director access required");
 const t=state.events.find(x=>x.id===tournamentId);
 if(!t||t.stage!=="rounders")throw Error("Tournament is not in rounders");
 const rounders=state.matches.filter(m=>m.eventId===t.id&&m.rounder);
 if(!rounders.length||rounders.some(m=>m.status!=="Final"))throw Error("Complete every rounder match before generating the seeded bracket");
 const standings=rounderStandings(state,t.id);
 if(standings.some(p=>p.ppr==null))throw Error("Each player must have scored rounds to determine swap standings");
 const ordered=standings.map(p=>p.id);
 let teams=t.format==="swap-singles"?ordered:pairTeams(ordered,t.partnerMode,t.randomSeed);
 if(teams.length<(t.elimination==="double"?3:2))throw Error("At least three teams needed for double elimination");
 const seeded=seedEntrants(teams,{mode:t.seeding,rankings:state.seedMetrics||{},seed:t.randomSeed,standings});
 const bracket=t.elimination==="double"?makeDoubleElimination(placeBracketSeeds(seeded),t.id+"-playoff"):makeBracket(placeBracketSeeds(seeded),t.id+"-playoff");
 // Bracket IDs use a distinct prefix but must retain the original child tournament ID.
 for(const m of bracket)m.eventId=t.id;
 t.ids=teams;t.stage="bracket";t.swapStandings=standings;
 state.matches.push(...bracket);return {stage:t.stage,matchCount:bracket.length,teams};
}
