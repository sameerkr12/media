import {requireChatGPTUser} from '../../chatgpt-auth';
import {eligibleIdentity} from '../../../lib/tracker';
import {adminUnlocked} from '../../../lib/admin-auth';
import {redirect} from 'next/navigation';
import PageBuilder from '../../page-builder';
export const dynamic='force-dynamic';
export default async function Design(){await requireChatGPTUser('/creator/design');const user=await eligibleIdentity();if(user.admin&&!await adminUnlocked(user.userId))redirect('/admin');return <PageBuilder admin={user.admin}/>;}
