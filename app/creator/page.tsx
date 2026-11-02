import {requireChatGPTUser} from '../chatgpt-auth';
import {eligibleIdentity} from '../../lib/tracker';
import {adminUnlocked} from '../../lib/admin-auth';
import {redirect} from 'next/navigation';
import Dashboard from '../tracker-dashboard';
export const dynamic='force-dynamic';
export default async function Creator(){await requireChatGPTUser('/creator');const user=await eligibleIdentity();if(user.admin&&!await adminUnlocked(user.userId))redirect('/admin');return <Dashboard admin={false}/>;}
