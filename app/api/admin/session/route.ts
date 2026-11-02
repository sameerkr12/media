import {eligibleIdentity,requireAdmin,checkOrigin,database,HttpError,json} from '../../../../lib/tracker';
import {adminSettings} from '../../../../lib/admin-auth';
import {issueAdminSession,passwordMatches,adminCookie} from '../../../../lib/admin-session';
import {eq,SupabaseError} from '../../../../lib/supabase-rest';
export const dynamic='force-dynamic';
function failure(error:unknown){
 if(error instanceof HttpError)return json({error:error.message},error.status);
 if(error instanceof SyntaxError)return json({error:'Invalid request data.'},400);
 if(error instanceof SupabaseError&&['PGRST202','PGRST205','42P01'].includes(error.code))return json({error:'Admin login setup is incomplete. Apply the admin-login database migration.'},503);
 console.error('Admin session request failed',error);return json({error:'Could not unlock admin access. Please try again.'},503);
}
export async function POST(request:Request){try{
 checkOrigin(request);const user=await eligibleIdentity();requireAdmin(user);
 const settings=adminSettings();if(!settings.configured)throw new HttpError(503,'Set ADMIN_PASSWORD to 12–256 characters in the server environment.');
 if(Number(request.headers.get('content-length'))>4096)throw new HttpError(413,'Request is too large.');
 const raw=await request.text();if(raw.length>4096)throw new HttpError(413,'Request is too large.');const body=JSON.parse(raw) as {password?:unknown};if(!body||typeof body!=='object')throw new HttpError(400,'Invalid request data.');
 const digest=await crypto.subtle.digest('SHA-256',new TextEncoder().encode('admin-login:'+user.userId));
 const bucket=Array.from(new Uint8Array(digest)).map(b=>b.toString(16).padStart(2,'0')).join('');
 const db=database();if(!await db.loginAttempt(bucket)){const response=json({error:'Too many attempts. Try again in 15 minutes.'},429);response.headers.set('Retry-After','900');return response;}
 if(typeof body.password!=='string'||body.password.length>256||!await passwordMatches(body.password,settings.password))throw new HttpError(401,'Incorrect admin password.');
 await db.update('admin_login_attempts',{attempts:0,window_start:new Date().toISOString()},{bucket:eq(bucket)});
 const token=await issueAdminSession(user.userId,settings.password,settings.secret);
 const response=json({ok:true});response.headers.set('Set-Cookie',adminCookie(token,request.url));return response;
 }catch(error){return failure(error);}}
export async function DELETE(request:Request){try{
 checkOrigin(request);const response=json({ok:true});response.headers.set('Set-Cookie',adminCookie('',request.url,0));return response;
 }catch(error){return failure(error);}}
