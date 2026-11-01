import type {Metadata} from 'next';
import './globals.css';
export const metadata:Metadata={title:'EmpireX — Creator workspace',description:'Campaign links and creator performance, in one place.',icons:{icon:'/assets/favicon.svg'}};
export default function Layout({children}:{children:React.ReactNode}){return <html lang="en"><body>{children}</body></html>;}
