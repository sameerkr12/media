'use client';
import {useCallback,useEffect,useMemo,useState} from 'react';
import {Briefcase,Users,LayoutGrid,Plus,Search,Sun,Moon,LogOut,KeyRound,Pencil,Trash2,X,Lock,ShieldCheck,CalendarClock,Clock,CheckCircle2,Hourglass,Zap,IndianRupee,ArrowRight,Loader2,AtSign} from 'lucide-react';

type Status='upcoming'|'active'|'pending'|'completed';
type Creator={id:string;name:string;handle:string;platform:string;followers:number|null;niche:string;email:string;phone:string;notes:string};
type Deal={id:string;brand:string;creator_id:string;creator_name:string;creator_handle:string;deliverables:string;amount:number;status:Status;paid:number;start_date:string|null;due_date:string|null;contact:string;notes:string};
type Gate='loading'|'setup'|'login'|'app';
type Modal={kind:'deal';deal?:Deal}|{kind:'creator';creator?:Creator}|{kind:'password'}|{kind:'confirm';title:string;text:string;run:()=>Promise<void>}|null;

const STATUS:{key:Status;label:string;hint:string;icon:typeof Clock}[]=[
 {key:'upcoming',label:'Upcoming',hint:'Confirmed, not started',icon:CalendarClock},
 {key:'active',label:'Active',hint:'Content in progress',icon:Zap},
 {key:'pending',label:'Pending',hint:'Delivered, awaiting payment',icon:Hourglass},
 {key:'completed',label:'Completed',hint:'Done and paid',icon:CheckCircle2},
];
const PLATFORMS=['Instagram','YouTube','X / Twitter','Telegram','LinkedIn','Other'];
const inr=(n:number)=>'₹'+new Intl.NumberFormat('en-IN').format(n||0);
const compact=(n:number|null)=>n==null?'—':new Intl.NumberFormat('en-IN',{notation:'compact',maximumFractionDigits:1}).format(n);
const fmtDate=(d:string|null)=>d?new Date(d+'T00:00:00').toLocaleDateString('en-IN',{day:'numeric',month:'short',year:'numeric'}):'—';
const today=()=>new Date().toISOString().slice(0,10);
const initials=(s:string)=>s.split(/\s+/).map(w=>w[0]).join('').slice(0,2).toUpperCase();

async function call(body?:unknown){const r=await fetch('/api/collab',body?{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)}:{cache:'no-store'});const j:any=await r.json().catch(()=>({error:'Unexpected server response.'}));if(!r.ok){const e:any=new Error(j.error||'Something went wrong.');e.status=r.status;throw e;}return j;}

