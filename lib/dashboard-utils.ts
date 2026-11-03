export type Creator={id:string;name:string;handle:string;bio:string;theme:string;layout:string;font:string;link_count?:number;click_count?:number;email?:string|null;user_id?:string|null};
export type TrackedLink={id:string;slug:string;title:string;brand:string;creator_id:string;creator_name:string;creator_handle:string;destination:string;active:number;expires_at:string|null;created_at:string;clicks:number;visitors:number;last_click:string|null};
export type LinkState='all'|'Live'|'Paused'|'Expired';
export type LinkSort='recent'|'clicks'|'title'|'expiry';
export function linkStatus(link:TrackedLink,now=Date.now()){
 return !link.active?'Paused':link.expires_at&&new Date(link.expires_at).getTime()<=now?'Expired':'Live';
}
export function filterLinks(links:TrackedLink[],options:{query:string;creator:string;state:LinkState;sort:LinkSort},now=Date.now()){
 const query=options.query.trim().toLowerCase();
 return links.filter(l=>(options.creator==='all'||l.creator_id===options.creator)&&(options.state==='all'||linkStatus(l,now)===options.state)&&[l.title,l.brand,l.creator_name,l.slug,l.destination].join(' ').toLowerCase().includes(query)).sort((a,b)=>{
  if(options.sort==='clicks'&&a.clicks!==b.clicks)return b.clicks-a.clicks;
  if(options.sort==='title'){const title=a.title.localeCompare(b.title);if(title)return title;}
  if(options.sort==='expiry'){const x=a.expires_at?Date.parse(a.expires_at):Infinity,y=b.expires_at?Date.parse(b.expires_at):Infinity;if(x!==y)return x-y;}
  return b.created_at.localeCompare(a.created_at)||a.id.localeCompare(b.id);
 });
}

export function csvText(rows:unknown[][]){
 const quote=String.fromCharCode(34),dangerous=['=','+','-','@',String.fromCharCode(9),String.fromCharCode(13)];
 const lines=rows.map(row=>row.map(value=>{let text=String(value??'');if(dangerous.includes(text[0]))text="'"+text;return quote+text.replaceAll(quote,quote+quote)+quote;}).join(','));
 return String.fromCharCode(0xfeff)+lines.join(String.fromCharCode(13,10));
}
