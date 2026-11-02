import {env} from '#runtime-env';
export const AUTH_COOKIE='ex_auth_token';
export function usingSupabaseAuth(){return env.AUTH_MODE==='supabase';}
function configuration(){const key=env.SUPABASE_PUBLISHABLE_KEY||env.SUPABASE_ANON_KEY;const url=env.SUPABASE_URL;if(!key||!url)throw new Error('Supabase authentication is not configured.');return {url,key};}
export async function authUser(token:string){
 const {url,key}=configuration();const response=await fetch(url+'/auth/v1/user',{headers:{apikey:key,Authorization:'Bearer '+token},cache:'no-store',signal:AbortSignal.timeout(15000)});
 if(!response.ok)return null;const user=await response.json() as {id:string;email?:string;email_confirmed_at?:string;user_metadata?:{full_name?:string}};
 if(!user.id||!user.email||!user.email_confirmed_at)return null;
 return {userId:user.id,email:user.email.toLowerCase().trim(),displayName:user.user_metadata?.full_name||user.email,fullName:user.user_metadata?.full_name||null};
}
export async function passwordSignIn(email:string,password:string){
 const {url,key}=configuration();const response=await fetch(url+'/auth/v1/token?grant_type=password',{method:'POST',headers:{apikey:key,'Content-Type':'application/json'},body:JSON.stringify({email,password}),cache:'no-store',signal:AbortSignal.timeout(15000)});
 if(!response.ok)return null;const data=await response.json() as {access_token:string;expires_in:number};return data;
}
export function authCookie(token:string,url:string,seconds:number){return `${AUTH_COOKIE}=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${Math.max(0,Math.min(seconds,3600))}${new URL(url).protocol==='https:'?'; Secure':''}`;}
export function publicOrigin(request:Request){return env.APP_URL?new URL(env.APP_URL).origin:new URL(request.url).origin;}
