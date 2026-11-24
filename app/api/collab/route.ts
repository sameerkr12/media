import {checkOrigin,clean} from '../../../lib/tracker';
import {collabDb,isSetUp,sessionValid,setupPassword,login,createSession,clearCookie,endSession,changePassword,validPassword,STATUSES,json,HttpError} from '../../../lib/collab';
export const dynamic='force-dynamic';

function failure(e:unknown){if(e instanceof SyntaxError)return json({error:'Invalid request data.'},400);if(e instanceof HttpError)return json({error:e.message},e.status);console.error('Collab request failed',e);return json({error:'Something went wrong. Please try again.'},500);}
function withCookie(res:Response,cookie:string){res.headers.append('Set-Cookie',cookie);return res;}
const opt=(v:unknown,max:number)=>v==null||v===''?'':clean(v,max,false);
function date(v:unknown){if(!v)return null;const s=clean(v,10);if(!/^\d{4}-\d{2}-\d{2}$/.test(s)||!Number.isFinite(Date.parse(s)))throw new HttpError(400,'Enter a valid date.');return s;}
function int(v:unknown,label:string){if(v===''||v==null)return null;const n=Number(v);if(!Number.isFinite(n)||n<0||n>1e12)throw new HttpError(400,`Enter a valid ${label}.`);return Math.round(n);}
function status(v:unknown){if(!STATUSES.includes(v as any))throw new HttpError(400,'Choose a valid status.');return v as string;}

async function state(){const db=await collabDb();
 const [creators,deals]=await Promise.all([
  db.prepare('SELECT * FROM collab_creators ORDER BY name COLLATE NOCASE').all(),
  db.prepare('SELECT d.*,c.name AS creator_name,c.handle AS creator_handle FROM collab_deals d JOIN collab_creators c ON c.id=d.creator_id ORDER BY COALESCE(d.due_date,d.start_date,d.created_at) DESC').all(),
 ]);return {auth:true,creators:creators.results,deals:deals.results};}

export async function GET(request:Request){try{
 if(!(await isSetUp()))return json({setup:true});
 if(!(await sessionValid(request)))return json({auth:false});
 return json(await state());
}catch(e){return failure(e);}}

export async function POST(request:Request){try{
 checkOrigin(request);const body=await request.json() as Record<string,any>;const action=body.action;
 if(action==='setup'){await setupPassword(validPassword(body.password));return withCookie(json({ok:true}),await createSession());}
 if(action==='login'){if(typeof body.password!=='string'||!body.password)throw new HttpError(400,'Enter your password.');await login(body.password);return withCookie(json({ok:true}),await createSession());}
 if(!(await sessionValid(request)))return withCookie(json({error:'Your session has expired. Please sign in again.'},401),clearCookie);
 const db=await collabDb(),now=new Date().toISOString();
 switch(action){
  case 'logout':await endSession(request);return withCookie(json({ok:true}),clearCookie);
  case 'password':await changePassword(String(body.current||''),validPassword(body.next));return withCookie(json({ok:true}),await createSession());
  case 'saveCreator':{const c=body.creator||{};const v=[clean(c.name,80),opt(c.handle,80).replace(/^@/,''),opt(c.platform,30)||'Instagram',int(c.followers,'follower count'),opt(c.niche,60),opt(c.email,254),opt(c.phone,30),opt(c.notes,1000)];
   if(c.id){const r=await db.prepare('UPDATE collab_creators SET name=?,handle=?,platform=?,followers=?,niche=?,email=?,phone=?,notes=? WHERE id=?').bind(...v,clean(c.id,64)).run();if(!r.meta.changes)throw new HttpError(404,'Creator not found.');}
   else await db.prepare('INSERT INTO collab_creators(name,handle,platform,followers,niche,email,phone,notes,id,created_at) VALUES(?,?,?,?,?,?,?,?,?,?)').bind(...v,crypto.randomUUID(),now).run();
   break;}
  case 'deleteCreator':{const id=clean(body.id,64);const n=await db.prepare('SELECT COUNT(*) AS n FROM collab_deals WHERE creator_id=?').bind(id).first<{n:number}>();if(n&&n.n>0)throw new HttpError(409,'This creator has deals. Delete or reassign them first.');await db.prepare('DELETE FROM collab_creators WHERE id=?').bind(id).run();break;}
  case 'saveDeal':{const d=body.deal||{};const creator=clean(d.creator_id,64);if(!(await db.prepare('SELECT 1 FROM collab_creators WHERE id=?').bind(creator).first()))throw new HttpError(400,'Choose a creator.');
   const st=status(d.status);const v=[clean(d.brand,100),creator,opt(d.deliverables,500),int(d.amount,'amount')??0,st,d.paid?1:0,date(d.start_date),date(d.due_date),opt(d.contact,200),opt(d.notes,2000),now];
   if(d.id){const r=await db.prepare('UPDATE collab_deals SET brand=?,creator_id=?,deliverables=?,amount=?,status=?,paid=?,start_date=?,due_date=?,contact=?,notes=?,updated_at=? WHERE id=?').bind(...v,clean(d.id,64)).run();if(!r.meta.changes)throw new HttpError(404,'Deal not found.');}
   else await db.prepare('INSERT INTO collab_deals(brand,creator_id,deliverables,amount,status,paid,start_date,due_date,contact,notes,updated_at,id,created_at) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?)').bind(...v,crypto.randomUUID(),now).run();
   break;}
  case 'setStatus':await db.prepare('UPDATE collab_deals SET status=?,paid=CASE WHEN ?=\'completed\' THEN 1 ELSE paid END,updated_at=? WHERE id=?').bind(status(body.status),body.status,now,clean(body.id,64)).run();break;
  case 'deleteDeal':await db.prepare('DELETE FROM collab_deals WHERE id=?').bind(clean(body.id,64)).run();break;
  default:throw new HttpError(400,'Unknown action.');
 }
 return json(await state());
}catch(e){return failure(e);}}
