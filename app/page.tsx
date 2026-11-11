'use client';
import {useCallback,useEffect,useState} from 'react';
import {Wallet as WalletIcon,House,WalletCards,Plus,ArrowDownLeft,ArrowUpRight,ArrowLeftRight,ChevronLeft,ChevronRight,ChartNoAxesCombined,History as HistoryIcon,Eye,EyeOff,ArrowRight,LogOut,Check} from 'lucide-react';
import {balance,localDate,summary,type Wallet,type EventType} from '@/lib/ledger';
import {currency} from '@/lib/display';
import {Auth} from './components/auth';
import {Modal,Empty,InfoNote} from './components/primitives';
import {TransactionForm} from './components/transaction-form';
import {AccountForm,type Institution} from './components/account-form';
import {AccountCards} from './components/accounts';
import {History,Heatmap} from './components/history';
import {BudgetView,Settings} from './components/budgets';
type View='Home'|'Accounts'|'Activity'|'Budget'|'Settings';
const filters=['All','Bank & cash','Cards','Investments','Borrowed','Lent'] as const;
type AccountFilter=typeof filters[number];
export default function Home() {
 const [user,setUser]=useState<{name:string}|null>(null),[wallet,setWallet]=useState<Wallet|null>(null),[institutions,setInstitutions]=useState<Institution[]>([]);
 const [loading,setLoading]=useState(true),[error,setError]=useState(''),[view,setView]=useState<View>('Home'),[modal,setModal]=useState(''),[entry,setEntry]=useState<EventType>('expense');
 const [day,setDay]=useState(''),[month,setMonth]=useState(()=>localDate(new Date().toISOString(),'Asia/Kolkata').slice(0,7)),[notice,setNotice]=useState(''),[hidden,setHidden]=useState(false),[filter,setFilter]=useState<AccountFilter>('All');
 const load=useCallback(async()=>{
  setLoading(true);setError('');
  try{
    const rAuth=await fetch('/api/auth');
    const textAuth=await rAuth.text().catch(()=>'');
    let authData:{user?:{name:string}|null;error?:string}={};
    try{authData=JSON.parse(textAuth);}catch{}
    if(!rAuth.ok)throw new Error(authData.error||`Authentication service error (${rAuth.status})`);
    setUser(authData.user||null);
    if(authData.user){
      const res=await fetch('/api/wallet');
      const textWallet=await res.text().catch(()=>'');
      let data:{wallet?:Wallet;institutions?:Institution[];error?:string}={};
      try{data=JSON.parse(textWallet);}catch{}
      if(!res.ok)throw new Error(data.error||`Wallet service error (${res.status})`);
      if(data.wallet)setWallet(data.wallet);
      if(data.institutions)setInstitutions(data.institutions);
    }
  }catch(err){setError((err as Error).message);}
  finally{setLoading(false);}
 },[]);
 useEffect(()=>{void load();},[load]);
 useEffect(()=>{if(!notice)return;const timer=setTimeout(()=>setNotice(''),3500);return ()=>clearTimeout(timer);},[notice]);
 async function save(action:string,data:unknown) {
  const res=await fetch('/api/wallet',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action,data})});
  const text=await res.text().catch(()=>'');
  let result:{wallet?:Wallet;institutions?:Institution[];error?:string}={};
  try{result=JSON.parse(text);}catch{}
  if(!res.ok)throw new Error(result.error||(text?text.slice(0,100):`Unable to save (${res.status}).`));
  if(result.wallet)setWallet(result.wallet);
  if(result.institutions)setInstitutions(result.institutions);
  setNotice('Saved');
 }
 function navigate(next:View){setView(next);setDay('');window.scrollTo({top:0,behavior:'instant'});}
 function record(type:EventType='expense'){setEntry(type);setModal('transaction');}
 function changeMonth(n:number){const [y,m]=month.split('-').map(Number),date=new Date(y,m-1+n,1);setMonth(`${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}`);setDay('');}
 if(loading)return <main className="phone-shell loading" role="status"><span className="brand-mark"><WalletIcon size={29}/></span><h2>Opening your wallet</h2><div className="loading-bar"/></main>;
 if(error)return <main className="phone-shell loading"><p role="alert">{error}</p><button className="primary" onClick={()=>void load()}>Try again</button></main>;
 if(!user)return <Auth onDone={()=>void load()}/>;
 if(!wallet)return null;
 const s=summary(wallet,month),budget=wallet.budgets[month],active=wallet.accounts.filter(a=>!a.archived);
 const accounts=active.filter(a=>filter==='All'||filter==='Bank & cash'&&['bank','cash'].includes(a.type)||filter==='Cards'&&a.type==='card'||filter==='Investments'&&a.type==='investment'||filter==='Borrowed'&&a.type==='loan'||filter==='Lent'&&a.type==='receivable');
 const amount=(n:number)=>hidden?'••••••':currency(n);
 const monthControl=<div className="month-picker"><button aria-label="Previous month" onClick={()=>changeMonth(-1)}><ChevronLeft size={16}/></button><input aria-label="Reporting month" type="month" value={month} onChange={e=>{if(e.target.value)setMonth(e.target.value);setDay('');}}/><button aria-label="Next month" onClick={()=>changeMonth(1)}><ChevronRight size={16}/></button></div>;
 return <div className="phone-shell"><a className="skip-link" href="#main">Skip to content</a>
  <header className="app-header">{view==='Home'?<><div className="greeting"><span className="brand-mark small"><WalletIcon size={21}/></span><div><span className="muted">Hello, {user.name.split(' ')[0]}</span><h1>Your DigiWallet<span>.</span></h1></div></div><button className="avatar" onClick={()=>navigate('Settings')} aria-label="Open profile and settings">{user.name.slice(0,1).toUpperCase()}</button></>:<><button className="icon-button" onClick={()=>navigate('Home')} aria-label="Back to home"><ChevronLeft size={22}/></button><h1>{view==='Activity'?'Your activity':view==='Settings'?'Profile & settings':view==='Budget'?'Your budget':'Your accounts'}</h1>{view==='Accounts'?<button className="icon-button" onClick={()=>setModal('account')} aria-label="Add account"><Plus size={21}/></button>:<span className="header-spacer"/>}</>}</header>
  <main id="main" className="mobile-content">
   {view==='Home'&&<>
    <section className="balance-card"><div className="balance-label"><span>Available balance</span><button className="balance-eye" onClick={()=>setHidden(!hidden)} aria-label={hidden?'Show balances':'Hide balances'} aria-pressed={hidden}>{hidden?<EyeOff size={17}/>:<Eye size={17}/>}</button></div><strong className="hero-amount">{amount(s.available)}</strong><span className="balance-caption">Bank + cash</span><div className="balance-rule"/><div className="balance-secondary"><div><span>Net worth</span><strong>{amount(s.netWorth)}</strong></div><div><span>Reserved</span><strong>{amount(s.reserved)}</strong></div><span className="card-symbol" aria-hidden="true"><WalletCards size={29}/></span></div></section>
    <div className="quick-actions"><button onClick={()=>record('income')}><span><ArrowDownLeft/></span>Credit</button><button onClick={()=>record('expense')}><span><ArrowUpRight/></span>Debit</button><button onClick={()=>record('transfer')}><span><ArrowLeftRight/></span>Transfer</button><button onClick={()=>{setFilter('Borrowed');navigate('Accounts');}}><span><WalletCards/></span>Loans</button></div>
    <div className="section-head"><h2>My accounts <span className="count">{active.length}</span></h2><button className="text-button" onClick={()=>{setFilter('All');navigate('Accounts');}}>See all<ArrowRight size={14}/></button></div>
    {active.length?<AccountCards wallet={wallet} accounts={active} month={month} save={save} compact hidden={hidden}/>:<Empty title="Your wallet starts here"><p>Add a bank account or cash balance.</p><button className="primary" onClick={()=>setModal('account')}><Plus size={16}/>Add account</button></Empty>}
    <div className="section-head month-heading"><h2>This month</h2>{monthControl}</div>
    <div className="flow-grid"><div><span className="flow-icon in"><ArrowDownLeft size={17}/></span><span>Liquid inflow<strong>{amount(s.inflow)}</strong></span></div><div><span className="flow-icon out"><ArrowUpRight size={17}/></span><span>Liquid outflow<strong>{amount(s.outflow)}</strong></span></div></div>
    <button className="budget-peek" onClick={()=>navigate('Budget')}><span className="budget-peek-icon"><ChartNoAxesCombined size={22}/></span><span><strong>{budget?`${amount(budget.total-s.expenses)} left`:'Set your monthly budget'}</strong><small>{budget?'Monthly budget':'A little plan. A clearer month.'}</small></span><ChevronRight size={18}/>{budget&&<progress max={Math.max(budget.total,s.expenses,1)} value={Math.max(s.expenses,0)} aria-label="Monthly budget used"/>}</button>
    <History wallet={wallet} month={month} compact onSeeAll={()=>navigate('Activity')} hidden={hidden}/>
    <InfoNote label="What’s included?">Available is bank and cash, including borrowed funds. Net worth includes investments and money lent, less debts. Unallocated cash: {amount(s.unallocated)}.</InfoNote>
   </>}
   {view==='Accounts'&&<>
    <div className="chips" aria-label="Account types">{filters.map(f=><button key={f} aria-pressed={filter===f} className={filter===f?'selected':''} onClick={()=>setFilter(f)}>{f}</button>)}</div>
    {['Borrowed','Lent','Investments'].includes(filter)&&<div className="section-total"><span>{filter==='Borrowed'?'Total outstanding':filter==='Lent'?'Owed to you':'Recorded value'}</span><strong>{currency(accounts.reduce((n,a)=>n+balance(wallet,a.id),0))}</strong><button className="primary soft" onClick={()=>record(filter==='Borrowed'?'borrow':filter==='Lent'?'lend':'invest')}><Plus size={16}/>{filter==='Borrowed'?'Borrow money':filter==='Lent'?'Lend money':'Contribute'}</button></div>}
    {accounts.length?<AccountCards wallet={wallet} accounts={accounts} month={month} save={save}/>:<Empty title="No accounts here yet"><button className="primary" onClick={()=>setModal('account')}><Plus size={16}/>Add account</button></Empty>}
    {wallet.accounts.some(a=>a.archived)&&<details className="disclosure"><summary>Archived accounts</summary><AccountCards wallet={wallet} accounts={wallet.accounts.filter(a=>a.archived)} month={month} save={save}/></details>}
   </>}
   {view==='Activity'&&<><div className="section-head"><span className="section-subtitle">All your money moves</span>{monthControl}</div><History wallet={wallet} month={month} day={day} onClearDay={()=>setDay('')}/><Heatmap wallet={wallet} month={month} onDay={d=>{setDay(d);window.scrollTo({top:0,behavior:'smooth'});}}/></>}
   {view==='Budget'&&<><div className="section-head"><span className="section-subtitle">Make it a good month</span>{monthControl}</div><BudgetView key={month} wallet={wallet} month={month} save={save}/><Heatmap wallet={wallet} month={month} onDay={d=>{navigate('Activity');setDay(d);}}/></>}
   {view==='Settings'&&<><div className="profile-card"><span className="avatar large">{user.name.slice(0,1).toUpperCase()}</span><h2>{user.name}</h2><span className="pill">Personal wallet · INR</span></div><Settings wallet={wallet} save={save}/><button className="logout-button" onClick={async()=>{try{const r=await fetch('/api/auth',{method:'DELETE'});if(!r.ok)throw new Error('Could not sign out. Try again.');setUser(null);setWallet(null);}catch(e){setNotice((e as Error).message);}}}><LogOut size={17}/>Sign out</button></>}
  </main>
  <nav className="bottom-nav" aria-label="Main navigation"><button aria-current={view==='Home'?'page':undefined} onClick={()=>navigate('Home')}><House size={21}/><span>Home</span></button><button aria-current={view==='Accounts'?'page':undefined} onClick={()=>navigate('Accounts')}><WalletCards size={21}/><span>Accounts</span></button><button className="nav-add" aria-label="Add transaction" onClick={()=>record()}><span><Plus size={25}/></span></button><button aria-current={view==='Activity'?'page':undefined} onClick={()=>navigate('Activity')}><HistoryIcon size={21}/><span>Activity</span></button><button aria-current={view==='Budget'?'page':undefined} onClick={()=>navigate('Budget')}><ChartNoAxesCombined size={21}/><span>Budget</span></button></nav>
  {notice&&<div role="status" className="toast"><Check size={17}/>{notice}</div>}
  {modal&&<Modal title={modal==='transaction'?'New transaction':'Add account'} onClose={()=>setModal('')}>{modal==='transaction'?<TransactionForm wallet={wallet} save={save} initialType={entry} onDone={()=>setModal('')}/>:<AccountForm institutions={institutions} save={save} onDone={()=>setModal('')}/>}</Modal>}
 </div>;
}
