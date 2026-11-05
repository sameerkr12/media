import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';import ts from 'typescript';
const source=`const env={SUPABASE_URL:'https://test.invalid',SUPABASE_SECRET_KEY:'sb_secret_test'};class HttpError extends Error{constructor(status,message){super(message);this.status=status;}};`+readFileSync('lib/account-management.ts','utf8').replace(/^import .*;\r?\n/gm,'');
const code=ts.transpileModule(source,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ES2022}}).outputText;const mod=await import('data:text/javascript;base64,'+Buffer.from(code).toString('base64'));assert.throws(()=>mod.strongPassword('short'));console.log('PASS: password length validation.');

const originalFetch=globalThis.fetch;
try{for(const [code,match] of [['over_email_send_rate_limit',/Email sending/],['over_request_rate_limit',/authentication requests/]]){globalThis.fetch=async()=>Response.json({code},{status:429});await assert.rejects(()=>mod.authRequest('signup','POST',{},undefined,true),error=>error.status===429&&match.test(error.message));}}finally{globalThis.fetch=originalFetch;}
console.log('PASS: email and request rate limits have distinct messages.');
