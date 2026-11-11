export type AccountType = 'bank'|'cash'|'card'|'investment'|'loan'|'receivable';
export type Account = {id:string; name:string; type:AccountType; opening:number; date:string; limit:number; institution:string; counterparty:string; purpose:string; loanType:string; terms:string; dueDate:string; archived:boolean; generated?:boolean};
export type Allocation = {id:string; loan:string; purpose:string; holding:string; assigned:number; remaining:number; committed:number; used:number; released:number; returned:number; commitments:Record<string,number>};
export type EventType = 'income'|'expense'|'borrow'|'transfer'|'invest'|'capitalReturn'|'cardPayment'|'lend'|'receive'|'repay'|'refund'|'release';
export type Command = {key:string; type:EventType; amount:string; account:string; description:string; date:string; notes?:string; target?:string; category?:string; counterparty?:string; purpose?:string; loanType?:string; terms?:string; dueDate?:string; interest?:string; fee?:string; reserve?:boolean; allocation?:string; returnUnused?:boolean; original?:string};
export type Line = {account:string; delta:number};
export type Journal = {id:string; type:EventType|'opening'; date:string; recordedAt:string; description:string; notes:string; category:string; lines:Line[]; expense:number; income:number; inflow:number; outflow:number; balances:Record<string,number>; command?:Command};
export type Wallet = {accounts:Account[]; events:Journal[]; allocations:Allocation[]; categories:{id:string;name:string;archived:boolean}[]; budgets:Record<string,{total:number;categories:Record<string,number>}>; timezone:string};
export const liquid=(a:Account)=>a.type==='bank'||a.type==='cash';
export const liability=(a:Account)=>a.type==='loan'||a.type==='card';
function check(condition:unknown,message:string):asserts condition {if(!condition) throw new Error(message);}
export function money(value:string):number {check(typeof value==='string'&&/^\d+(\.\d{1,2})?$/.test(value),'Enter a positive amount with at most two decimal places.'); const [whole,fraction='']=value.split('.'); const n=BigInt(whole)*100n+BigInt(fraction.padEnd(2,'0')); check(n<=100000000000000n,'Amount exceeds the supported limit.'); return Number(n);}
export function emptyWallet():Wallet {return {accounts:[],events:[],allocations:[],categories:['Food','Transport','Shopping','Bills','Other'].map(name=>({id:name.toLowerCase(),name,archived:false})),budgets:{},timezone:'Asia/Kolkata'};}
export function balance(w:Wallet,id:string):number {const a=w.accounts.find(a=>a.id===id); check(a,'Account not found.'); return w.events.reduce((sum,e)=>sum+e.lines.filter(l=>l.account===id).reduce((n,l)=>n+l.delta,0),0)*(liability(a)?-1:1)||0;}
export function localDate(date:string,timezone:string) {return new Intl.DateTimeFormat('en-CA',{timeZone:timezone,year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date(date));}
export function summary(w:Wallet,month:string) {const events=w.events.filter(e=>localDate(e.date,w.timezone).startsWith(month)); const available=w.accounts.filter(liquid).reduce((s,a)=>s+balance(w,a.id),0); const netWorth=w.accounts.reduce((s,a)=>s+balance(w,a.id)*(liability(a)?-1:1),0); const reserved=w.allocations.reduce((s,a)=>s+a.remaining,0); return {available,netWorth,reserved,unallocated:available-reserved,income:events.reduce((s,e)=>s+e.income,0),expenses:events.reduce((s,e)=>s+e.expense,0),inflow:events.reduce((s,e)=>s+e.inflow,0),outflow:events.reduce((s,e)=>s+e.outflow,0)};}
export type AccountInput = {id:string;name:string;type:AccountType;opening?:string;date:string;limit?:string;institution?:string;counterparty?:string;purpose?:string;loanType?:string;terms?:string;dueDate?:string};
export function createAccount(w:Wallet,input:AccountInput):Wallet {
 check(!input.id.startsWith('system:')&&!input.id.startsWith('opening-'),'Reserved account identifier.');
 check(!w.accounts.some(a=>a.id===input.id),'Account already exists.'); check(input.name.trim().length>0&&input.name.length<=100,'Enter an account name (maximum 100 characters).'); check(['bank','cash','card','investment','loan','receivable'].includes(input.type),'Invalid account type.'); validDate(input.date);
 const a:Account={...input,name:input.name.trim(),date:new Date(input.date).toISOString(),opening:money(input.opening||'0'),limit:money(input.limit||'0'),institution:input.institution||'',counterparty:input.counterparty||'',purpose:input.purpose||'',loanType:input.loanType||'',terms:input.terms||'',dueDate:input.dueDate||'',archived:false};
 check(a.type!=='card'||a.opening<=a.limit,'Opening debt exceeds credit limit.'); return rebuild({...structuredClone(w),accounts:[...w.accounts,a]},w.events.flatMap(e=>e.command?[e.command]:[]));
}
function validDate(date:string) {check(typeof date==='string'&&/T.*(?:Z|[+-]\d\d:\d\d)$/.test(date)&&Number.isFinite(Date.parse(date)),'Enter a timestamp with timezone.'); check(Date.parse(date)<=Date.now(),'Future transactions cannot be posted.');}
function canonical(c:Command) {return JSON.stringify(Object.fromEntries(Object.entries(c).filter(([,v])=>v!==undefined).sort(([a],[b])=>a.localeCompare(b))));}
export function post(w:Wallet,c:Command):Wallet {
 const old=w.events.find(e=>e.command?.key===c.key); if(old){check(canonical(old.command!)===canonical(c),'Idempotency conflict: this request key has different details.');return structuredClone(w);}
 check(c.key.length>0&&c.key.length<=100,'Invalid request key.'); check(c.description.trim().length>0&&c.description.length<=200,'Description is required (maximum 200 characters).'); check((c.notes||'').length<=2000,'Notes are too long.'); validDate(c.date);
 if(c.type==='expense'||(c.type==='repay'&&(money(c.interest||'0')+money(c.fee||'0')>0)))check(w.categories.some(cat=>cat.id===(c.category||'other')&&!cat.archived),'Choose an active expense category.');
 for(const id of [c.account,c.target].filter(Boolean)){const a=w.accounts.find(a=>a.id===id); check(a&&!a.archived,'Choose an active account belonging to this wallet.');}
 return rebuild(w,[...w.events.flatMap(e=>e.command?[e.command]:[]),c]);
}
function rebuild(source:Wallet,commands:Command[]):Wallet {
 const w=structuredClone(source); w.accounts=w.accounts.filter(a=>!a.generated); w.events=[]; w.allocations=[];
 const items=[...w.accounts.map((a,i)=>({date:a.date,seq:i,account:a})),...commands.map((command,i)=>({date:command.date,seq:w.accounts.length+i,command}))].sort((a,b)=>Date.parse(a.date)-Date.parse(b.date)||a.seq-b.seq);
 for(const item of items) {
  if('account' in item) {const a=item.account; const amount=a.opening*(liability(a)?-1:1); w.events.push({id:`opening-${a.id}`,type:'opening',date:a.date,recordedAt:a.date,description:`Opening balance · ${a.name}`,notes:'',category:'',lines:amount?[{account:a.id,delta:amount},{account:'system:equity',delta:-amount}]:[],expense:0,income:0,inflow:0,outflow:0,balances:{}});}
  else apply(w,item.command);
  const last=w.events.at(-1)!; last.balances=Object.fromEntries(w.accounts.map(a=>[a.id,balance(w,a.id)]));
  for(const a of w.accounts){const n=balance(w,a.id); check(Number.isSafeInteger(n)&&Math.abs(n)<=100000000000000,'Balance exceeds supported range.'); check(n>=0,`Insufficient funds or principal balance in ${a.name}.`); check(a.type!=='card'||n<=a.limit,`Credit limit exceeded for ${a.name}.`); const reserved=w.allocations.filter(f=>f.holding===a.id).reduce((s,f)=>s+f.remaining,0); check(!liquid(a)||reserved<=n,`Reserved money in ${a.name} must be released or moved before spending.`);}
  for(const f of w.allocations) check(f.remaining>=0&&f.committed>=0&&f.committed<=f.remaining,'Insufficient remaining purpose funding.');
  for(const card of w.accounts.filter(a=>a.type==='card'))check(w.allocations.reduce((s,f)=>s+(f.commitments[card.id]||0),0)<=balance(w,card.id),'Select the funding commitment when settling this card.');
  check(Number.isSafeInteger(w.accounts.reduce((s,a)=>s+balance(w,a.id),0)),'Total balances exceed the exact integer range.');
 }
 // Effective ordering changes projections, never the original server recording time.
 for(const e of w.events) e.recordedAt=source.events.find(old=>old.id===e.id)?.recordedAt||e.recordedAt;
 for(const a of w.accounts.filter(a=>a.generated)){const previous=source.accounts.find(old=>old.id===a.id);if(previous){a.name=previous.name;a.archived=previous.archived;}}
 return w;
}
function apply(w:Wallet,c:Command) {
 const amount=money(c.amount), interest=money(c.interest||'0'),fee=money(c.fee||'0'); check(amount>0,'Amount must be greater than zero.');
 const find=(id:string|undefined)=>{const a=w.accounts.find(a=>a.id===id);check(a,'Account not found in this wallet.');check(Date.parse(c.date)>=Date.parse(a.date),'Transaction predates account opening.');return a;};
 const a=find(c.account); const target=c.target?find(c.target):undefined; const is=(a:Account|undefined,types:AccountType[])=>!!a&&types.includes(a.type);
 const f=c.allocation?w.allocations.find(f=>f.id===c.allocation):undefined; check(!c.allocation||f,'Funding allocation not found.');
 const e:Journal={id:c.key,type:c.type,date:new Date(c.date).toISOString(),recordedAt:new Date().toISOString(),description:c.description.trim(),notes:c.notes||'',category:c.category||'other',lines:[],expense:0,income:0,inflow:0,outflow:0,balances:{},command:structuredClone(c)};
 const line=(account:string,delta:number)=>{if(delta)e.lines.push({account,delta});};
 const pair=(debit:string,credit:string,n:number)=>{line(debit,n);line(credit,-n);};
 const consume=(n:number,card=false)=>{if(!f)return; check(n<=f.remaining-f.committed,'Insufficient remaining purpose funding.'); if(card){f.committed+=n;f.commitments[a.id]=(f.commitments[a.id]||0)+n;}else{check(f.holding===a.id,'Funding must be held in the selected payment account.');f.remaining-=n;} f.used+=n;};
 const generated=(type:'loan'|'receivable')=>{check(c.counterparty?.trim(),'Enter the lender or borrower.'); const id=`${type}-${c.key}`; const account:Account={id,type,name:type==='loan'?`${c.loanType||'Loan'} · ${c.counterparty}`:`Lent · ${c.counterparty}`,counterparty:c.counterparty!,purpose:c.purpose||'',loanType:c.loanType||'Personal',terms:c.terms||'',dueDate:c.dueDate||'',date:e.date,opening:0,limit:0,institution:c.counterparty!,archived:false,generated:true}; w.accounts.push(account);return account;};
 switch(c.type) {
  case 'income': check(liquid(a),'Income requires a bank or cash account.'); pair(a.id,'system:income',amount);e.income=amount;break;
  case 'expense': check(is(a,['bank','cash','card']),'Choose bank, cash or card for an expense.'); pair('system:expense',a.id,amount); e.expense=amount; consume(amount,a.type==='card'); break;
  case 'borrow': {check(a.type==='bank','Borrowed money must enter a bank account.');check(!target||target.type==='loan','Choose an existing loan.');check(target||!w.accounts.some(a=>a.id===`loan-${c.key}`),'Generated loan account already exists.'); const loan=target||generated('loan'); pair(a.id,loan.id,amount); if(c.reserve){w.allocations.push({id:`fund-${c.key}`,loan:loan.id,purpose:c.purpose||loan.purpose||'Loan purpose',holding:a.id,assigned:amount,remaining:amount,committed:0,used:0,released:0,returned:0,commitments:{}});}break;}
  case 'transfer': check(liquid(a)&&target&&liquid(target)&&a.id!==target.id,'Choose two different bank or cash accounts.'); pair(target!.id,a.id,amount);if(f){check(f.holding===a.id&&f.remaining===amount,'Move the complete reservation, or release a portion first.');f.holding=target!.id;}break;
  case 'invest': check(a.type==='bank'&&target?.type==='investment','Investment contributions require a bank and investment account.');pair(target!.id,a.id,amount);consume(amount);break;
  case 'capitalReturn': check(a.type==='bank'&&target?.type==='investment','Choose receiving bank and investment.');pair(a.id,target!.id,amount);break;
  case 'cardPayment': check(a.type==='bank'&&target?.type==='card','Card payments require a bank and card.');pair(target!.id,a.id,amount);if(f){check(f.holding===a.id&&amount<=(f.commitments[target!.id]||0),'Payment must match an unsettled commitment at this bank.');f.remaining-=amount;f.committed-=amount;f.commitments[target!.id]-=amount;}break;
  case 'lend': {check(liquid(a),'Lending requires bank or cash.');check(!target||target.type==='receivable','Choose a receivable.');check(target||!w.accounts.some(a=>a.id===`receivable-${c.key}`),'Generated receivable already exists.');const receivable=target||generated('receivable');pair(receivable.id,a.id,amount);consume(amount);break;}
  case 'receive': check(liquid(a)&&target?.type==='receivable','Choose receiving bank or cash and a receivable.');pair(a.id,target!.id,amount);pair(a.id,'system:income',interest);e.income=interest;break;
  case 'repay': check(liquid(a)&&target?.type==='loan','Choose bank or cash and an existing loan.');pair(target!.id,a.id,amount);pair('system:expense',a.id,interest+fee);e.expense=interest+fee;if(c.returnUnused){check(f&&f.loan===target!.id&&f.holding===a.id&&amount<=f.remaining-f.committed,'Choose sufficient uncommitted funding for this loan and bank.');f.remaining-=amount;f.returned+=amount;}else check(!f,'Only unused principal returns can consume a repayment allocation.');break;
  case 'refund': {const original=w.events.find(o=>o.id===c.original);check(original?.type==='expense'&&original.command?.account===a.id,'Select an original expense from this payment account.');check(!original.command.allocation,'Funded refunds need allocation restoration and are not supported yet.');const already=w.events.filter(o=>o.command?.original===c.original).reduce((s,o)=>s-o.expense,0);check(amount<=original.expense-already,'Refund exceeds the original expense.');pair(a.id,'system:expense',amount);e.expense=-amount;e.category=original.category;break;}
  case 'release': check(f&&f.holding===a.id&&amount<=f.remaining-f.committed,'Choose uncommitted reserved funds in this bank.');f.remaining-=amount;f.released+=amount;break;
  default: throw new Error('Unsupported transaction type.');
 }
 check(!interest||['repay','receive'].includes(c.type),'Interest is only supported on repayments.');check(!fee||c.type==='repay','Fees must be recorded as expenses.');
 check(!f||['expense','invest','lend','transfer','cardPayment','repay','release'].includes(c.type),'Funding is not supported for this event.');
 if(e.expense>0) check(w.categories.some(cat=>cat.id===e.category),'Select an expense category.');
 const cash=e.lines.filter(l=>w.accounts.some(a=>a.id===l.account&&liquid(a))).reduce((s,l)=>s+l.delta,0);e.inflow=Math.max(cash,0);e.outflow=Math.max(-cash,0);
 check(e.lines.reduce((s,l)=>s+l.delta,0)===0,'Journal does not balance.');w.events.push(e);
}
