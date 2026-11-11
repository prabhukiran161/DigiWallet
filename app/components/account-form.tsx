'use client';
import {useState} from 'react';
import {Landmark,Coins,WalletCards,TrendingUp,HandCoins,ArrowUpRight,Plus} from 'lucide-react';
import {type AccountType} from '@/lib/ledger';
import {nowLocal} from '@/lib/display';
import {Field,InfoNote,type Save} from './primitives';
export type Institution={id:string;name:string;kind:string;country:string};
const types=[{id:'bank',label:'Bank',icon:Landmark},{id:'cash',label:'Cash',icon:Coins},{id:'card',label:'Credit card',icon:WalletCards},{id:'investment',label:'Investment',icon:TrendingUp},{id:'loan',label:'Existing loan',icon:HandCoins},{id:'receivable',label:'Money lent',icon:ArrowUpRight}] as const;
export function AccountForm({institutions,save,onDone}:{institutions:Institution[];save:Save;onDone:()=>void}) {
 const [type,setType]=useState<AccountType>('bank'),[error,setError]=useState(''),[busy,setBusy]=useState(false);
 return <form onSubmit={async e=>{e.preventDefault();const d=Object.fromEntries(new FormData(e.currentTarget));setBusy(true);setError('');try{await save('account',{...d,id:crypto.randomUUID(),type,date:new Date(d.date as string).toISOString()});onDone();}catch(err){setError((err as Error).message);}finally{setBusy(false);}}}>
 <div className="type-grid" aria-label="Account type">{types.map(t=><button key={t.id} type="button" aria-pressed={type===t.id} className={type===t.id?'selected':''} onClick={()=>setType(t.id)}><t.icon size={22}/><span>{t.label}</span></button>)}</div>
 <Field label="Account name"><input name="name" required maxLength={100} placeholder="e.g. Everyday savings"/></Field>
 {type!=='cash'&&<Field label="Institution / provider"><input name="institution" list="institutions" placeholder="Search or enter a name"/><datalist id="institutions">{institutions.map(i=><option key={i.id} value={i.name}/>)}</datalist></Field>}
 <div className="amount-entry small-amount"><Field label={['card','loan'].includes(type)?'Opening debt (₹)':'Opening balance (₹)'}><input name="opening" defaultValue="0" required inputMode="decimal"/></Field></div>
 {type==='card'&&<Field label="Credit limit (₹)"><input name="limit" required inputMode="decimal" placeholder="0.00"/></Field>}
 {['loan','receivable'].includes(type)&&<><Field label={type==='loan'?'Lender':'Borrower'}><input name="counterparty" required/></Field><Field label="Purpose"><input name="purpose" placeholder="e.g. Education"/></Field><InfoNote label="Recording an existing balance">This adds existing debt or money already lent. For a new loan receipt or lending payment, use Add transaction.</InfoNote></>}
 {type==='investment'&&<Field label="Investment type"><input name="terms" placeholder="Fixed deposit, SIP, gold…"/></Field>}
 <details className="disclosure"><summary>More details</summary><Field label="Opening date and time"><input name="date" type="datetime-local" defaultValue={nowLocal()} required/></Field>{['loan','receivable'].includes(type)&&<><Field label="Agreed interest / terms"><input name="terms" placeholder="Optional"/></Field><Field label="Due date"><input name="dueDate" type="date"/></Field></>}</details>
 <InfoNote label="About opening balances">Opening balances are not income. They describe what you already own or owe.</InfoNote>{error&&<p className="error" role="alert">{error}</p>}<div className="form-footer"><button className="primary full" disabled={busy}>{busy?'Saving…':'Add account'}<Plus size={18}/></button></div>
 </form>;
}
