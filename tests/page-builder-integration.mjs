// Run against a local built Worker. All writes use disposable test creator records.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {supabaseEnvironment,supabaseHeaders} from '../scripts/supabase-env.mjs';
const base=process.env.TRACKER_TEST_URL||'http://127.0.0.1:8787';assert(['127.0.0.1','localhost'].includes(new URL(base).hostname));
const {url,key}=supabaseEnvironment(),nonce=crypto.randomUUID().slice(0,8),handle='qa_builder_'+nonce;
const admin={'oai-authenticated-user-id':'local_seedy','oai-authenticated-user-email':'seedy@sites.test',Origin:base,'Content-Type':'application/json'};
const own={...admin,'oai-authenticated-user-id':'qa_builder_'+nonce,'oai-authenticated-user-email':handle+'@example.test'};
let creatorId,otherCreatorId;
async function post(path,body,status=200,headers=admin){const r=await fetch(base+path,{method:'POST',headers,body:JSON.stringify(body),signal:AbortSignal.timeout(30000)});const json=await r.json();assert.equal(r.status,status,JSON.stringify(json));return json;}
async function state(headers=admin){let r;for(let i=0;i<3;i++){r=await fetch(base+'/api/tracker',{headers});if(r.ok)break;if(![500,503].includes(r.status))break;await new Promise(resolve=>setTimeout(resolve,300));}assert.equal(r.status,200);return r.json();}
async function page(headers=own,id=creatorId){const r=await fetch(base+'/api/page-builder?creator='+id,{headers});assert.equal(r.status,200,await r.clone().text());return r.json();}
const payload=data=>({creatorId,version:data.creator.edit_version,profile:data.creator,links:data.links});
async function remove(table,filter){const r=await fetch(url+'/rest/v1/'+table+'?'+new URLSearchParams(filter),{method:'DELETE',headers:supabaseHeaders(key)});assert(r.ok,'Cleanup failed: '+table);}
try{
 const password=readFileSync(new URL('../.dev.vars',import.meta.url),'utf8').split(/\r?\n/).find(s=>s.startsWith('ADMIN_PASSWORD=')).slice(15).replace(/^(["'])(.*)\1$/,'$2');
 const login=await fetch(base+'/api/admin/session',{method:'POST',headers:admin,body:JSON.stringify({password})});assert.equal(login.status,200);admin.Cookie=login.headers.get('set-cookie').split(';')[0];
 await post('/api/tracker',{action:'creator',name:'QA Builder',handle,email:own['oai-authenticated-user-email']});creatorId=(await state()).creators.find(c=>c.handle===handle).id;
 await post('/api/tracker',{action:'creator',name:'QA Other',handle:handle+'_other'});otherCreatorId=(await state()).creators.find(c=>c.handle===handle+'_other').id;
 for(const [slug,title] of [['first','First link'],['second','Second link']])await post('/api/tracker',{action:'create',creatorId,title,destination:'https://example.com/'+slug,slug:'qa-'+nonce+'-'+slug},200,own);
 await post('/api/tracker',{action:'create',creatorId:otherCreatorId,title:'Other link',destination:'https://example.org/',slug:'qa-'+nonce+'-other'});
 assert.equal((await fetch(base+'/api/page-builder?creator='+creatorId)).status,401);
 assert.equal((await fetch(base+'/api/page-builder?creator='+otherCreatorId,{headers:own})).status,403);
 const before=await page(),first=before.links.find(l=>l.title==='First link'),second=before.links.find(l=>l.title==='Second link');
 await post('/api/page-builder',{...payload(before),profile:{...before.creator,name:'Should not save'},links:before.links.map((l,i)=>i?l:{...l,tags:['1','2','3','4','5','6']})},400,own);
 await post('/api/page-builder',{...payload(before),links:[first,first]},400,own);
 const otherLink=(await state()).links.find(l=>l.creator_id===otherCreatorId);
 await post('/api/page-builder',{...payload(before),links:[...before.links,{...otherLink,tags:[]}]},403,own);
 assert.equal((await page()).creator.name,before.creator.name,'Forbidden save must be atomic');
 const newLink={id:crypto.randomUUID(),slug:'',title:'New link',brand:'Video',destination:'https://example.com/new',active:1,expires_at:null,tags:['New'],sort_order:0};
 const saved=await post('/api/page-builder',{...payload(before),profile:{...before.creator,name:'Updated QA',bio:'My custom page'},links:[{...second,tags:[' Recommended ','recommended','Video']},newLink,first]},200,own);
 assert.deepEqual(saved.links.map(l=>l.id),[second.id,newLink.id,first.id]);assert.deepEqual(saved.links[0].tags,['Recommended','Video']);assert.equal(saved.links[2].slug,first.slug);assert(saved.creator.edit_version>before.creator.edit_version);
 const publicHtml=await (await fetch(base+'/c/'+handle)).text();assert(publicHtml.includes('Recommended'));assert(publicHtml.indexOf('Second link')<publicHtml.indexOf('New link'));assert(publicHtml.indexOf('New link')<publicHtml.indexOf('First link'));
 await post('/api/page-builder',{...payload(saved),version:before.creator.edit_version},409,own);
 const collision=await fetch(url+'/rest/v1/rpc/empirex_save_page',{method:'POST',headers:supabaseHeaders(key),body:JSON.stringify({p_creator_id:creatorId,p_expected_version:saved.creator.edit_version,p_profile:{...saved.creator,name:'SHOULD ROLLBACK'},p_links:[...saved.links,{...newLink,id:crypto.randomUUID(),slug:otherLink.slug}]})});assert.equal(collision.status,409);assert.equal((await page()).creator.name,'Updated QA');assert.equal((await page()).creator.edit_version,saved.creator.edit_version);
 await post('/api/tracker',{action:'update',id:first.id,active:false},200,own);
 await post('/api/page-builder',payload(saved),409,own);
 const fresh=await page();assert(fresh.creator.edit_version>saved.creator.edit_version,'Legacy edits must invalidate builder snapshots');
 const hidden=await post('/api/page-builder',{...payload(fresh),links:fresh.links.map(l=>l.id===second.id?{...l,active:0}:l)},200,own);
 assert.equal((await fetch(base+'/r/'+second.slug,{redirect:'manual'})).status,410);
 assert(!(await (await fetch(base+'/c/'+handle)).text()).includes('Second link'));
 await post('/api/page-builder',{...payload(hidden),creatorId:otherCreatorId},403,own);
 console.log('PASS: page-builder ownership, tags, persistent order, new links, stable short URLs, atomic rollback, stale-save conflicts, legacy-edit versions and hidden links.');
}finally{
 for(const id of [creatorId,otherCreatorId].filter(Boolean)){const response=await fetch(url+'/rest/v1/links?'+new URLSearchParams({creator_id:'eq.'+id,select:'id'}),{headers:supabaseHeaders(key)});const links=await response.json();for(const link of links){await remove('clicks',{link_id:'eq.'+link.id});await remove('links',{id:'eq.'+link.id});}await remove('creators',{id:'eq.'+id});}
}
