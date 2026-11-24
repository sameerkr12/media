import {database} from './tracker';
import {eq} from './supabase-rest';

export const STATUSES=['upcoming','active','pending','completed'] as const;
export type CollabStatus=typeof STATUSES[number];
export type CollabCreator={id:string;name:string;handle:string;platform:string;followers:number|null;niche:string;email:string;phone:string;notes:string;created_at:string};
export type CollabDeal={id:string;brand:string;creator_id:string;deliverables:string;amount:number;status:CollabStatus;paid:number;start_date:string|null;due_date:string|null;contact:string;notes:string;created_at:string;updated_at:string};
export type CollabDealRow=CollabDeal&{creator_name:string;creator_handle:string};

/** Everything the panel shows, with deals joined to their creator. */
export async function collabState(){
 const db=database();
 const [creators,deals]=await Promise.all([
  db.list<CollabCreator>('collab_creators'),
  db.list<CollabDeal>('collab_deals'),
 ]);
 creators.sort((a,b)=>a.name.localeCompare(b.name,'en',{sensitivity:'base'}));
 const byId=new Map(creators.map(c=>[c.id,c]));
 const key=(d:CollabDeal)=>d.due_date||d.start_date||d.created_at;
 const rows:CollabDealRow[]=deals.map(d=>({...d,amount:Number(d.amount),creator_name:byId.get(d.creator_id)?.name||'',creator_handle:byId.get(d.creator_id)?.handle||''}))
  .sort((a,b)=>key(b).localeCompare(key(a)));
 return {creators:creators.map(c=>({...c,followers:c.followers==null?null:Number(c.followers)})),deals:rows};
}

export async function creatorDealCount(id:string){
 return (await database().list<{id:string}>('collab_deals',{select:'id',creator_id:eq(id),limit:'1'})).length;
}
