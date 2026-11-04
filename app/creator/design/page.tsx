import {redirect} from 'next/navigation';
import {requireChatGPTUser} from '../../chatgpt-auth';
import {identity,creatorFor} from '../../../lib/tracker';
import PageBuilder from '../../page-builder';
export const dynamic='force-dynamic';
export default async function Page(){await requireChatGPTUser('/creator/design');const user=await identity();if(user.admin)redirect('/admin/design');if(!await creatorFor(user))redirect('/create-page');return <PageBuilder admin={false}/>;}
