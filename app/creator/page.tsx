import {requireChatGPTUser} from '../chatgpt-auth';
import Dashboard from '../tracker-dashboard';
export const dynamic='force-dynamic';
export default async function Creator(){await requireChatGPTUser('/creator');return <Dashboard admin={false}/>;}
