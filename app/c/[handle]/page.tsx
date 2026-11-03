import type {Metadata} from 'next';
import {cache} from 'react';
import {env} from '#runtime-env';
import CreatorPageView from '../../creator-page-view';
import {eq,type Creator,type Link} from '../../../lib/supabase-rest';
import {database} from '../../../lib/tracker';
import {notFound} from 'next/navigation';
export const dynamic='force-dynamic';
const creatorByHandle=cache((handle:string)=>database().one<Creator>('creators',{handle:eq(handle.toLowerCase()),select:'id,name,handle,bio,theme,layout,font,background'}));
export async function generateMetadata({params}:{params:Promise<{handle:string}>}):Promise<Metadata>{
 const {handle}=await params,creator=await creatorByHandle(handle);if(!creator)notFound();
 const title=creator.name,description=creator.bio||`Explore ${creator.name}’s links, updates and more.`,url=new URL('/c/'+encodeURIComponent(creator.handle),env.APP_URL||'https://empirexmedia.com').toString();
 return {title:{absolute:title},description,alternates:{canonical:url},openGraph:{type:'profile',title,description,url,siteName:'EmpireX Media'},twitter:{card:'summary',title,description}};
}
export default async function Profile({params}:{params:Promise<{handle:string}>}){
 const {handle}=await params;const db=database();const creator=await creatorByHandle(handle);if(!creator)notFound();
 const links=await db.list<Link>('links',{select:'slug,title,brand,destination,tags,icon',creator_id:eq(creator.id),active:'eq.1',or:'(expires_at.is.null,expires_at.gt.'+new Date().toISOString()+')',order:'sort_order,created_at.desc,id'});
 return <CreatorPageView creator={creator} links={links}/>;
}
