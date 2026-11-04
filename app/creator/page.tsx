import {requireChatGPTUser} from '../chatgpt-auth';
import {eligibleIdentity} from '../../lib/tracker';
import {redirect} from 'next/navigation';
import Dashboard from '../tracker-dashboard';
export const dynamic='force-dynamic';
export default async function Creator(){await requireChatGPTUser('/creator');const user=await eligibleIdentity();return <Dashboard admin={false}/>;}
