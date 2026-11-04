import {env} from '#runtime-env';
import {passwordSignIn,authUser,authCookie,usingSupabaseAuth,publicOrigin} from '../../../../lib/supabase-auth';
import {checkOrigin,json,HttpError} from '../../../../lib/tracker';
export const dynamic='force-dynamic';
export async function POST(request:Request){try{
 checkOrigin(request);if(!usingSupabaseAuth())return json({error:'Use the platform sign-in.'},404);
 const raw=await request.text();if(raw.length>4096)return json({error:'Request too large.'},413);
 const body=JSON.parse(raw);if(typeof body?.email!=='string'||typeof body?.password!=='string'||body.email.length>254||body.password.length>256)return json({error:'Enter your email and password.'},400);
 if(!env.ADMIN_EMAIL||body.email.trim().toLowerCase()!==env.ADMIN_EMAIL.trim().toLowerCase())return json({error:'Only the main admin account can sign in.'},403);
 const session=await passwordSignIn(body.email.trim().toLowerCase(),body.password);
 if(!session||!await authUser(session.access_token))return json({error:'Invalid email or password, or email not confirmed.'},401);
 const response=json({ok:true});response.headers.append('Set-Cookie',authCookie(session.access_token,publicOrigin(request),session.expires_in));return response;
 }catch(error){if(error instanceof HttpError)return json({error:error.message},error.status);if(error instanceof SyntaxError)return json({error:'Invalid request data.'},400);return json({error:'Sign-in is unavailable. Check the server authentication settings.'},503);}}
