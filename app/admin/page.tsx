import {adminUnlocked,adminSettings} from '../../lib/admin-auth';
import PasswordForm from './password-form';
import {requireChatGPTUser} from '../chatgpt-auth';
import {eligibleIdentity} from '../../lib/tracker';
import Dashboard from '../tracker-dashboard';
export const dynamic='force-dynamic';
export default async function Admin(){await requireChatGPTUser('/admin');const user=await eligibleIdentity();if(!user.admin)return <main style={{padding:60,fontFamily:'sans-serif',color:'#eee',background:'#10120e',minHeight:'100vh'}}><h1>Admin access only</h1><p>Your account can access creator links assigned to you.</p><a href="/creator">Open creator portal →</a></main>;if(!await adminUnlocked(user.userId))return <PasswordForm configured={adminSettings().configured}/>;return <Dashboard admin/>;}
