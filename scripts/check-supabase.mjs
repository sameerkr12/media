import {supabaseEnvironment,supabaseHeaders} from './supabase-env.mjs';
const {url,key}=supabaseEnvironment();
const response=await fetch(url+'/rest/v1/rpc/empirex_dashboard',{method:'POST',headers:supabaseHeaders(key),body:JSON.stringify({p_scope:null,p_admin:true}),signal:AbortSignal.timeout(15000)});
if(!response.ok){const error=await response.json().catch(()=>({}));throw new Error('Supabase schema check failed ('+(error.code||response.status)+'). Apply supabase/migrations/202611020001_empirex.sql.');}
const result=await response.json();
console.log('Supabase connected. Creators: '+result.creators.length+'; links: '+result.links.length);
