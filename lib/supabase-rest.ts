// Server-only REST adapter. Credentials never enter the browser bundle.
export class SupabaseError extends Error {
 constructor(public code:string,public status:number){super(`Supabase request failed (${code})`);}
}
export type Creator={id:string;name:string;handle:string;email:string|null;user_id:string|null;bio:string;theme:string;layout:string;font:string;created_at:string};
export type Link={id:string;slug:string;title:string;brand:string;creator_id:string;destination:string;active:number;expires_at:string|null;created_at:string};
type Table='creators'|'links'|'admins'|'clicks'|'admin_login_attempts';
// Individual eq filters are literal values; URLSearchParams encodes them.
export const eq=(value:string)=>'eq.'+value;
export function createSupabaseDatabase(url:string,key:string){
 const base=new URL(url);if(base.protocol!=='https:'&&!['127.0.0.1','localhost'].includes(base.hostname))throw new Error('Supabase requires HTTPS');
 if(!key)throw new Error('Supabase server key is not configured');
 if(!key.startsWith('sb_secret_')){
  try{if(JSON.parse(atob(key.split('.')[1])).role!=='service_role')throw new Error();}
  catch{throw new Error('Supabase requires a secret or service-role server key, not an anon key');}
 }
 async function request<T>(path:string,method='GET',body?:unknown,query:Record<string,string>={},prefer?:string):Promise<T>{
  const target=new URL('/rest/v1/'+path,base);target.search=new URLSearchParams(query).toString();
  const headers:Record<string,string>={apikey:key,'Content-Type':'application/json'};
  if(!key.startsWith('sb_secret_'))headers.Authorization='Bearer '+key;
  if(prefer)headers.Prefer=prefer;
  const response=await fetch(target,{method,headers,body:body===undefined?undefined:JSON.stringify(body),cache:'no-store',signal:AbortSignal.timeout(15000)});
  if(!response.ok){const error=await response.json().catch(()=>({})) as {code?:string};throw new SupabaseError(error.code||String(response.status),response.status);}
  const text=await response.text();return (text?JSON.parse(text):undefined) as T;
 }
 return {
  async list<T>(table:Table,query:Record<string,string>={}){return request<T[]>(table,'GET',undefined,query);},
  async one<T>(table:Table,query:Record<string,string>){return (await request<T[]>(table,'GET',undefined,{...query,limit:'1'}))[0]??null;},
  async insert(table:Table,rows:unknown,ignoreDuplicates=false){await request(table,'POST',rows,ignoreDuplicates?{on_conflict:table==='admins'?'user_id':'id'}:{},'return=minimal'+(ignoreDuplicates?',resolution=ignore-duplicates':''));},
  async update<T>(table:Table,values:unknown,query:Record<string,string>){return request<T[]>(table,'PATCH',values,query,'return=representation');},
  async loginAttempt(bucket:string){return request<boolean>('rpc/empirex_admin_login_attempt','POST',{p_bucket:bucket});},
  async dashboard(scope:string|null,admin:boolean){return request<{creators:Creator[];links:Link[];daily:unknown[];breakdown:unknown[]}>('rpc/empirex_dashboard','POST',{p_scope:scope,p_admin:admin});},
 };
}
