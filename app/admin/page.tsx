import {redirect} from 'next/navigation';
import {requireChatGPTUser} from '../chatgpt-auth';
import {eligibleIdentity} from '../../lib/tracker';
import Dashboard from '../tracker-dashboard';
export const dynamic='force-dynamic';
export default async function Admin(){await requireChatGPTUser('/admin');const user=await eligibleIdentity();if(!user.admin)redirect('/login');return <Dashboard admin/>;}
