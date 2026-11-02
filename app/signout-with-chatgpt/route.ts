import {authCookie,publicOrigin} from '../../lib/supabase-auth';
import {adminCookie} from '../../lib/admin-session';
export function GET(request:Request){const origin=publicOrigin(request);const headers=new Headers({Location:new URL('/',origin).href,'Cache-Control':'no-store'});headers.append('Set-Cookie',authCookie('',origin,0));headers.append('Set-Cookie',adminCookie('',origin,0));return new Response(null,{status:303,headers});}
