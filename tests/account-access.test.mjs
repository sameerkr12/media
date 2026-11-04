import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import ts from 'typescript';
async function moduleFrom(file,prefix){const source=prefix+'\n'+readFileSync(file,'utf8').replace(/^import .*;\r?\n/gm,'');return import('data:text/javascript;base64,'+Buffer.from(ts.transpileModule(source,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ES2022}}).outputText).toString('base64'));}
const tracker=await moduleFrom('lib/tracker.ts',`const env={ADMIN_EMAIL:'owner@test.invalid'};const getChatGPTUser=async()=>globalThis.actor;`);
globalThis.actor={userId:'owner',email:'OWNER@test.invalid'};assert.equal((await tracker.identity()).admin,true);
globalThis.actor={userId:'legacy-admin',email:'creator@test.invalid'};assert.equal((await tracker.identity()).admin,false);
globalThis.actor=null;await assert.rejects(()=>tracker.identity(),e=>e.status===401);
const api=await moduleFrom('app/api/tracker/route.ts',`const identity=async()=>globalThis.actor;const database=()=>({dashboard:async(scope,admin)=>({scope,admin})});const creatorFor=async()=>globalThis.assigned;const json=(body,status=200)=>Response.json(body,{status});class HttpError extends Error{};class SupabaseError extends Error{};`);
globalThis.actor={admin:false,displayName:'Creator'};globalThis.assigned={id:'own-page'};
let result=await (await api.GET(new Request('https://test.invalid/api/tracker?creator=someone-else'))).json();assert.equal(result.scope,'own-page');assert.equal(result.admin,false);
globalThis.assigned=null;result=await (await api.GET(new Request('https://test.invalid/api/tracker'))).json();assert.equal(result.notAssigned,true);assert.deepEqual(result.links,[]);
console.log('PASS: single owner role, legacy admin denied, unauthenticated denied, creator scope cannot be overridden, unassigned account has no data.');
