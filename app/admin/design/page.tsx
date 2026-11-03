import {requireChatGPTUser} from '../../chatgpt-auth';
import {eligibleIdentity} from '../../../lib/tracker';
import {adminUnlocked} from '../../../lib/admin-auth';
import {redirect} from 'next/navigation';
import PageBuilder from '../../page-builder';
export const dynamic='force-dynamic';
export default async function Design({searchParams}:{searchParams:Promise<{creator?:string}>}){
 await requireChatGPTUser('/admin/design');const user=await eligibleIdentity();if(!user.admin)redirect('/creator/design');if(!await adminUnlocked(user.userId))redirect('/admin');
 const query=await searchParams;return <PageBuilder admin initialCreatorId={typeof query.creator==='string'?query.creator:''}/>;
}
