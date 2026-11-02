// Pure Web Crypto helpers, shared by the server and security tests.
export const ADMIN_COOKIE='ex_admin_session';
export const ADMIN_SESSION_SECONDS=8*60*60;
const encoder=new TextEncoder();
function encode(bytes:Uint8Array){return btoa(String.fromCharCode(...bytes)).replaceAll('+','-').replaceAll('/','_').replace(/=+$/,'');}
function decode(text:string){return Uint8Array.from(atob(text.replaceAll('-','+').replaceAll('_','/')),c=>c.charCodeAt(0));}
async function key(password:string,secret:string){return crypto.subtle.importKey('raw',encoder.encode(JSON.stringify(['empirex-admin-v1',password,secret])),{name:'HMAC',hash:'SHA-256'},false,['sign','verify']);}
export async function passwordMatches(candidate:string,expected:string){
 const [a,b]=await Promise.all([candidate,expected].map(s=>crypto.subtle.digest('SHA-256',encoder.encode(s))));
 const x=new Uint8Array(a),y=new Uint8Array(b);let different=0;for(let i=0;i<x.length;i++)different|=x[i]^y[i];return different===0;
}
export async function issueAdminSession(userId:string,password:string,secret:string,now=Date.now()){
 const payload=encode(encoder.encode(JSON.stringify({sub:userId,exp:Math.floor(now/1000)+ADMIN_SESSION_SECONDS,v:1,nonce:crypto.randomUUID()})));
 const signature=await crypto.subtle.sign('HMAC',await key(password,secret),encoder.encode(payload));
 return payload+'.'+encode(new Uint8Array(signature));
}
export async function validAdminSession(token:string|undefined,userId:string,password:string,secret:string,now=Date.now()){
 if(!token||token.length>4096||!password||!secret)return false;
 try{const parts=token.split('.');if(parts.length!==2)return false;
 const [payload,signature]=parts;
 if(!await crypto.subtle.verify('HMAC',await key(password,secret),decode(signature),encoder.encode(payload)))return false;
 const data=JSON.parse(new TextDecoder().decode(decode(payload)));
 return data.v===1&&data.sub===userId&&Number.isSafeInteger(data.exp)&&data.exp>Math.floor(now/1000)&&data.exp<=Math.floor(now/1000)+ADMIN_SESSION_SECONDS;
 }catch{return false;}
}
export function adminCookie(token:string,url:string,maxAge=ADMIN_SESSION_SECONDS){return `${ADMIN_COOKIE}=${token}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${maxAge}${new URL(url).protocol==='https:'?'; Secure':''}`;}
