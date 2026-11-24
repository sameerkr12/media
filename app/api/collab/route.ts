import {identity,requireAdmin,database,checkOrigin,clean,HttpError,json} from '../../../lib/tracker';
import {SupabaseError,eq} from '../../../lib/supabase-rest';
import {collabState,creatorDealCount,STATUSES,type CollabStatus} from '../../../lib/collab';
export const dynamic='force-dynamic';

function failure(e:unknown){
 if(e instanceof SyntaxError)return json({error:'Invalid request data.'},400);
 if(e instanceof HttpError)return json({error:e.message},e.status);
 if(e instanceof SupabaseError){
  if(['PGRST202','PGRST205','42P01','42703'].includes(e.code))return json({error:'Collab Admin setup is incomplete. Apply the collab-admin SQL migration in Supabase.'},503);
  if(e.code==='23503')return json({error:'This creator has deals. Delete or reassign them first.'},409);
  if(e.code==='23514'||e.code==='22P02'||e.code==='22007'||e.code==='22008')return json({error:'Please check the values you entered.'},400);
 }
 console.error('Collab request failed',e);return json({error:'Something went wrong. Please try again.'},500);
}
async function admin(){const user=await identity();requireAdmin(user);return user;}
const opt=(v:unknown,max:number)=>v==null||v===''?'':clean(v,max,false);
function id(v:unknown){const s=clean(v,64);if(!/^[A-Za-z0-9-]+$/.test(s))throw new HttpError(400,'Invalid record.');return s;}
function date(v:unknown){if(!v)return null;const s=clean(v,10);if(!/^\d{4}-\d{2}-\d{2}$/.test(s)||!Number.isFinite(Date.parse(s)))throw new HttpError(400,'Enter a valid date.');return s;}
function int(v:unknown,label:string){if(v===''||v==null)return null;const n=Number(v);if(!Number.isFinite(n)||n<0||n>1e12)throw new HttpError(400,`Enter a valid ${label}.`);return Math.round(n);}
function status(v:unknown):CollabStatus{if(!STATUSES.includes(v as CollabStatus))throw new HttpError(400,'Choose a valid status.');return v as CollabStatus;}
function email(v:unknown){const s=opt(v,254);if(s&&!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s))throw new HttpError(400,'Enter a valid email.');return s;}

export async function GET(){try{
 await admin();return json({auth:true,...await collabState()});
}catch(e){return failure(e);}}

export async function POST(request:Request){try{
 checkOrigin(request);await admin();
 const raw=await request.text();if(raw.length>32000)throw new HttpError(413,'Request is too large.');
 const body=JSON.parse(raw) as Record<string,unknown>;if(!body||typeof body!=='object')throw new HttpError(400,'Invalid request data.');
 const db=database(),now=new Date().toISOString();
 switch(body.action){
  case 'saveCreator':{
   const c=(body.creator||{}) as Record<string,unknown>;
   const values={name:clean(c.name,80),handle:opt(c.handle,80).replace(/^@/,''),platform:opt(c.platform,30)||'Instagram',followers:int(c.followers,'follower count'),niche:opt(c.niche,60),email:email(c.email),phone:opt(c.phone,30),notes:opt(c.notes,1000)};
   if(c.id){const r=await db.update('collab_creators',values,{id:eq(id(c.id))});if(!r.length)throw new HttpError(404,'Creator not found.');}
   else await db.insert('collab_creators',{...values,id:crypto.randomUUID(),created_at:now});
   break;}
  case 'deleteCreator':{
   const cid=id(body.id);
   if(await creatorDealCount(cid))throw new HttpError(409,'This creator has deals. Delete or reassign them first.');
   await db.remove('collab_creators',{id:eq(cid)});break;}
  case 'saveDeal':{
   const d=(body.deal||{}) as Record<string,unknown>;
   const creator=id(d.creator_id);if(!(await db.one('collab_creators',{select:'id',id:eq(creator)})))throw new HttpError(400,'Choose a creator.');
   const values={brand:clean(d.brand,100),creator_id:creator,deliverables:opt(d.deliverables,500),amount:int(d.amount,'amount')??0,status:status(d.status),paid:d.paid?1:0,start_date:date(d.start_date),due_date:date(d.due_date),contact:opt(d.contact,200),notes:opt(d.notes,2000),updated_at:now};
   if(d.id){const r=await db.update('collab_deals',values,{id:eq(id(d.id))});if(!r.length)throw new HttpError(404,'Deal not found.');}
   else await db.insert('collab_deals',{...values,id:crypto.randomUUID(),created_at:now});
   break;}
  case 'setStatus':{
   const s=status(body.status);
   const r=await db.update('collab_deals',s==='completed'?{status:s,paid:1,updated_at:now}:{status:s,updated_at:now},{id:eq(id(body.id))});
   if(!r.length)throw new HttpError(404,'Deal not found.');break;}
  case 'deleteDeal':await db.remove('collab_deals',{id:eq(id(body.id))});break;
  default:throw new HttpError(400,'Unknown action.');
 }
 return json({auth:true,...await collabState()});
}catch(e){return failure(e);}}
