import {redirect} from 'next/navigation';
import {requireChatGPTUser} from '../chatgpt-auth';
import {identity,creatorFor} from '../../lib/tracker';
import Dashboard from '../tracker-dashboard';
export const dynamic='force-dynamic';
export default async function Page(){await requireChatGPTUser('/creator');const user=await identity();if(user.admin)redirect('/admin');if(!await creatorFor(user))redirect('/create-page');return <Dashboard admin={false}/>;}
