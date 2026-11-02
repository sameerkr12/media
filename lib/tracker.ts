import {publicOrigin} from './supabase-auth';
import {adminSettings,adminUnlocked} from './admin-auth';
import {env} from '#runtime-env';
import {createSupabaseDatabase,eq,type Creator} from './supabase-rest';
import {getChatGPTUser} from '../app/chatgpt-auth';
export function database(){const settings=env as unknown as Record<string,string>;const url=settings.SUPABASE_URL;const key=settings.SUPABASE_SECRET_KEY||settings.SUPABASE_SERVICE_ROLE_KEY;if(!url||!key)throw new HttpError(503,'Supabase database is not configured.');return createSupabaseDatabase(url,key);}
export class HttpError extends Error {constructor(public status:number,message:string){super(message);}}
export async function eligibleIdentity(){const user=await getChatGPTUser();if(!user)throw new HttpError(401,'Sign in to continue.');const db=database();let admin=!!(await db.one('admins',{select:'user_id',user_id:eq(user.userId)}));const email=user.email.toLowerCase().trim();if(!admin&&env.ADMIN_EMAIL&&email===env.ADMIN_EMAIL.toLowerCase().trim())admin=true;return {...user,admin,email};}
export async function identity(){
 const user=await eligibleIdentity();
 if(user.admin){if(!adminSettings().configured)throw new HttpError(503,'Admin password is not configured.');if(!await adminUnlocked(user.userId))throw new HttpError(401,'Unlock admin access at /admin to continue.');}
 return user;
}
export function requireAdmin(user:{admin:boolean}){if(!user.admin)throw new HttpError(403,'Admin access is required.');}
export function checkOrigin(request:Request){const origin=request.headers.get('origin');if(!origin||origin!==publicOrigin(request))throw new HttpError(403,'This request must come from your EmpireX dashboard.');}
export function clean(value:unknown,max:number,required=true){if(typeof value!=='string'||value.trim().length>max||(required&&!value.trim()))throw new HttpError(400,'Please check the required fields and their length.');return value.trim();}
export function destination(value:unknown,origin:string){const text=clean(value,2048);let u:URL;try{u=new URL(text);}catch{throw new HttpError(400,'Enter a valid HTTPS destination URL.');}if(u.protocol!=='https:'||u.username||u.password)throw new HttpError(400,'Use an HTTPS URL without embedded credentials.');if(u.origin===origin)throw new HttpError(400,'Choose a brand destination outside this site.');return u.href;}
export function expiry(value:unknown){if(!value)return null;const s=clean(value,40);const d=new Date(s);if(!Number.isFinite(d.getTime())||d.getTime()<=Date.now())throw new HttpError(400,'Expiry must be a date in the future.');return d.toISOString();}
export function emailAddress(value:unknown){if(!value)return null;const s=clean(value,254).toLowerCase();if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s))throw new HttpError(400,'Enter a valid creator sign-in email.');return s;}
export const roster=[['sameer','Sameer','trade_x_sameer'],['roshan','Roshan','traderr_roshan'],['krishna','Krishna','trade_with_krishna002'],['wolf','The Wolf Trader','the_wolf.trader'],['monk','Trader Monk','trader._.monk']];
export async function bootstrap(user:Awaited<ReturnType<typeof identity>>){
 requireAdmin(user);const db=database(),now=new Date().toISOString();
 await db.insert('admins',{user_id:user.userId,created_at:now},true);
 await db.insert('creators',roster.map(([id,name,handle])=>({id,name,handle,created_at:now})),true);
 await db.insert('links',roster.map(([id,name,handle])=>({id:'instagram-'+id,slug:id+'-instagram',title:'Follow on Instagram',brand:'Instagram',creator_id:id,destination:'https://www.instagram.com/'+handle+'/',active:1,created_at:now})),true);
}
export async function creatorFor(user:Awaited<ReturnType<typeof identity>>){
 const db=database();let row=await db.one<Creator>('creators',{user_id:eq(user.userId)});
 if(!row){row=await db.one<Creator>('creators',{user_id:'is.null',email:eq(user.email)});}
 if(row&&!row.user_id){
  const claimed=await db.update<Creator>('creators',{user_id:user.userId},{id:eq(row.id),user_id:'is.null',email:eq(user.email)});
  if(!claimed.length)return db.one<Creator>('creators',{id:eq(row.id),user_id:eq(user.userId)});
  row=claimed[0];
 }
 return row;
}
export function json(data:unknown,status=200){return Response.json(data,{status,headers:{'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}});}
