import type {Metadata} from 'next';
import CollabAdmin from './collab-admin';
import './collab.css';
export const dynamic='force-dynamic';
export const metadata:Metadata={title:'Collab Admin — EmpireX',robots:{index:false,follow:false}};
export default function Page(){return <CollabAdmin/>;}
