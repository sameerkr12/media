export type BuilderProfile={id:string;name:string;handle:string;bio:string;theme:string;layout:string;font:string;edit_version:number};
export type BuilderLink={id:string;slug:string;title:string;brand:string;destination:string;active:number;expires_at:string|null;tags:string[];sort_order:number;created_at?:string};
export type BuilderData={creator:BuilderProfile;links:BuilderLink[]};
export type PageDraft={profile:BuilderProfile;links:BuilderLink[]};
export type DraftHistory={present:PageDraft;past:PageDraft[];future:PageDraft[]};
export type DraftAction={type:'change';draft:PageDraft}|{type:'reset';draft:PageDraft}|{type:'undo'}|{type:'redo'};
export function draftHistory(state:DraftHistory,action:DraftAction):DraftHistory{
 if(action.type==='reset')return {present:action.draft,past:[],future:[]};
 if(action.type==='change')return {present:action.draft,past:[...state.past,state.present].slice(-40),future:[]};
 if(action.type==='undo'&&state.past.length)return {present:state.past[state.past.length-1],past:state.past.slice(0,-1),future:[state.present,...state.future]};
 if(action.type==='redo'&&state.future.length)return {present:state.future[0],past:[...state.past,state.present].slice(-40),future:state.future.slice(1)};
 return state;
}
export function reorderLinks(links:BuilderLink[],from:number,to:number){
 if(from===to||from<0||to<0||from>=links.length||to>=links.length)return links;
 const next=[...links];const [link]=next.splice(from,1);next.splice(to,0,link);return next;
}
export function visibleBuilderLinks(links:BuilderLink[],now=Date.now()){
 return links.filter(link=>link.active===1&&(!link.expires_at||Date.parse(link.expires_at)>now));
}
export function normalizeTags(tags:string[]){
 const seen=new Set<string>();return tags.map(tag=>tag.trim()).filter(tag=>{const key=tag.toLowerCase();if(!tag||seen.has(key))return false;seen.add(key);return true;});
}
export function pageFingerprint(draft:PageDraft){return JSON.stringify(draft);}
