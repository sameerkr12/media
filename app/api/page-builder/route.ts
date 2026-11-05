import {identity,database,creatorFor,checkOrigin,clean,destination,expiry,HttpError,json} from '../../../lib/tracker';
import {publicOrigin} from '../../../lib/supabase-auth';
import {themes,layouts,fonts,backgrounds,linkIcons} from '../../../lib/appearance';
import {SupabaseError} from '../../../lib/supabase-rest';
import {normalizeTags,type BuilderLink} from '../../../lib/page-builder-model';
export const dynamic='force-dynamic';
function failure(error:unknown){
 if(error instanceof HttpError)return json({error:error.message},error.status);
 if(error instanceof SyntaxError)return json({error:'Invalid page data.'},400);
 if(error instanceof SupabaseError){
  if(['PT409','40001','40P01'].includes(error.code))return json({error:'This page changed in another tab. Reload the latest version before saving.',conflict:true},409);
  if(error.code==='23505')return json({error:'One of these links conflicts with an existing short code. Reload and try again.'},409);
  if(['PGRST202','PGRST205','42703','42883'].includes(error.code))return json({error:'Page builder setup is incomplete. Apply the page-builder SQL migration.'},503);
  if(error.code==='22023')return json({error:'The link list changed. Reload this page before saving.'},409);
  if(error.code==='42501')return json({error:'You can only edit links belonging to this creator.'},403);
 }
 console.error('Page builder request failed',error);return json({error:'Could not save your page. Your draft is still here; try again.'},503);
}
async function scope(request:Request,requested:unknown){
 const user=await identity();
 if(user.admin){if(typeof requested!=='string'||!requested.trim())throw new HttpError(400,'Choose a creator to design.');return clean(requested,60);}
 const own=await creatorFor(user);if(!own)throw new HttpError(403,'Create your page at /create-page first.');
 if(requested!==undefined&&requested!==null&&requested!==own.id)throw new HttpError(403,'You can only design your own creator page.');
 return own.id;
}
export async function GET(request:Request){try{
 const id=await scope(request,new URL(request.url).searchParams.get('creator'));
 const page=await database().builder(id);if(!page)throw new HttpError(404,'Creator page not found.');
 return json(page);
}catch(error){return failure(error);}}
export async function POST(request:Request){try{
 checkOrigin(request);if(Number(request.headers.get('content-length'))>512000)throw new HttpError(413,'Page draft is too large.');
 const raw=await request.text();if(raw.length>512000)throw new HttpError(413,'Page draft is too large.');
 const body=JSON.parse(raw) as Record<string,unknown>;if(!body||typeof body!=='object')throw new HttpError(400,'Invalid page draft.');
 const id=await scope(request,body.creatorId),db=database();
 if(!Number.isSafeInteger(body.version)||(body.version as number)<0)throw new HttpError(400,'Reload the page before saving.');
 const current=await db.builder(id);if(!current)throw new HttpError(404,'Creator page not found.');
 if(current.creator.edit_version!==body.version)return json({error:'This page changed in another tab. Reload the latest version before saving.',conflict:true},409);
 const input=body.profile as Record<string,unknown>;if(!input||typeof input!=='object')throw new HttpError(400,'Add your profile details.');
 if(!themes.some(t=>t.id===input.theme)||!layouts.some(l=>l.id===input.layout)||!fonts.some(f=>f.id===input.font))throw new HttpError(400,'Choose a supported theme, button shape and font.');
 if(!backgrounds.includes((input.background||'classic') as typeof backgrounds[number]))throw new HttpError(400,'Choose a supported background.');
 const profile={background:input.background||'classic',name:clean(input.name,80),bio:clean(input.bio||'',240,false),theme:input.theme,layout:input.layout,font:input.font};
 if(!Array.isArray(body.links)||body.links.length>200)throw new HttpError(400,'A page can have up to 200 links.');
 const existing=new Map(current.links.map(link=>[link.id,link])),seen=new Set<string>();
 const links:BuilderLink[]=body.links.map((value:unknown,index:number)=>{
  if(!value||typeof value!=='object')throw new HttpError(400,'Check link '+(index+1)+'.');
  const row=value as Record<string,unknown>,linkId=clean(row.id,60);if(!/^[A-Za-z0-9_-]+$/.test(linkId)||seen.has(linkId))throw new HttpError(400,'Every link needs a unique valid ID.');seen.add(linkId);
  if(row.active!==0&&row.active!==1)throw new HttpError(400,'Choose whether each link is visible.');
  if(!Array.isArray(row.tags)||row.tags.length>5||row.tags.some(tag=>typeof tag!=='string'||tag.trim().length>24))throw new HttpError(400,'Use up to five tags per link, with at most 24 characters each.');
  const icon=typeof row.icon==='string'?row.icon:'auto';if(!linkIcons.includes(icon as typeof linkIcons[number])&&!/^https:\/\//.test(icon))throw new HttpError(400,'Choose a logo or use an HTTPS image URL.');if(icon.startsWith('https:')){const image=new URL(icon);if(image.username||image.password||icon.length>2048)throw new HttpError(400,'Invalid logo URL.');}
  const old=existing.get(linkId);let expiresAt:string|null;
  if(old&&row.expires_at===old.expires_at)expiresAt=old.expires_at;else expiresAt=expiry(row.expires_at);
  return {icon,id:linkId,slug:old?.slug||crypto.randomUUID().replaceAll('-','').slice(0,12),title:clean(row.title,120),brand:clean(row.brand||'Website',80),destination:destination(row.destination,publicOrigin(request)),active:row.active,expires_at:expiresAt,tags:normalizeTags(row.tags as string[]),sort_order:index};
 });
 const result=await db.savePage(id,body.version as number,profile,links);return json(result);
}catch(error){return failure(error);}}
