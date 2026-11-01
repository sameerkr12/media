import {database} from '../../../lib/tracker';
import {notFound} from 'next/navigation';
export const dynamic='force-dynamic';
export default async function Profile({params}:{params:Promise<{handle:string}>}){
 const {handle}=await params;const db=database();const creator=await db.prepare('SELECT id,name,handle,bio FROM creators WHERE lower(handle)=?').bind(handle.toLowerCase()).first<any>();if(!creator)notFound();
 const links=(await db.prepare('SELECT slug,title,brand,destination FROM links WHERE creator_id=? AND active=1 AND (expires_at IS NULL OR expires_at>?) ORDER BY created_at DESC,id').bind(creator.id,new Date().toISOString()).all<any>()).results;
 const initials=creator.name.split(' ').map((s:string)=>s[0]).slice(0,2).join('');
 return <main className="bio-page"><div className="bio-orbit" aria-hidden="true"/><div className="bio-shell"><a href="/" className="bio-agency"><img src="/assets/logo.png" alt="EmpireX Media"/></a><div className="bio-avatar">{initials}<span aria-label="EmpireX creator">✦</span></div><h1>{creator.name}</h1><p className="bio-handle">@{creator.handle}</p>{creator.bio&&<p className="bio-description">{creator.bio}</p>}<div className="bio-links">{links.map(link=><a key={link.slug} href={'/r/'+link.slug} className="bio-link"><span className="bio-link-icon">{link.brand.slice(0,1).toUpperCase()}</span><span>{link.title}<small>{link.brand}</small></span><span className="bio-link-arrow">↗</span></a>)}{!links.length&&<div className="bio-empty">Something good is on its way.<br/>Links will appear here soon.</div>}</div><p className="bio-disclosure">Curated by {creator.name}.<br/>Link clicks are measured to understand what connects.</p><a className="bio-footer" href="/">PART OF THE EMPIREX COLLECTIVE <span>↗</span></a></div></main>;
}
