import type {Metadata} from 'next';
import {redirect} from 'next/navigation';
import {requireChatGPTUser} from '../chatgpt-auth';
import {eligibleIdentity} from '../../lib/tracker';
import CollabAdmin from './collab-admin';
import './collab.css';
export const dynamic='force-dynamic';
export const metadata:Metadata={title:'Collab Admin — EmpireX',robots:{index:false,follow:false}};
export default async function Page(){
 await requireChatGPTUser('/collab-admin');const user=await eligibleIdentity();if(!user.admin)redirect('/creator');
 return <CollabAdmin/>;
}
