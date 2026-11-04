import {checkOrigin,json,HttpError} from '../../../../lib/tracker';
import {authCookie,publicOrigin} from '../../../../lib/supabase-auth';
export const dynamic='force-dynamic';
export function POST(){return json({error:'Sign in with your account email and password at /login.'},410);}
export function DELETE(request:Request){try{checkOrigin(request);const response=json({ok:true});response.headers.set('Set-Cookie',authCookie('',publicOrigin(request),0));return response;}catch(error){return json({error:'Invalid sign-out request.'},error instanceof HttpError?error.status:400);}}
