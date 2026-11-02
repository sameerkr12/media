import {env} from '#runtime-env';
import {headers} from 'next/headers';
import {ADMIN_COOKIE,validAdminSession} from './admin-session';
export function adminSettings(){
 const password=env.ADMIN_PASSWORD||'';
 const secret=env.SUPABASE_SECRET_KEY||env.SUPABASE_SERVICE_ROLE_KEY||'';
 return {password,secret,configured:password.length>=12&&password.length<=256&&!!secret};
}
export async function adminUnlocked(userId:string){
 const settings=adminSettings();if(!settings.configured)return false;
 const cookie=(await headers()).get('cookie')?.split(';').map(s=>s.trim()).find(s=>s.startsWith(ADMIN_COOKIE+'='))?.slice(ADMIN_COOKIE.length+1);
 return validAdminSession(cookie,userId,settings.password,settings.secret);
}
