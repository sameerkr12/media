// Import an exported D1 backup. Existing Supabase IDs are left unchanged.
import {readFileSync} from 'node:fs';
import {supabaseEnvironment,supabaseHeaders} from './supabase-env.mjs';
const file=process.argv[2];if(!file)throw new Error('Usage: node scripts/import-supabase.mjs <backup.json>');
const {url,key}=supabaseEnvironment(),data=JSON.parse(readFileSync(file,'utf8'));
for(const table of ['admins','creators','links','clicks']){
 const rows=data[table];if(!Array.isArray(rows))throw new Error('Missing backup table: '+table);
 for(let i=0;i<rows.length;i+=200){
  const response=await fetch(url+'/rest/v1/'+table+'?on_conflict='+(table==='admins'?'user_id':'id'),{method:'POST',headers:{...supabaseHeaders(key),Prefer:'resolution=ignore-duplicates,return=minimal'},body:JSON.stringify(rows.slice(i,i+200)),signal:AbortSignal.timeout(30000)});
  if(!response.ok){const error=await response.json().catch(()=>({}));throw new Error('Import failed for '+table+' ('+(error.code||response.status)+')');}
 }
 console.log(table+': processed '+rows.length+' rows');
}
