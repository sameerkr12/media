import {database,HttpError,json} from './tracker';

// Self-contained schema for the /collab-admin panel. Created lazily so the panel
// works on a fresh database without a separate migration step.
const SCHEMA=[
 `CREATE TABLE IF NOT EXISTS collab_settings(key TEXT PRIMARY KEY,value TEXT NOT NULL)`,
 `CREATE TABLE IF NOT EXISTS collab_sessions(token_hash TEXT PRIMARY KEY,expires_at TEXT NOT NULL,created_at TEXT NOT NULL)`,
 `CREATE TABLE IF NOT EXISTS collab_creators(id TEXT PRIMARY KEY,name TEXT NOT NULL,handle TEXT NOT NULL DEFAULT '',platform TEXT NOT NULL DEFAULT 'Instagram',followers INTEGER,niche TEXT NOT NULL DEFAULT '',email TEXT NOT NULL DEFAULT '',phone TEXT NOT NULL DEFAULT '',notes TEXT NOT NULL DEFAULT '',created_at TEXT NOT NULL)`,
 `CREATE TABLE IF NOT EXISTS collab_deals(id TEXT PRIMARY KEY,brand TEXT NOT NULL,creator_id TEXT NOT NULL REFERENCES collab_creators(id),deliverables TEXT NOT NULL DEFAULT '',amount INTEGER NOT NULL DEFAULT 0,status TEXT NOT NULL DEFAULT 'upcoming',paid INTEGER NOT NULL DEFAULT 0,start_date TEXT,due_date TEXT,contact TEXT NOT NULL DEFAULT '',notes TEXT NOT NULL DEFAULT '',created_at TEXT NOT NULL,updated_at TEXT NOT NULL)`,
 `CREATE INDEX IF NOT EXISTS collab_deal_creator ON collab_deals(creator_id)`,
 `CREATE INDEX IF NOT EXISTS collab_deal_status ON collab_deals(status)`,
];
let ready=false;
export async function collabDb(){const db=database();if(!ready){await db.batch(SCHEMA.map(s=>db.prepare(s)));ready=true;}return db;}

export const STATUSES=['upcoming','active','pending','completed'] as const;
export const COOKIE='collab_session';
const ITERATIONS=100000,SESSION_DAYS=30,MAX_FAILS=5,LOCK_MS=5*60*1000;

const hex=(b:ArrayBuffer|Uint8Array)=>Array.from(new Uint8Array(b),x=>x.toString(16).padStart(2,'0')).join('');
const unhex=(s:string)=>Uint8Array.from(s.match(/../g)!,h=>parseInt(h,16)) as Uint8Array<ArrayBuffer>;
async function pbkdf2(password:string,salt:Uint8Array<ArrayBuffer>){const key=await crypto.subtle.importKey('raw',new TextEncoder().encode(password),'PBKDF2',false,['deriveBits']);return hex(await crypto.subtle.deriveBits({name:'PBKDF2',hash:'SHA-256',salt,iterations:ITERATIONS},key,256));}
async function sha256(s:string){return hex(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(s)));}
function safeEqual(a:string,b:string){if(a.length!==b.length)return false;let r=0;for(let i=0;i<a.length;i++)r|=a.charCodeAt(i)^b.charCodeAt(i);return r===0;}
export async function hashPassword(password:string){const salt=crypto.getRandomValues(new Uint8Array(16));return `${hex(salt)}:${await pbkdf2(password,salt)}`;}
async function verifyPassword(password:string,stored:string){const [salt,hash]=stored.split(':');return safeEqual(await pbkdf2(password,unhex(salt)),hash);}

export function validPassword(v:unknown){if(typeof v!=='string'||v.length<8||v.length>128)throw new HttpError(400,'Password must be 8–128 characters.');return v;}
async function setting(key:string){const db=await collabDb();return (await db.prepare('SELECT value FROM collab_settings WHERE key=?').bind(key).first<{value:string}>())?.value??null;}
export async function isSetUp(){return !!(await setting('password'));}

export async function createSession(){const db=await collabDb();const token=hex(crypto.getRandomValues(new Uint8Array(32)));const now=new Date();const exp=new Date(now.getTime()+SESSION_DAYS*864e5);
 await db.batch([db.prepare('DELETE FROM collab_sessions WHERE expires_at<?').bind(now.toISOString()),db.prepare('INSERT INTO collab_sessions(token_hash,expires_at,created_at) VALUES(?,?,?)').bind(await sha256(token),exp.toISOString(),now.toISOString())]);
 return `${COOKIE}=${token}; Path=/; Max-Age=${SESSION_DAYS*86400}; HttpOnly; Secure; SameSite=Strict`;}
export const clearCookie=`${COOKIE}=; Path=/; Max-Age=0; HttpOnly; Secure; SameSite=Strict`;
function tokenOf(request:Request){return request.headers.get('cookie')?.match(new RegExp(`(?:^|;\\s*)${COOKIE}=([a-f0-9]{64})(?:;|$)`))?.[1]??null;}
export async function sessionValid(request:Request){const t=tokenOf(request);if(!t)return false;const db=await collabDb();return !!(await db.prepare('SELECT 1 FROM collab_sessions WHERE token_hash=? AND expires_at>?').bind(await sha256(t),new Date().toISOString()).first());}
export async function endSession(request:Request,all=false){const db=await collabDb();if(all){await db.prepare('DELETE FROM collab_sessions').run();return;}const t=tokenOf(request);if(t)await db.prepare('DELETE FROM collab_sessions WHERE token_hash=?').bind(await sha256(t)).run();}

/** One-time setup: succeeds only while no password exists (atomic). */
export async function setupPassword(password:string){const db=await collabDb();const r=await db.prepare('INSERT OR IGNORE INTO collab_settings(key,value) VALUES(?,?)').bind('password',await hashPassword(password)).run();if(!r.meta.changes)throw new HttpError(409,'The password is already set. Please sign in.');}

export async function login(password:string){const db=await collabDb();
 const lock=JSON.parse((await setting('lock'))||'{"fails":0,"until":0}') as {fails:number;until:number};
 if(lock.until>Date.now())throw new HttpError(429,`Too many attempts. Try again in ${Math.ceil((lock.until-Date.now())/60000)} min.`);
 const stored=await setting('password');if(!stored)throw new HttpError(409,'Finish the one-time setup first.');
 const ok=await verifyPassword(password,stored);
 const next=ok?{fails:0,until:0}:{fails:lock.fails+1,until:lock.fails+1>=MAX_FAILS?Date.now()+LOCK_MS:0};
 if(!ok&&next.until)next.fails=0;
 await db.prepare('INSERT INTO collab_settings(key,value) VALUES(?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value').bind('lock',JSON.stringify(next)).run();
 if(!ok)throw new HttpError(401,'Incorrect password.');}

export async function changePassword(current:string,next:string){const db=await collabDb();const stored=await setting('password');if(!stored||!(await verifyPassword(current,stored)))throw new HttpError(401,'Current password is incorrect.');
 await db.batch([db.prepare('UPDATE collab_settings SET value=? WHERE key=?').bind(await hashPassword(next),'password'),db.prepare('DELETE FROM collab_sessions')]);}

export {json,HttpError};
