import {setCreatorPassword,strongPassword} from '../../../lib/account-management';
import {env} from '#runtime-env';
import {publicOrigin} from '../../../lib/supabase-auth';
import {eq,SupabaseError,type Link} from '../../../lib/supabase-rest';
import {themes,layouts,fonts} from '../../../lib/appearance';
import {identity,database,requireAdmin,checkOrigin,clean,destination,expiry,emailAddress,bootstrap,creatorFor,json,HttpError} from '../../../lib/tracker';
export const dynamic='force-dynamic';
function failure(e:unknown){if(e instanceof SyntaxError)return json({error:'Invalid request data.'},400);if(e instanceof HttpError)return json({error:e.message},e.status);if(e instanceof SupabaseError&&e.code==='23505')return json({error:'That short code or creator email is already in use.'},409);if(e instanceof SupabaseError&&['PGRST205','PGRST202','42P01','42883'].includes(e.code))return json({error:'Supabase setup is incomplete. Apply the database migration.'},503);console.error('Tracker request failed',e);return json({error:'We could not complete this request. Please try again.'},500);}
export async function GET(request:Request){try{
 const user=await identity(),db=database();const creator=user.admin?null:await creatorFor(user);const preview=user.admin?new URL(request.url).searchParams.get('creator'):null;const scope=preview||(user.admin?null:creator?.id);
 if(!user.admin&&!creator)return json({user:{name:user.displayName,admin:false},creators:[],links:[],daily:[],breakdown:[],notAssigned:true});
 const dashboard=await db.dashboard(scope||null,user.admin);
 return json({...dashboard,user:{name:user.displayName,admin:user.admin},notAssigned:false,contextCreatorId:scope});
}catch(e){return failure(e);}}
export async function POST(request:Request){try{
 checkOrigin(request);const user=await identity();const b=await request.json() as Record<string,unknown>;const db=database();const own=user.admin?null:await creatorFor(user);
 if(!user.admin&&!own)throw new HttpError(403,'Your account has not been assigned to a creator page.');
 if(b.action==='bootstrap'){await bootstrap(user);return json({ok:true});}
 if(b.action==='creator'){
  requireAdmin(user);const name=clean(b.name,80),handle=clean(b.handle,50).replace(/^@/,'').toLowerCase();if(!/^[A-Za-z0-9._]+$/.test(handle))throw new HttpError(400,'Use an Instagram handle without a URL.');if(await db.one('creators',{handle:eq(handle.toLowerCase())}))throw new HttpError(409,'A page already exists for this handle.');
  await db.insert('creators',{id:crypto.randomUUID(),name,handle,bio:clean(b.bio||'',240,false),email:emailAddress(b.email),created_at:new Date().toISOString()});return json({ok:true});
 }
 if(b.action==='creatorEmail'){requireAdmin(user);const id=clean(b.id,60);const email=emailAddress(b.email);const old=await db.one('creators',{id:eq(id),select:'id'});if(!old)throw new HttpError(404,'Creator not found.');let accountId:string|null=null;if(b.password){if(!email)throw new HttpError(400,'Enter the creator email first.');if(email===env.ADMIN_EMAIL?.toLowerCase().trim())throw new HttpError(403,'Use Forgot password to reset the owner account.');const duplicate=await db.one<{id:string}>('creators',{email:eq(email),select:'id'});if(duplicate&&duplicate.id!==id)throw new HttpError(409,'Email belongs to another creator.');accountId=await setCreatorPassword(email,strongPassword(b.password));}await db.update('creators',{email,user_id:accountId},{id:eq(id)});return json({ok:true});}
 if(b.action==='appearance'){
  const id=clean(b.id,60);if(!user.admin&&id!==own?.id)throw new HttpError(403,'You can only style your own page.');
  if(!themes.some(t=>t.id===b.theme)||!layouts.some(t=>t.id===b.layout)||!fonts.some(t=>t.id===b.font))throw new HttpError(400,'Choose a supported theme, button style and font.');
  const result=await db.update('creators',{theme:b.theme,layout:b.layout,font:b.font},{id:eq(id)});if(!result.length)throw new HttpError(404,'Creator not found.');return json({ok:true});
 }
 if(b.action==='profile'){const id=clean(b.id,60);if(!user.admin&&id!==own?.id)throw new HttpError(403,'You can only edit your own page.');await db.update('creators',{name:clean(b.name,80),bio:clean(b.bio||'',240,false)},{id:eq(id)});return json({ok:true});}
 if(b.action==='create'){
  const creatorId=clean(b.creatorId,60);if(!user.admin&&creatorId!==own?.id)throw new HttpError(403,'You can only add links to your own page.');if(!await db.one('creators',{id:eq(creatorId),select:'id'}))throw new HttpError(400,'Choose a creator from your roster.');
  const slug=b.slug?clean(b.slug,48).toLowerCase():crypto.randomUUID().replaceAll('-','').slice(0,9);if(!/^[a-z0-9][a-z0-9-]{2,47}$/.test(slug))throw new HttpError(400,'Use 3–48 lowercase letters, numbers or hyphens for the short code.');
  await db.insert('links',{id:crypto.randomUUID(),slug,title:clean(b.title,120),brand:clean(b.brand||'Website',80),creator_id:creatorId,destination:destination(b.destination,publicOrigin(request)),active:1,expires_at:expiry(b.expiresAt),created_at:new Date().toISOString()});return json({ok:true});
 }
 if(b.action==='bulkStatus'){
  if(!Array.isArray(b.ids)||!b.ids.length||b.ids.length>100||b.ids.some(id=>typeof id!=='string'||!/^[A-Za-z0-9_-]{1,60}$/.test(id))||typeof b.active!=='boolean')throw new HttpError(400,'Select 1–100 valid links and an active status.');
  const ids=[...new Set(b.ids as string[])],idFilter='in.('+ids.join(',')+')';
  const rows=await db.list<Link>('links',{id:idFilter,select:'id,creator_id'});
  if(rows.length!==ids.length)throw new HttpError(404,'One or more selected links no longer exist.');
  if(!user.admin&&rows.some(link=>link.creator_id!==own?.id))throw new HttpError(403,'You can only edit your own links.');
  const updated=await db.update('links',{active:b.active?1:0},{id:idFilter,...(!user.admin?{creator_id:eq(own!.id)}:{})});
  return json({ok:true,updated:updated.length});
 }
 if(b.action==='update'){
  const id=clean(b.id,60);const old=await db.one<Link>('links',{id:eq(id)});if(!old)throw new HttpError(404,'Link not found.');if(!user.admin&&old.creator_id!==own?.id)throw new HttpError(403,'You can only edit your own links.');if(typeof b.active!=='boolean')throw new HttpError(400,'Choose an active status.');
  await db.update('links',{active:b.active?1:0,destination:b.destination===undefined?old.destination:destination(b.destination,publicOrigin(request)),expires_at:b.expiresAt===undefined?old.expires_at:expiry(b.expiresAt),title:b.title===undefined?old.title:clean(b.title,120),brand:b.brand===undefined?old.brand:clean(b.brand||'Website',80)},{id:eq(id)});return json({ok:true});
 }
 throw new HttpError(400,'Unknown action.');
}catch(e){return failure(e);}}
