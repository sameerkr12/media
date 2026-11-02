// Creates one disposable Supabase Auth account, tests the native Node server, then removes it.
import assert from 'node:assert/strict';
import {readFileSync,mkdirSync,cpSync} from 'node:fs';
import {spawn} from 'node:child_process';
import {supabaseEnvironment,supabaseHeaders} from '../scripts/supabase-env.mjs';
const local=Object.fromEntries(readFileSync(new URL('../.dev.vars',import.meta.url),'utf8').split(/\r?\n/).filter(s=>s.includes('=')).map(s=>{const i=s.indexOf('=');return[s.slice(0,i),s.slice(i+1).replace(/^(["'])(.*)\1$/,'$2')];}));
const {url,key}=supabaseEnvironment(),id=crypto.randomUUID(),email='qa-vps-'+id+'@example.test',accountPassword=crypto.randomUUID()+'aA1!';
const base='http://127.0.0.1:3001';let userId,child;
const created=await fetch(url+'/auth/v1/admin/users',{method:'POST',headers:supabaseHeaders(key),body:JSON.stringify({email,password:accountPassword,email_confirm:true})});assert(created.ok,'Could not create disposable test identity');userId=(await created.json()).id;
try{
 mkdirSync('.next-vps/standalone/.next-vps/static',{recursive:true});cpSync('.next-vps/static','.next-vps/standalone/.next-vps/static',{recursive:true});cpSync('public','.next-vps/standalone/public',{recursive:true});
 child=spawn(process.execPath,['.next-vps/standalone/server.js'],{env:{...process.env,...local,AUTH_MODE:'supabase',APP_URL:base,ADMIN_EMAIL:email,HOSTNAME:'127.0.0.1',PORT:'3001'},stdio:['ignore','pipe','pipe']});
 let ready=false;for(let attempt=0;attempt<60;attempt++){try{ready=(await fetch(base+'/api/health')).ok;}catch{}if(ready)break;await new Promise(r=>setTimeout(r,500));}assert(ready,'Standalone server did not start');
 const api=(path,options={})=>fetch(base+path,{...options,redirect:'manual',signal:AbortSignal.timeout(20000)});
 const headers={Origin:base,'Content-Type':'application/json'};
 assert.equal((await api('/api/tracker',{headers:{'oai-authenticated-user-id':'local_seedy','oai-authenticated-user-email':'seedy@sites.test'}})).status,401,'Header spoofing must not authenticate');
 const adminPage=await api('/admin');assert([307,302].includes(adminPage.status));assert(adminPage.headers.get('location').includes('/login'));
 const loginHtml=await (await api('/login')).text();const script=loginHtml.match(/src="([^"]*\/_next\/static\/[^"]+\.js[^"]*)"/)?.[1];assert(script,'Login page must include a client bundle');assert.equal((await api(script)).status,200,'Standalone client bundle must be served');assert.equal((await api('/')).status,200);assert.equal((await api('/assets/logo.png')).status,200);assert.equal((await api('/c/trade_x_sameer')).status,200);
 const login=await api('/api/auth/session',{method:'POST',headers,body:JSON.stringify({email,password:accountPassword})});assert.equal(login.status,200,await login.text());const authCookie=login.headers.get('set-cookie').split(';')[0];assert(login.headers.get('set-cookie').includes('HttpOnly'));
 assert.equal((await api('/api/tracker',{headers:{Cookie:authCookie}})).status,401,'Admin password gate must remain active');
 const unlock=await api('/api/admin/session',{method:'POST',headers:{...headers,Cookie:authCookie},body:JSON.stringify({password:local.ADMIN_PASSWORD})});assert.equal(unlock.status,200,await unlock.text());const adminCookie=unlock.headers.get('set-cookie').split(';')[0];
 const dashboard=await api('/api/tracker',{headers:{Cookie:authCookie+'; '+adminCookie}});assert.equal(dashboard.status,200);assert((await dashboard.json()).user.admin);
 const logout=await api('/signout-with-chatgpt',{headers:{Cookie:authCookie+'; '+adminCookie}});assert.equal(logout.status,303);assert.equal(logout.headers.getSetCookie().length,2);
 console.log('PASS: native VPS server, public assets/pages, forged-header denial, real Supabase sign-in, admin password gate, dashboard and logout.');
}finally{
 child?.kill();
 if(userId){const digest=Buffer.from(await crypto.subtle.digest('SHA-256',new TextEncoder().encode('admin-login:'+userId))).toString('hex');await fetch(url+'/rest/v1/admin_login_attempts?bucket=eq.'+digest,{method:'DELETE',headers:supabaseHeaders(key)});const removed=await fetch(url+'/auth/v1/admin/users/'+userId,{method:'DELETE',headers:supabaseHeaders(key)});assert(removed.ok,'Could not remove test Auth account');}
}
