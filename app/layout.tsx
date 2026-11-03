import type {Metadata} from 'next';
import './globals.css';
import './workspace.css';
import './page-builder.css';
export const metadata:Metadata={title:'EmpireX — Creator workspace',description:'Campaign links and creator performance, in one place.',icons:{icon:'/assets/favicon.svg'}};
export default function Layout({children}:{children:React.ReactNode}){return <html lang="en"><head>
 <script async src="https://www.googletagmanager.com/gtag/js?id=G-ZERRGKZ2CY"/>
 <script id="google-analytics" dangerouslySetInnerHTML={{__html:`
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  gtag('js', new Date());
  gtag('config', 'G-ZERRGKZ2CY');
 `}}/>
 </head><body>{children}</body></html>;}