export default function CollabAdmin(){
 const [theme,setTheme]=useState<'light'|'dark'>('dark');
 const [gate,setGate]=useState<Gate>('loading');
 const [creators,setCreators]=useState<Creator[]>([]),[deals,setDeals]=useState<Deal[]>([]);
 const [tab,setTab]=useState<'overview'|'deals'|'creators'>('overview');
 const [modal,setModal]=useState<Modal>(null),[toast,setToast]=useState('');
 const [filter,setFilter]=useState<Status|'all'>('all'),[creatorFilter,setCreatorFilter]=useState('all'),[q,setQ]=useState('');

 useEffect(()=>{let t:string|null=null;try{t=localStorage.getItem('collab-theme');}catch{}setTheme(t==='light'||t==='dark'?t:matchMedia('(prefers-color-scheme: light)').matches?'light':'dark');},[]);
 const toggleTheme=()=>setTheme(t=>{const n=t==='dark'?'light':'dark';try{localStorage.setItem('collab-theme',n);}catch{}return n;});
 const apply=(d:any)=>{setCreators(d.creators);setDeals(d.deals);setGate('app');};
 const load=useCallback(async()=>{try{const d=await call();if(d.setup)setGate('setup');else if(!d.auth)setGate('login');else apply(d);}catch{setGate('login');}},[]);
 useEffect(()=>{load();},[load]);
 useEffect(()=>{if(!toast)return;const t=setTimeout(()=>setToast(''),2600);return()=>clearTimeout(t);},[toast]);

 const act=async(body:any,msg?:string)=>{try{const d=await call(body);if(d.creators)apply(d);if(msg)setToast(msg);return true;}catch(e:any){if(e.status===401&&body.action!=='password'){setGate('login');}setToast(e.message);return false;}};

 const totals=useMemo(()=>{const by=(s:Status)=>deals.filter(d=>d.status===s);return{count:Object.fromEntries(STATUS.map(s=>[s.key,by(s.key).length])) as Record<Status,number>,
  earned:by('completed').reduce((a,d)=>a+d.amount,0),pending:by('pending').reduce((a,d)=>a+d.amount,0),pipeline:[...by('upcoming'),...by('active')].reduce((a,d)=>a+d.amount,0)};},[deals]);

 const shell=(child:React.ReactNode)=><div className="cx" data-theme={theme}>{child}{toast&&<div className="cx-toast" role="status">{toast}</div>}</div>;
 if(gate==='loading')return shell(<div className="cx-center"><Loader2 className="cx-spin" size={22}/></div>);
 if(gate==='setup'||gate==='login')return shell(<AuthScreen mode={gate} theme={theme} toggleTheme={toggleTheme} onDone={load}/>);

 const openDeals=(s:Status|'all',c='all')=>{setFilter(s);setCreatorFilter(c);setQ('');setTab('deals');};
 return shell(<>
  <header className="cx-top">
   <div className="cx-brand"><span className="cx-logo">EX</span><div><strong>EmpireX</strong><small>Collab Admin</small></div></div>
   <nav className="cx-tabs">
    {([['overview','Overview',LayoutGrid],['deals','Brand deals',Briefcase],['creators','Creators',Users]] as const).map(([k,l,I])=><button key={k} className={tab===k?'on':''} onClick={()=>setTab(k)}><I size={16}/><span>{l}</span></button>)}
   </nav>
   <div className="cx-top-actions">
    <button className="cx-icon" onClick={toggleTheme} aria-label="Toggle theme" title="Toggle theme">{theme==='dark'?<Sun size={17}/>:<Moon size={17}/>}</button>
    <button className="cx-icon" onClick={()=>setModal({kind:'password'})} aria-label="Change password" title="Change password"><KeyRound size={17}/></button>
    <button className="cx-icon" onClick={()=>act({action:'logout'}).then(()=>setGate('login'))} aria-label="Sign out" title="Sign out"><LogOut size={17}/></button>
   </div>
  </header>

  <main className="cx-main">
   {tab==='overview'&&<>
    <div className="cx-head"><div><h1>Overview</h1><p>Your brand deals at a glance.</p></div>
     <div className="cx-head-actions"><button className="cx-btn ghost" onClick={()=>setModal({kind:'creator'})}><Plus size={16}/>Add creator</button><button className="cx-btn" onClick={()=>creators.length?setModal({kind:'deal'}):setToast('Add a creator first.')}><Plus size={16}/>New deal</button></div></div>
    <div className="cx-stats">
     <Stat label="Earned" value={inr(totals.earned)} sub={`${totals.count.completed} completed deals`} icon={IndianRupee} tone="green"/>
     <Stat label="Awaiting payment" value={inr(totals.pending)} sub={`${totals.count.pending} pending deals`} icon={Hourglass} tone="amber"/>
     <Stat label="In pipeline" value={inr(totals.pipeline)} sub={`${totals.count.active} active · ${totals.count.upcoming} upcoming`} icon={Zap} tone="blue"/>
     <Stat label="Creators" value={String(creators.length)} sub={`${deals.length} deals total`} icon={Users} tone="violet"/>
    </div>
    <div className="cx-cats">{STATUS.map(s=><button key={s.key} className={`cx-cat s-${s.key}`} onClick={()=>openDeals(s.key)}><span className="cx-cat-icon"><s.icon size={18}/></span><div><strong>{totals.count[s.key]}</strong><span>{s.label}</span><small>{s.hint}</small></div><ArrowRight size={16} className="cx-cat-go"/></button>)}</div>
    <div className="cx-grid2">
     <section className="cx-card"><div className="cx-card-head"><h2>Due soon</h2><button className="cx-link" onClick={()=>openDeals('all')}>All deals<ArrowRight size={14}/></button></div>
      {(()=>{const list=deals.filter(d=>d.status!=='completed'&&d.due_date).sort((a,b)=>a.due_date!.localeCompare(b.due_date!)).slice(0,6);return list.length?<ul className="cx-mini">{list.map(d=><li key={d.id} onClick={()=>setModal({kind:'deal',deal:d})}><div><strong>{d.brand}</strong><small>{d.creator_name}</small></div><div className="cx-mini-r"><Due d={d}/><Badge s={d.status}/></div></li>)}</ul>:<Empty text="No open deals with a due date."/>;})()}
     </section>
     <section className="cx-card"><div className="cx-card-head"><h2>Top creators</h2><button className="cx-link" onClick={()=>setTab('creators')}>All creators<ArrowRight size={14}/></button></div>
      {(()=>{const list=creators.map(c=>({c,v:deals.filter(d=>d.creator_id===c.id&&d.status==='completed').reduce((a,d)=>a+d.amount,0),n:deals.filter(d=>d.creator_id===c.id).length})).sort((a,b)=>b.v-a.v).slice(0,6);return list.length?<ul className="cx-mini">{list.map(({c,v,n})=><li key={c.id} onClick={()=>openDeals('all',c.id)}><div className="cx-who"><span className="cx-av">{initials(c.name)}</span><div><strong>{c.name}</strong><small>{n} deal{n===1?'':'s'}</small></div></div><strong className="cx-amt">{inr(v)}</strong></li>)}</ul>:<Empty text="No creators yet." action={<button className="cx-btn sm" onClick={()=>setModal({kind:'creator'})}><Plus size={14}/>Add creator</button>}/>;})()}
     </section>
    </div>
   </>}

   {tab==='deals'&&<DealsView deals={deals} creators={creators} filter={filter} setFilter={setFilter} creatorFilter={creatorFilter} setCreatorFilter={setCreatorFilter} q={q} setQ={setQ} counts={totals.count}
     onNew={()=>creators.length?setModal({kind:'deal'}):(setToast('Add a creator first.'),setTab('creators'))} onEdit={d=>setModal({kind:'deal',deal:d})}
     onStatus={(d,s)=>act({action:'setStatus',id:d.id,status:s},`Moved to ${STATUS.find(x=>x.key===s)!.label}`)}
     onDelete={d=>setModal({kind:'confirm',title:'Delete deal?',text:`${d.brand} × ${d.creator_name} will be removed permanently.`,run:async()=>{await act({action:'deleteDeal',id:d.id},'Deal deleted');}})}/>}

   {tab==='creators'&&<>
    <div className="cx-head"><div><h1>Creators</h1><p>Everyone you manage deals for.</p></div><div className="cx-head-actions"><button className="cx-btn" onClick={()=>setModal({kind:'creator'})}><Plus size={16}/>Add creator</button></div></div>
    {creators.length?<div className="cx-creators">{creators.map(c=>{const mine=deals.filter(d=>d.creator_id===c.id);const earned=mine.filter(d=>d.status==='completed').reduce((a,d)=>a+d.amount,0);const open=mine.filter(d=>d.status!=='completed').length;return <article key={c.id} className="cx-card cx-creator">
      <div className="cx-creator-top"><span className="cx-av lg">{initials(c.name)}</span><div className="cx-row-actions"><button className="cx-icon sm" onClick={()=>setModal({kind:'creator',creator:c})} aria-label="Edit"><Pencil size={15}/></button><button className="cx-icon sm danger" aria-label="Delete" onClick={()=>setModal({kind:'confirm',title:'Delete creator?',text:`${c.name} will be removed permanently.`,run:async()=>{await act({action:'deleteCreator',id:c.id},'Creator deleted');}})}><Trash2 size={15}/></button></div></div>
      <h3>{c.name}</h3><p className="cx-handle">{c.handle?<><AtSign size={13}/>{c.handle}</>:'No handle'} · {c.platform}</p>
      {c.niche&&<span className="cx-chip">{c.niche}</span>}
      <div className="cx-creator-stats"><div><strong>{compact(c.followers)}</strong><span>Followers</span></div><div><strong>{open}</strong><span>Open deals</span></div><div><strong>{inr(earned)}</strong><span>Earned</span></div></div>
      <button className="cx-btn ghost full" onClick={()=>openDeals('all',c.id)}>View deals<ArrowRight size={15}/></button>
     </article>;})}</div>:<section className="cx-card"><Empty big text="Add your first creator to start tracking brand deals." action={<button className="cx-btn" onClick={()=>setModal({kind:'creator'})}><Plus size={16}/>Add creator</button>}/></section>}
   </>}
  </main>

  {modal&&<Overlay onClose={()=>setModal(null)}>
   {modal.kind==='deal'&&<DealForm deal={modal.deal} creators={creators} preset={creatorFilter!=='all'?creatorFilter:undefined} onCancel={()=>setModal(null)} onSave={async d=>{if(await act({action:'saveDeal',deal:d},d.id?'Deal updated':'Deal added'))setModal(null);}}/>}
   {modal.kind==='creator'&&<CreatorForm creator={modal.creator} onCancel={()=>setModal(null)} onSave={async c=>{if(await act({action:'saveCreator',creator:c},c.id?'Creator updated':'Creator added'))setModal(null);}}/>}
   {modal.kind==='password'&&<PasswordForm onCancel={()=>setModal(null)} onSave={async(current,next)=>{if(await act({action:'password',current,next},'Password changed. Other devices were signed out.'))setModal(null);}}/>}
   {modal.kind==='confirm'&&<Confirm title={modal.title} text={modal.text} onCancel={()=>setModal(null)} onOk={async()=>{await modal.run();setModal(null);}}/>}
  </Overlay>}
 </>);
}

