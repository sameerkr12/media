// Run against a local built Worker configured for Supabase. Uses disposable QA rows only.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {supabaseEnvironment,supabaseHeaders} from '../scripts/supabase-env.mjs';
const base=process.env.TRACKER_TEST_URL||'http://127.0.0.1:8787';
assert(['127.0.0.1','localhost'].includes(new URL(base).hostname),'Local test server required');
const {url,key}=supabaseEnvironment(),id=crypto.randomUUID().slice(0,8),handle='qa_'+id;
const admin={'oai-authenticated-user-id':'local_seedy','oai-authenticated-user-email':'seedy@sites.test',Origin:base,'Content-Type':'application/json'};
const own={...admin,'oai-authenticated-user-id':'qa_creator_'+id,'oai-authenticated-user-email':handle+'@example.test'};
const stranger={...admin,'oai-authenticated-user-id':'qa_stranger_'+id,'oai-authenticated-user-email':'stranger_'+id+'@example.test'};
let creatorId,linkId,otherCreatorId,otherLinkId;
async function call(path,options={}){return fetch(base+path,{...options,signal:AbortSignal.timeout(30000)});}
async function post(body,status=200,headers=admin){const r=await call('/api/tracker',{method:'POST',headers,body:JSON.stringify(body)});const j=await r.json();assert.equal(r.status,status,JSON.stringify(j));return j;}
async function state(headers=admin,scope=''){const r=await call('/api/tracker'+scope,{headers});assert.equal(r.status,200);return r.json();}
async function remove(table,filter){const r=await fetch(url+'/rest/v1/'+table+'?'+new URLSearchParams(filter),{method:'DELETE',headers:supabaseHeaders(key),signal:AbortSignal.timeout(15000)});assert(r.ok,'QA cleanup failed: '+table);}
try{
 assert.equal((await call('/api/tracker')).status,401);
 const envPassword=readFileSync(new URL('../.dev.vars',import.meta.url),'utf8').split(/\r?\n/).find(s=>s.startsWith('ADMIN_PASSWORD='))?.slice(15).replace(/^(["'])(.*)\1$/,'$2');
 const password=process.env.ADMIN_PASSWORD||envPassword;
 assert(password,'Set ADMIN_PASSWORD for the integration suite.');
 const unlock=await call('/api/admin/session',{method:'POST',headers:admin,body:JSON.stringify({password})});assert.equal(unlock.status,200,'Admin unlock failed');
 admin.Cookie=unlock.headers.get('set-cookie').split(';')[0];

 await post({action:'creator',name:'QA Creator',handle,email:own['oai-authenticated-user-email']});
 creatorId=(await state()).creators.find(c=>c.handle===handle).id;
 await post({action:'creator',name:'QA Other',handle:handle+'_other'});
 otherCreatorId=(await state()).creators.find(c=>c.handle===handle+'_other').id;
 const slug='qa-'+id;
 await post({action:'create',creatorId,title:'QA custom title',destination:'https://example.com/',slug},200,own);
 linkId=(await state(own)).links.find(l=>l.slug===slug).id;
 await post({action:'create',creatorId:otherCreatorId,title:'Other link',destination:'https://example.org/',slug:slug+'-other'});
 otherLinkId=(await state()).links.find(l=>l.slug===slug+'-other').id;
 await post({action:'create',creatorId,title:'duplicate',destination:'https://example.com/',slug},409,own);
 await post({action:'appearance',id:creatorId,theme:'midnight',layout:'pill',font:'editorial'},200,own);
 await post({action:'appearance',id:creatorId,theme:'invalid',layout:'pill',font:'modern'},400,own);
 await post({action:'appearance',id:otherCreatorId,theme:'pearl',layout:'rounded',font:'modern'},403,own);
 await post({action:'profile',id:creatorId,name:'No',bio:''},403,stranger);
 const html=await (await call('/c/'+handle)).text();assert(html.includes('theme-midnight layout-pill font-editorial'));assert(html.includes('QA custom title'));assert(!html.includes(own['oai-authenticated-user-email']));
 const visitorHeaders={'User-Agent':'Mozilla/5.0 iPhone Mobile',Referer:'https://www.instagram.com/'};
 const first=await call('/r/'+slug,{headers:visitorHeaders,redirect:'manual'});assert.equal(first.status,302);assert.equal(first.headers.get('location'),'https://example.com/');
 const cookie=first.headers.get('set-cookie').split(';')[0];
 await call('/r/'+slug,{headers:{...visitorHeaders,Cookie:cookie},redirect:'manual'});
 await call('/r/'+slug,{method:'HEAD',redirect:'manual'});
 await call('/r/'+slug,{headers:{'User-Agent':'WhatsApp/2.0'},redirect:'manual'});
 await call('/r/'+slug,{headers:{'X-Purpose':'prefetch'},redirect:'manual'});
 const scoped=await state(admin,'?creator='+creatorId),link=scoped.links.find(l=>l.id===linkId);
 assert.equal(link.clicks,2);assert.equal(link.visitors,1);assert(link.last_click);assert(scoped.links.every(l=>l.creator_id===creatorId));
 assert.equal(scoped.daily.reduce((n,d)=>n+d.clicks,0),2);assert.equal(scoped.breakdown.reduce((n,d)=>n+d.clicks,0),2);
 assert((await state(own,'?creator='+otherCreatorId)).links.every(l=>l.creator_id===creatorId));
 await post({action:'bulkStatus',ids:[],active:false},400,own);
 await post({action:'bulkStatus',ids:[linkId,otherLinkId],active:false},403,own);
 assert.equal((await state()).links.find(l=>l.id===otherLinkId).active,1,'Denied bulk request must not update other creators');
 await post({action:'bulkStatus',ids:[linkId],active:false},200,own);
 assert.equal((await state(own)).links.find(l=>l.id===linkId).active,0);
 await post({action:'bulkStatus',ids:[linkId],active:true},200,own);
 await post({action:'bulkStatus',ids:[linkId,otherLinkId],active:false});
 await post({action:'bulkStatus',ids:[linkId,otherLinkId],active:true});
 await post({action:'update',id:otherLinkId,active:false},403,own);
 await post({action:'update',id:linkId,active:false},200,own);assert.equal((await call('/r/'+slug,{redirect:'manual'})).status,410);
 await post({action:'creatorEmail',id:creatorId,email:''});assert((await state(own)).notAssigned);
 console.log('PASS: bulk pause/resume and mixed-creator authorization, Supabase CRUD, titles, themes, redirects, click counts, unique visitors, bot/HEAD/prefetch exclusions, scoped analytics, creator authorization and access revocation.');
}finally{
 for(const id of [linkId,otherLinkId].filter(Boolean)){await remove('clicks',{link_id:'eq.'+id});await remove('links',{id:'eq.'+id});}
 for(const id of [creatorId,otherCreatorId].filter(Boolean))await remove('creators',{id:'eq.'+id});
}
