// Search across the fields people recognize on a tournament card.
export function matchesTournamentSearch(event,query){
 const terms=String(query??"").trim().toLowerCase().split(/\s+/).filter(Boolean);
 if(!terms.length)return true;
 const text=[event?.name,event?.city,event?.venue,event?.format,event?.date].filter(Boolean).join(" ").toLowerCase();
 return terms.every(term=>text.includes(term));
}
