import {redirect} from 'next/navigation';
import {requireChatGPTUser} from '../chatgpt-auth';
import {identity,creatorFor} from '../../lib/tracker';
import CreatePageForm from './form';
export default async function Page(){await requireChatGPTUser('/create-page');const user=await identity();if(user.admin)redirect('/admin');if(await creatorFor(user))redirect('/creator');return <CreatePageForm/>;}