function Stat({label,value,sub,icon:I,tone}:{label:string;value:string;sub:string;icon:typeof Clock;tone:string}){return <div className={`cx-card cx-stat t-${tone}`}><div className="cx-stat-top"><span>{label}</span><i><I size={16}/></i></div><strong>{value}</strong><small>{sub}</small></div>;}
function Badge({s}:{s:Status}){return <span className={`cx-badge s-${s}`}><i/>{STATUS.find(x=>x.key===s)!.label}</span>;}
function Due({d}:{d:Deal}){if(!d.due_date)return <span className="cx-due">—</span>;const late=d.status!=='completed'&&d.due_date<today();return <span className={`cx-due${late?' late':''}`}>{late?'Overdue · ':''}{fmtDate(d.due_date)}</span>;}
function Empty({text,action,big}:{text:string;action?:React.ReactNode;big?:boolean}){return <div className={`cx-empty${big?' big':''}`}><Briefcase size={big?28:20}/><p>{text}</p>{action}</div>;}

function DealsView({deals,creators,filter,setFilter,creatorFilter,setCreatorFilter,q,setQ,counts,onNew,onEdit,onStatus,onDelete}:{deals:Deal[];creators:Creator[];filter:Status|'all';setFilter:(s:Status|'all')=>void;creatorFilter:string;setCreatorFilter:(s:string)=>void;q:string;setQ:(s:string)=>void;counts:Record<Status,number>;onNew:()=>void;onEdit:(d:Deal)=>void;onStatus:(d:Deal,s:Status)=>void;onDelete:(d:Deal)=>void}){
 const list=deals.filter(d=>(filter==='all'||d.status===filter)&&(creatorFilter==='all'||d.creator_id===creatorFilter)&&(!q||`${d.brand} ${d.creator_name} ${d.deliverables} ${d.contact}`.toLowerCase().includes(q.toLowerCase())));
 const sum=list.reduce((a,d)=>a+d.amount,0);
 return <>
  <div className="cx-head"><div><h1>Brand deals</h1><p>Track every collaboration from first yes to final payment.</p></div><div className="cx-head-actions"><button className="cx-btn" onClick={onNew}><Plus size={16}/>New deal</button></div></div>
  <div className="cx-seg" role="tablist">
   <button role="tab" aria-selected={filter==='all'} className={filter==='all'?'on':''} onClick={()=>setFilter('all')}>All<em>{deals.length}</em></button>
   {STATUS.map(s=><button role="tab" aria-selected={filter===s.key} key={s.key} className={`${filter===s.key?'on':''} s-${s.key}`} onClick={()=>setFilter(s.key)}><i/>{s.label}<em>{counts[s.key]}</em></button>)}
  </div>
  <section className="cx-card cx-table-card">
   <div className="cx-toolbar">
    <label className="cx-search"><Search size={16}/><input value={q} onChange={e=>setQ(e.target.value)} placeholder="Search brand, creator, deliverables…"/></label>
    <select value={creatorFilter} onChange={e=>setCreatorFilter(e.target.value)} aria-label="Filter by creator"><option value="all">All creators</option>{creators.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</select>
    <span className="cx-sum">{list.length} deal{list.length===1?'':'s'} · <strong>{inr(sum)}</strong></span>
   </div>
   {list.length?<div className="cx-table-wrap"><table className="cx-table"><thead><tr><th>Brand</th><th>Creator</th><th>Deliverables</th><th className="r">Amount</th><th>Due</th><th>Status</th><th/></tr></thead><tbody>
    {list.map(d=><tr key={d.id}>
     <td data-l="Brand"><div className="cx-who"><span className="cx-av brand">{initials(d.brand)}</span><div><strong>{d.brand}</strong>{d.contact&&<small>{d.contact}</small>}</div></div></td>
     <td data-l="Creator">{d.creator_name}{d.creator_handle&&<small>@{d.creator_handle}</small>}</td>
     <td data-l="Deliverables" className="cx-deliv">{d.deliverables||<span className="cx-muted">—</span>}</td>
     <td data-l="Amount" className="r"><strong>{inr(d.amount)}</strong>{d.status!=='completed'&&d.paid?<small className="cx-paid">Paid</small>:null}</td>
     <td data-l="Due"><Due d={d}/></td>
     <td data-l="Status"><select className={`cx-status s-${d.status}`} value={d.status} onChange={e=>onStatus(d,e.target.value as Status)} aria-label="Change status">{STATUS.map(s=><option key={s.key} value={s.key}>{s.label}</option>)}</select></td>
     <td className="cx-row-actions"><button className="cx-icon sm" onClick={()=>onEdit(d)} aria-label="Edit deal"><Pencil size={15}/></button><button className="cx-icon sm danger" onClick={()=>onDelete(d)} aria-label="Delete deal"><Trash2 size={15}/></button></td>
    </tr>)}
   </tbody></table></div>:<Empty big text={deals.length?'No deals match these filters.':'No brand deals yet. Add your first one.'} action={!deals.length&&<button className="cx-btn" onClick={onNew}><Plus size={16}/>New deal</button>}/>}
  </section>
 </>;
}

function Overlay({children,onClose}:{children:React.ReactNode;onClose:()=>void}){
 useEffect(()=>{const k=(e:KeyboardEvent)=>e.key==='Escape'&&onClose();addEventListener('keydown',k);const o=document.body.style.overflow;document.body.style.overflow='hidden';return()=>{removeEventListener('keydown',k);document.body.style.overflow=o;};},[onClose]);
 return <div className="cx-overlay" onMouseDown={e=>e.target===e.currentTarget&&onClose()}><div className="cx-modal" role="dialog" aria-modal="true"><button className="cx-icon sm cx-close" onClick={onClose} aria-label="Close"><X size={17}/></button>{children}</div></div>;
}
function useSubmit(){const [busy,setBusy]=useState(false);return {busy,run:(fn:()=>Promise<void>)=>async(e:React.FormEvent)=>{e.preventDefault();if(busy)return;setBusy(true);try{await fn();}finally{setBusy(false);}}};}
function Actions({onCancel,busy,label,danger}:{onCancel:()=>void;busy:boolean;label:string;danger?:boolean}){return <div className="cx-form-actions"><button type="button" className="cx-btn ghost" onClick={onCancel}>Cancel</button><button className={`cx-btn${danger?' danger':''}`} disabled={busy}>{busy&&<Loader2 size={15} className="cx-spin"/>}{label}</button></div>;}

function DealForm({deal,creators,preset,onSave,onCancel}:{deal?:Deal;creators:Creator[];preset?:string;onSave:(d:any)=>Promise<void>;onCancel:()=>void}){
 const [f,setF]=useState({id:deal?.id,brand:deal?.brand||'',creator_id:deal?.creator_id||preset||creators[0]?.id||'',deliverables:deal?.deliverables||'',amount:deal?String(deal.amount):'',status:(deal?.status||'upcoming') as Status,paid:!!deal?.paid,start_date:deal?.start_date||'',due_date:deal?.due_date||'',contact:deal?.contact||'',notes:deal?.notes||''});
 const set=(k:keyof typeof f)=>(e:React.ChangeEvent<any>)=>setF({...f,[k]:e.target.type==='checkbox'?e.target.checked:e.target.value});
 const {busy,run}=useSubmit();
 return <form onSubmit={run(()=>onSave({...f,amount:f.amount===''?0:Number(f.amount)}))}>
  <h2>{deal?'Edit deal':'New brand deal'}</h2>
  <div className="cx-fields">
   <label>Brand<input required maxLength={100} value={f.brand} onChange={set('brand')} placeholder="e.g. Dhan" autoFocus/></label>
   <label>Creator<select required value={f.creator_id} onChange={set('creator_id')}>{creators.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</select></label>
   <label className="span2">Deliverables<input maxLength={500} value={f.deliverables} onChange={set('deliverables')} placeholder="e.g. 1 Reel + 3 Stories"/></label>
   <label>Amount (₹)<input type="number" min={0} inputMode="numeric" value={f.amount} onChange={set('amount')} placeholder="25000"/></label>
   <label>Status<select value={f.status} onChange={set('status')}>{STATUS.map(s=><option key={s.key} value={s.key}>{s.label}</option>)}</select></label>
   <label>Start date<input type="date" value={f.start_date} onChange={set('start_date')}/></label>
   <label>Due date<input type="date" value={f.due_date} onChange={set('due_date')}/></label>
   <label className="span2">Brand contact<input maxLength={200} value={f.contact} onChange={set('contact')} placeholder="Name, email or phone"/></label>
   <label className="span2">Notes<textarea rows={3} maxLength={2000} value={f.notes} onChange={set('notes')} placeholder="Briefs, links, payment terms…"/></label>
   <label className="cx-check span2"><input type="checkbox" checked={f.paid} onChange={set('paid')}/>Payment received</label>
  </div>
  <Actions onCancel={onCancel} busy={busy} label={deal?'Save changes':'Add deal'}/>
 </form>;
}

function CreatorForm({creator,onSave,onCancel}:{creator?:Creator;onSave:(c:any)=>Promise<void>;onCancel:()=>void}){
 const [f,setF]=useState({id:creator?.id,name:creator?.name||'',handle:creator?.handle||'',platform:creator?.platform||'Instagram',followers:creator?.followers!=null?String(creator.followers):'',niche:creator?.niche||'',email:creator?.email||'',phone:creator?.phone||'',notes:creator?.notes||''});
 const set=(k:keyof typeof f)=>(e:React.ChangeEvent<any>)=>setF({...f,[k]:e.target.value});
 const {busy,run}=useSubmit();
 return <form onSubmit={run(()=>onSave(f))}>
  <h2>{creator?'Edit creator':'Add creator'}</h2>
  <div className="cx-fields">
   <label>Name<input required maxLength={80} value={f.name} onChange={set('name')} placeholder="Full name" autoFocus/></label>
   <label>Handle<input maxLength={80} value={f.handle} onChange={set('handle')} placeholder="@username"/></label>
   <label>Platform<select value={f.platform} onChange={set('platform')}>{PLATFORMS.map(p=><option key={p}>{p}</option>)}</select></label>
   <label>Followers<input type="number" min={0} inputMode="numeric" value={f.followers} onChange={set('followers')} placeholder="150000"/></label>
   <label>Niche<input maxLength={60} value={f.niche} onChange={set('niche')} placeholder="e.g. Trading, Finance"/></label>
   <label>Phone<input maxLength={30} value={f.phone} onChange={set('phone')} placeholder="+91…"/></label>
   <label className="span2">Email<input type="email" maxLength={254} value={f.email} onChange={set('email')} placeholder="creator@email.com"/></label>
   <label className="span2">Notes<textarea rows={3} maxLength={1000} value={f.notes} onChange={set('notes')} placeholder="Rates, preferences, anything useful…"/></label>
  </div>
  <Actions onCancel={onCancel} busy={busy} label={creator?'Save changes':'Add creator'}/>
 </form>;
}

function PasswordForm({onSave,onCancel}:{onSave:(c:string,n:string)=>Promise<void>;onCancel:()=>void}){
 const [c,setC]=useState(''),[n,setN]=useState(''),[n2,setN2]=useState(''),[err,setErr]=useState('');const {busy,run}=useSubmit();
 return <form onSubmit={run(async()=>{if(n!==n2){setErr('New passwords do not match.');return;}setErr('');await onSave(c,n);})}>
  <h2>Change password</h2><p className="cx-sub">Other signed-in devices will be signed out.</p>
  <div className="cx-fields one">
   <label>Current password<input type="password" required autoComplete="current-password" value={c} onChange={e=>setC(e.target.value)} autoFocus/></label>
   <label>New password<input type="password" required minLength={8} autoComplete="new-password" value={n} onChange={e=>setN(e.target.value)}/></label>
   <label>Confirm new password<input type="password" required minLength={8} autoComplete="new-password" value={n2} onChange={e=>setN2(e.target.value)}/></label>
  </div>{err&&<p className="cx-err">{err}</p>}
  <Actions onCancel={onCancel} busy={busy} label="Update password"/>
 </form>;
}
function Confirm({title,text,onOk,onCancel}:{title:string;text:string;onOk:()=>Promise<void>;onCancel:()=>void}){const {busy,run}=useSubmit();return <form onSubmit={run(onOk)}><h2>{title}</h2><p className="cx-sub">{text}</p><Actions onCancel={onCancel} busy={busy} label="Delete" danger/></form>;}

function AuthScreen({mode,theme,toggleTheme,onDone}:{mode:'setup'|'login';theme:string;toggleTheme:()=>void;onDone:()=>void}){
 const [p,setP]=useState(''),[p2,setP2]=useState(''),[err,setErr]=useState('');const {busy,run}=useSubmit();const setup=mode==='setup';
 const submit=run(async()=>{setErr('');if(setup&&p!==p2){setErr('Passwords do not match.');return;}try{await call({action:mode,password:p});onDone();}catch(e:any){setErr(e.message);if(e.status===409)onDone();}});
 return <div className="cx-auth">
  <button className="cx-icon cx-auth-theme" onClick={toggleTheme} aria-label="Toggle theme">{theme==='dark'?<Sun size={17}/>:<Moon size={17}/>}</button>
  <form className="cx-auth-card" onSubmit={submit}>
   <span className="cx-auth-icon">{setup?<ShieldCheck size={22}/>:<Lock size={22}/>}</span>
   <h1>{setup?'Set up Collab Admin':'Welcome back'}</h1>
   <p>{setup?'One-time setup. Choose a password to protect this panel. You will use it every time you sign in.':'Enter your password to manage creators and brand deals.'}</p>
   <label>{setup?'Create password':'Password'}<input type="password" required minLength={setup?8:1} autoComplete={setup?'new-password':'current-password'} value={p} onChange={e=>setP(e.target.value)} autoFocus placeholder={setup?'At least 8 characters':''}/></label>
   {setup&&<label>Confirm password<input type="password" required minLength={8} autoComplete="new-password" value={p2} onChange={e=>setP2(e.target.value)}/></label>}
   {err&&<p className="cx-err">{err}</p>}
   <button className="cx-btn full" disabled={busy}>{busy&&<Loader2 size={15} className="cx-spin"/>}{setup?'Set password & continue':'Sign in'}</button>
   <small className="cx-auth-foot">EmpireX · Collab Admin</small>
  </form>
 </div>;
}
