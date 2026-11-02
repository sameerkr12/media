import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {supabaseEnvironment,supabaseHeaders} from '../scripts/supabase-env.mjs';
const base=process.env.TRACKER_TEST_URL||'http://127.0.0.1:8787';assert(['localhost','127.0.0.1'].includes(new URL(base).hostname));
const local=Object.fromEntries(readFileSync(new URL('../.dev.vars',import.meta.url),'utf8').split(/\r?\n/).filter(s=>s.includes('=')).map(s=>{const i=s.indexOf('=');return[s.slice(0,i),s.slice(i+1).replace(/^(["'])(.*)\1$/,'$2')];}));
const password=process.env.ADMIN_PASSWORD||local.ADMIN_PASSWORD;assert(password?.length>=12,'Configure ADMIN_PASSWORD before testing');
const {url,key}=supabaseEnvironment(),id='qa-admin-password-'+crypto.randomUUID();
const headers={'oai-authenticated-user-id':id,'oai-authenticated-user-email':id+'@example.test',Origin:base,'Content-Type':'application/json',Connection:'close'};
const bucket=Buffer.from(await crypto.subtle.digest('SHA-256',new TextEncoder().encode('admin-login:'+id))).toString('hex');
async function api(path,options={}){return fetch(base+path,{...options,headers:{...headers,...options.headers},redirect:'manual',signal:AbortSignal.timeout(30000)});}
async function login(candidate,extraHeaders={}){return api('/api/admin/session',{method:'POST',headers:extraHeaders,body:JSON.stringify({password:candidate})});}
async function cleanup(table,column,value){const r=await fetch(url+'/rest/v1/'+table+'?'+new URLSearchParams({[column]:'eq.'+value}),{method:'DELETE',headers:supabaseHeaders(key)});assert(r.ok,'QA cleanup failed');}
const created=await fetch(url+'/rest/v1/admins',{method:'POST',headers:supabaseHeaders(key),body:JSON.stringify({user_id:id})});assert(created.ok,'QA admin setup failed');
try{
 assert.equal((await api('/api/tracker')).status,401,'Admin API must require password session');
 assert.equal((await api('/api/tracker',{method:'POST',body:JSON.stringify({action:'bootstrap'})})).status,401,'Admin mutations must be locked');
 const page=await api('/admin');assert.equal(page.status,200);assert((await page.text()).includes('Unlock admin'));
 const preview=await api('/creator');assert([302,307].includes(preview.status));assert(preview.headers.get('location').endsWith('/admin'));
 const wrong=await login('incorrect-password');assert.equal(wrong.status,401,await wrong.text());
 const unlocked=await login(password);assert.equal(unlocked.status,200);const setCookie=unlocked.headers.get('set-cookie');assert(setCookie.includes('HttpOnly'));assert(setCookie.includes('SameSite=Strict'));
 const cookie=setCookie.split(';')[0];assert.equal((await api('/api/tracker',{headers:{Cookie:cookie}})).status,200);
 assert.equal((await api('/api/tracker',{headers:{Cookie:cookie+'bad'}})).status,401);
 const locked=await api('/api/admin/session',{method:'DELETE',headers:{Cookie:cookie}});assert.equal(locked.status,200);assert(locked.headers.get('set-cookie').includes('Max-Age=0'));
 assert.equal((await api('/api/tracker')).status,401);
 for(let i=0;i<5;i++)assert.equal((await login('incorrect-password')).status,401);
 const limited=await login(password);assert.equal(limited.status,429);assert.equal(limited.headers.get('retry-after'),'900');
 const denied=await login(password,{'oai-authenticated-user-id':'qa-non-admin-'+id,'oai-authenticated-user-email':'non-admin@example.test'});assert.equal(denied.status,403);
 assert.equal((await login(password,{Origin:'https://unrelated.example'})).status,403);
 console.log('PASS: locked page/API/mutations, creator-preview protection, CSRF, invalid password, secure session, tampering, logout, durable five-attempt limit and non-admin denial.');
}finally{await cleanup('admin_login_attempts','bucket',bucket);await cleanup('admins','user_id',id);}
