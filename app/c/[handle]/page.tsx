import CreatorPageView from '../../creator-page-view';
import {eq,type Creator,type Link} from '../../../lib/supabase-rest';
import {database} from '../../../lib/tracker';
import {notFound} from 'next/navigation';
export const dynamic='force-dynamic';
export default async function Profile({params}:{params:Promise<{handle:string}>}){
 const {handle}=await params;const db=database();const creator=await db.one<Creator>('creators',{handle:eq(handle.toLowerCase()),select:'id,name,handle,bio,theme,layout,font'});if(!creator)notFound();
 const links=await db.list<Link>('links',{select:'slug,title,brand,destination,tags',creator_id:eq(creator.id),active:'eq.1',or:'(expires_at.is.null,expires_at.gt.'+new Date().toISOString()+')',order:'sort_order,created_at.desc,id'});
 return <CreatorPageView creator={creator} links={links}/>;
}
