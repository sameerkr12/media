import {themes,layouts,fonts} from '../../../lib/appearance';
import {identity,database,requireAdmin,checkOrigin,clean,destination,expiry,emailAddress,bootstrap,creatorFor,json,HttpError} from '../../../lib/tracker';
export const dynamic='force-dynamic';
function failure(e:unknown){if(e instanceof SyntaxError)return json({error:'Invalid request data.'},400);if(e instanceof HttpError)return json({error:e.message},e.status);if(String(e).includes('UNIQUE constraint'))return json({error:'That short code or creator email is already in use.'},409);console.error('Tracker request failed',e);return json({error:'We could not complete this request. Please try again.'},500);}
export async function GET(request:Request){try{
 const user=await identity(),db=database();const creator=user.admin?null:await creatorFor(user);const preview=user.admin?new URL(request.url).searchParams.get('creator'):null;const scope=preview||(user.admin?null:creator?.id);
 if(!user.admin&&!creator)return json({user:{name:user.displayName,admin:false},creators:[],links:[],daily:[],breakdown:[],notAssigned:true});
 const where=scope?' WHERE l.creator_id=?':'';const values=scope?[scope]:[];
 const creatorRows=user.admin?(await db.prepare('SELECT c.id,c.name,c.handle,c.bio,c.email,c.user_id,c.theme,c.layout,c.font,(SELECT COUNT(*) FROM links l WHERE l.creator_id=c.id) AS link_count,(SELECT COUNT(*) FROM clicks k JOIN links l ON l.id=k.link_id WHERE l.creator_id=c.id) AS click_count FROM creators c ORDER BY c.created_at,c.id').all()).results:[creator];
 const linkRows=(await db.prepare(`SELECT l.*,c.name AS creator_name,c.handle AS creator_handle,(SELECT COUNT(*) FROM clicks k WHERE k.link_id=l.id) AS clicks,(SELECT COUNT(DISTINCT visitor) FROM clicks k WHERE k.link_id=l.id) AS visitors,(SELECT MAX(created_at) FROM clicks k WHERE k.link_id=l.id) AS last_click FROM links l JOIN creators c ON c.id=l.creator_id ${where} ORDER BY l.created_at DESC,l.id`).bind(...values).all()).results;
 const daily=(await db.prepare(`SELECT substr(k.created_at,1,10) AS day,COUNT(*) AS clicks FROM clicks k JOIN links l ON l.id=k.link_id ${where?where+' AND':'WHERE'} k.created_at>=? GROUP BY day ORDER BY day`).bind(...values,new Date(Date.now()-29*86400000).toISOString().slice(0,10)).all()).results;
 const breakdown=(await db.prepare(`SELECT k.device,k.country,k.referrer,COUNT(*) AS clicks FROM clicks k JOIN links l ON l.id=k.link_id ${where} GROUP BY k.device,k.country,k.referrer ORDER BY clicks DESC`).bind(...values).all()).results;
 return json({user:{name:user.displayName,admin:user.admin},creators:creatorRows,links:linkRows,daily,breakdown,notAssigned:false,contextCreatorId:scope});
}catch(e){return failure(e);}}
export async function POST(request:Request){try{
 checkOrigin(request);const user=await identity();const b=await request.json() as Record<string,unknown>;const db=database();const own=user.admin?null:await creatorFor(user);
 if(!user.admin&&!own)throw new HttpError(403,'Your account has not been assigned to a creator page.');
 if(b.action==='bootstrap'){await bootstrap(user);return json({ok:true});}
 if(b.action==='creator'){
  requireAdmin(user);const name=clean(b.name,80),handle=clean(b.handle,50).replace(/^@/,'');if(!/^[A-Za-z0-9._]+$/.test(handle))throw new HttpError(400,'Use an Instagram handle without a URL.');if(await db.prepare('SELECT id FROM creators WHERE lower(handle)=?').bind(handle.toLowerCase()).first())throw new HttpError(409,'A page already exists for this handle.');
  await db.prepare('INSERT INTO creators(id,name,handle,bio,email,created_at) VALUES(?,?,?,?,?,?)').bind(crypto.randomUUID(),name,handle,clean(b.bio||'',240,false),emailAddress(b.email),new Date().toISOString()).run();return json({ok:true});
 }
 if(b.action==='creatorEmail'){requireAdmin(user);const id=clean(b.id,60);const email=emailAddress(b.email);const old=await db.prepare('SELECT id FROM creators WHERE id=?').bind(id).first();if(!old)throw new HttpError(404,'Creator not found.');await db.prepare('UPDATE creators SET email=?,user_id=NULL WHERE id=?').bind(email,id).run();return json({ok:true});}
 if(b.action==='appearance'){
  const id=clean(b.id,60);if(!user.admin&&id!==own?.id)throw new HttpError(403,'You can only style your own page.');
  if(!themes.some(t=>t.id===b.theme)||!layouts.some(t=>t.id===b.layout)||!fonts.some(t=>t.id===b.font))throw new HttpError(400,'Choose a supported theme, button style and font.');
  const result=await db.prepare('UPDATE creators SET theme=?,layout=?,font=? WHERE id=?').bind(b.theme,b.layout,b.font,id).run();if(!result.meta.changes)throw new HttpError(404,'Creator not found.');return json({ok:true});
 }
 if(b.action==='profile'){const id=clean(b.id,60);if(!user.admin&&id!==own?.id)throw new HttpError(403,'You can only edit your own page.');await db.prepare('UPDATE creators SET name=?,bio=? WHERE id=?').bind(clean(b.name,80),clean(b.bio||'',240,false),id).run();return json({ok:true});}
 if(b.action==='create'){
  const creatorId=clean(b.creatorId,60);if(!user.admin&&creatorId!==own?.id)throw new HttpError(403,'You can only add links to your own page.');if(!await db.prepare('SELECT id FROM creators WHERE id=?').bind(creatorId).first())throw new HttpError(400,'Choose a creator from your roster.');
  const slug=b.slug?clean(b.slug,48).toLowerCase():crypto.randomUUID().replaceAll('-','').slice(0,9);if(!/^[a-z0-9][a-z0-9-]{2,47}$/.test(slug))throw new HttpError(400,'Use 3–48 lowercase letters, numbers or hyphens for the short code.');
  await db.prepare('INSERT INTO links(id,slug,title,brand,creator_id,destination,active,expires_at,created_at) VALUES(?,?,?,?,?,?,1,?,?)').bind(crypto.randomUUID(),slug,clean(b.title,120),clean(b.brand||'Website',80),creatorId,destination(b.destination,new URL(request.url).origin),expiry(b.expiresAt),new Date().toISOString()).run();return json({ok:true});
 }
 if(b.action==='update'){
  const id=clean(b.id,60);const old=await db.prepare('SELECT * FROM links WHERE id=?').bind(id).first<any>();if(!old)throw new HttpError(404,'Link not found.');if(!user.admin&&old.creator_id!==own?.id)throw new HttpError(403,'You can only edit your own links.');if(typeof b.active!=='boolean')throw new HttpError(400,'Choose an active status.');
  await db.prepare('UPDATE links SET active=?,destination=?,expires_at=?,title=?,brand=? WHERE id=?').bind(b.active?1:0,b.destination===undefined?old.destination:destination(b.destination,new URL(request.url).origin),b.expiresAt===undefined?old.expires_at:expiry(b.expiresAt),b.title===undefined?old.title:clean(b.title,120),b.brand===undefined?old.brand:clean(b.brand||'Website',80),id).run();return json({ok:true});
 }
 throw new HttpError(400,'Unknown action.');
}catch(e){return failure(e);}}
