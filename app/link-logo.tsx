import {Send,Play,Camera,MessageCircle,ChartNoAxesCombined,Landmark,Wallet,Globe,ShoppingBag,GraduationCap,Mic,Mail} from 'lucide-react';
export default function LinkLogo({icon='auto',brand='Website',destination=''}:{icon?:string;brand?:string;destination?:string}){
 let selected=icon;if(icon==='auto'){const text=(brand+' '+destination).toLowerCase();selected=['telegram','youtube','instagram','whatsapp','facebook'].find(x=>text.includes(x))||(text.includes('t.me')?'telegram':text.includes('youtu.be')?'youtube':'website');}
 if(selected.startsWith('https://'))return <img src={selected} alt="" loading="lazy" decoding="async" referrerPolicy="no-referrer" style={{width:'100%',height:'100%',objectFit:'contain',borderRadius:6}}/>;
 if(selected==='youtube')return <svg viewBox="0 0 24 24" width="25" height="25" aria-hidden="true"><rect x="1" y="4" width="22" height="16" rx="5" fill="#ff0033"/><path d="m10 8 6 4-6 4z" fill="white"/></svg>;
 if(selected==='telegram')return <svg viewBox="0 0 24 24" width="25" height="25" aria-hidden="true"><circle cx="12" cy="12" r="12" fill="#229ed9"/><path d="m5 11 14-5-3 13-5-4 6-6-8 5z" fill="white"/></svg>;
 if(selected==='facebook')return <span aria-hidden="true" style={{color:'#1877f2',fontWeight:900,fontFamily:'Arial',fontSize:30}}>f</span>;
 const icons:Record<string,typeof Send>={telegram:Send,youtube:Play,instagram:Camera,whatsapp:MessageCircle,broker:Landmark,trading:ChartNoAxesCombined,chart:ChartNoAxesCombined,wallet:Wallet,website:Globe,shop:ShoppingBag,course:GraduationCap,podcast:Mic,email:Mail};const Icon=icons[selected];return Icon?<Icon size={23} aria-hidden="true"/>:<span aria-hidden="true">{selected==='x'?'𝕏':brand.slice(0,1)}</span>;
}
