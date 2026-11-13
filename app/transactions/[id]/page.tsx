'use client';
import {useEffect,useState} from 'react';
import {useParams} from 'next/navigation';
import {ArrowLeft,Pencil,ArrowUpRight} from 'lucide-react';
import {availableBalance,withinEditWindow,localDate,type Wallet,type Journal} from '@/lib/ledger';
import {currency,labels} from '@/lib/display';
import {TransactionForm} from '../../components/transaction-form';
import {CategoryIcon} from '../../components/category-icon';
import {amountLabel} from '../../components/history';
export default function TransactionDetails(){
 const {id}=useParams<{id:string}>();
 const [wallet,setWallet]=useState<Wallet|null>(null),[error,setError]=useState(''),[editing,setEditing]=useState(false),[loading,setLoading]=useState(true),[now,setNow]=useState(Date.now()),[back,setBack]=useState('/?view=Activity');
 useEffect(()=>{const q=new URLSearchParams(window.location.search);setEditing(q.get('edit')==='1');setBack(q.get('account')?`/?view=Accounts&account=${encodeURIComponent(q.get('account')!)}&month=${q.get('month')||''}`:`/?view=Activity&month=${q.get('month')||''}`);const abort=new AbortController();fetch('/api/wallet',{signal:abort.signal}).then(async r=>{const d=await r.json();if(!r.ok)throw new Error(d.error||'Could not load transaction.');setWallet(d.wallet);if(d.wallet.accounts.some((a:{id:string;closedAt?:string})=>a.id===q.get('account')&&a.closedAt))setBack(`/?view=Settings&closed=${encodeURIComponent(q.get('account')!)}&month=${q.get('month')||''}`);}).catch(e=>{if(!abort.signal.aborted)setError(e.message);}).finally(()=>{if(!abort.signal.aborted)setLoading(false);});const timer=setInterval(()=>setNow(Date.now()),1000);return()=>{abort.abort();clearInterval(timer);};},[id]);
 const event=wallet?.events.find(e=>e.id===id),canEdit=!!event?.command&&withinEditWindow(event.recordedAt,now);
 async function save(action:string,data:unknown){const r=await fetch('/api/wallet',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action,data})});const d=await r.json();if(!r.ok)throw new Error(d.error||'Unable to save.');setWallet(d.wallet);}
 const format=(date:string)=>new Date(date).toLocaleString('en-IN',{timeZone:wallet?.timezone,dateStyle:'medium',timeStyle:'short'});
 return <div className="phone-shell transaction-page"><header className="app-header"><a className="icon-button" href={back} aria-label="Back to transactions"><ArrowLeft size={21}/></a><h1>{editing&&canEdit?'Edit transaction':'Transaction details'}</h1><span className="header-spacer"/></header><main className="mobile-content">
 {loading?<p role="status">Loading transaction…</p>:error?<p className="error" role="alert">{error}</p>:!wallet||!event?<p>Transaction not found.</p>:editing&&canEdit?<TransactionForm key={`${event.id}-${event.revision||0}`} wallet={wallet} editing={event} save={save} onDone={()=>setEditing(false)}/>:<>
 <div className="transaction-receipt"><span className="receipt-icon"><CategoryIcon wallet={wallet} category={event.category} size={29}/></span><span className="pill">{labels[event.type]}</span><strong className="receipt-amount">{amountLabel(event)}</strong><h2>{event.description}</h2><p>{format(event.date)}</p></div>
 {canEdit?<button className="primary full" onClick={()=>setEditing(true)}><Pencil size={17}/>Edit transaction</button>:event.command&&<p className="notice">The 24-hour editing window has ended.</p>}
 <dl className="receipt-fields"><div><dt>Category</dt><dd>{wallet.categories.find(c=>c.id===event.category)?.name||'Not applicable'}</dd></div><div><dt>Recorded</dt><dd>{format(event.recordedAt)}</dd></div><div><dt>Timezone</dt><dd>{wallet.timezone}</dd></div>{event.command&&<><div><dt>{['income','borrow','receive','refund','capitalReturn'].includes(event.type)?'Receiving account':'Payment account'}</dt><dd>{wallet.accounts.find(a=>a.id===event.command?.account)?.name}</dd></div>{event.command.target&&<div><dt>Linked account</dt><dd>{wallet.accounts.find(a=>a.id===event.command?.target)?.name}</dd></div>}</>}
 {event.notes&&<div><dt>Notes</dt><dd>{event.notes}</dd></div>}
 {event.command&&Object.entries(event.command).filter(([key,value])=>['counterparty','purpose','loanType','terms','dueDate','interest','fee','returnUnused'].includes(key)&&value!==undefined&&value!==''&&value!==false).map(([key,value])=><div key={key}><dt>{({counterparty:'Lender / borrower',purpose:'Purpose',loanType:'Loan type',terms:'Terms',dueDate:'Due date',interest:'Interest (₹)',fee:'Fee (₹)',returnUnused:'Unused funds returned'} as Record<string,string>)[key]}</dt><dd>{String(value)}</dd></div>)}
 {(event.command?.loanFunding||event.command?.allocation)&&<div><dt>Loan funding</dt><dd>{wallet.accounts.find(a=>a.id===(event.command?.loanFunding||wallet.allocations.find(f=>f.id===event.command?.allocation)?.loan))?.name}</dd></div>}
 </dl><h2 className="form-section-title">Balances after this transaction</h2><div className="receipt-balances">{wallet.accounts.filter(a=>event.lines.some(l=>l.account===a.id)||event.id===`opening-${a.id}`||event.command?.account===a.id||event.command?.loanFunding===a.id).map(a=><div key={a.id}><span>{a.name}<small>{a.type==='card'?'Available credit':a.type==='loan'?'Loan outstanding':'Balance'}</small></span><strong>{currency(availableBalance(wallet,a,event.date,event))}</strong></div>)}</div>
 {!!event.revisions?.length&&<details className="disclosure"><summary>Edit history · {event.revisions.length}</summary>{event.revisions.map((r,i)=><div className="revision-record" key={i}><strong>Before edit {i+1} · {format(r.editedAt)}</strong><dl className="receipt-fields">{Object.entries(r.command).filter(([key])=>key!=='key').map(([key,value])=><div key={key}><dt>{key}</dt><dd>{['account','target','loanFunding'].includes(key)?wallet.accounts.find(a=>a.id===value)?.name||String(value):String(value)}</dd></div>)}</dl></div>)}</details>}
 <details className="disclosure"><summary>Record identifier</summary><p className="record-id">{event.id}</p></details>
 </>}
 </main></div>;
}
