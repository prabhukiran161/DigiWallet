import type { ISql } from 'postgres';
import { randomUUID } from 'node:crypto';
import { liability, emptyWallet, upgradeWallet, money, type Wallet, type Account, type Journal, type Allocation } from '../ledger';

type Db = ISql;
const byId = <T extends { id: string }>(xs: T[]) => new Map(xs.map(x => [x.id, x]));
const stable = (x: unknown) => JSON.stringify(x, (_k, v) => v && typeof v === 'object' && !Array.isArray(v) ? Object.fromEntries(Object.entries(v).sort(([a],[b])=>a.localeCompare(b))) : v);
function accountBalances(wallet:Wallet){
 const totals=new Map(wallet.accounts.map(a=>[a.id,0]));
 for(const event of wallet.events)for(const line of event.lines)if(totals.has(line.account))totals.set(line.account,totals.get(line.account)!+line.delta);
 for(const account of wallet.accounts)if(liability(account))totals.set(account.id,-totals.get(account.id)!);
 return totals;
}
function row(a: Account, walletId: string, position:number, institutionId:string|null, currentBalance:number) {
  return {wallet_id:walletId,id:a.id,position,name:a.name,type:a.type,opening_paise:a.opening,opening_date:new Date(a.date).toISOString(),balance_paise:currentBalance,credit_limit_paise:a.limit,institution_id:institutionId,counterparty:a.counterparty,purpose:a.purpose,loan_type:a.loanType,terms:a.terms,due_date:a.dueDate,archived:a.archived,generated:!!a.generated,created_at:a.createdAt?new Date(a.createdAt).toISOString():null,closed_at:a.closedAt?new Date(a.closedAt).toISOString():null,credit_limit_history:a.limitHistory??[],metadata:{institution:a.institution}};
}
function parseAccount(r:any):Account{return {id:r.id,name:r.name,type:r.type,opening:Number(r.opening_paise),date:new Date(r.opening_date).toISOString(),limit:Number(r.credit_limit_paise),institution:r.metadata?.institution??'',counterparty:r.counterparty,purpose:r.purpose,loanType:r.loan_type,terms:r.terms,dueDate:r.due_date,archived:r.archived,generated:r.generated||undefined,createdAt:r.created_at?new Date(r.created_at).toISOString():undefined,closedAt:r.closed_at?new Date(r.closed_at).toISOString():undefined,limitHistory:r.credit_limit_history?.length?r.credit_limit_history:undefined};}
function eventRow(e:Journal,walletId:string){
 const command=e.command??null;
 return {wallet_id:walletId,id:e.id,type:e.type,effective_at:new Date(e.date).toISOString(),recorded_at:new Date(e.recordedAt).toISOString(),description:e.description,notes:e.notes,category_id:e.category||null,amount_paise:command?.amount?money(command.amount):0,income_paise:e.income,expense_paise:e.expense,inflow_paise:e.inflow,outflow_paise:e.outflow,revision:e.revision??0,details:{command,balances:e.balances,availableBalances:e.availableBalances}};
}
function parseEvent(r:any,lines:any[],revisions:any[]):Journal{return {id:r.id,type:r.type,date:new Date(r.effective_at).toISOString(),recordedAt:new Date(r.recorded_at).toISOString(),description:r.description,notes:r.notes,category:r.category_id??'',lines:lines.map(l=>({account:l.account_id??`system:${l.system_account}`,delta:Number(l.amount_paise)})),expense:Number(r.expense_paise),income:Number(r.income_paise),inflow:Number(r.inflow_paise),outflow:Number(r.outflow_paise),balances:r.details?.balances??{},availableBalances:r.details?.availableBalances,command:r.details?.command??undefined,revision:Number(r.revision),revisions};}

export async function readWallet(db:Db,user:string):Promise<Wallet>{
 const result=await db.unsafe(`SELECT to_jsonb(w) AS wallet,
   coalesce((SELECT jsonb_agg(to_jsonb(a) ORDER BY a.position) FROM dw_accounts a WHERE a.wallet_id=w.id),'[]'::jsonb) AS accounts,
   coalesce((SELECT jsonb_agg(to_jsonb(c) ORDER BY c.position) FROM dw_categories c WHERE c.wallet_id=w.id),'[]'::jsonb) AS categories,
   coalesce((SELECT jsonb_agg(to_jsonb(t) ORDER BY t.position) FROM dw_transactions t WHERE t.wallet_id=w.id),'[]'::jsonb) AS transactions,
   coalesce((SELECT jsonb_agg(to_jsonb(e) ORDER BY e.transaction_id,e.line_no) FROM dw_transaction_entries e WHERE e.wallet_id=w.id),'[]'::jsonb) AS entries,
   coalesce((SELECT jsonb_agg(to_jsonb(r) ORDER BY r.transaction_id,r.revision) FROM dw_transaction_revisions r WHERE r.wallet_id=w.id),'[]'::jsonb) AS revisions,
   coalesce((SELECT jsonb_agg(to_jsonb(f) ORDER BY f.id) FROM dw_loan_funding f WHERE f.wallet_id=w.id),'[]'::jsonb) AS funding,
   coalesce((SELECT jsonb_agg(to_jsonb(b) ORDER BY b.month,b.category_id) FROM dw_budgets b WHERE b.wallet_id=w.id),'[]'::jsonb) AS budgets,
   coalesce((SELECT jsonb_agg(to_jsonb(a) ORDER BY a.sequence) FROM dw_audit_log a WHERE a.wallet_id=w.id AND a.entity_type='wallet_history'),'[]'::jsonb) AS history
   FROM dw_wallets w WHERE w.id=$1`,[user]);
 const r=result[0]; if(!r) throw new Error('Wallet not found.');
 const categories=r.categories.map((c:any)=>({id:c.id,name:c.name,archived:c.archived,icon:c.icon,system:c.is_system}));
 const linesByTx=new Map<string,any[]>(),revisionsByTx=new Map<string,any[]>();
 for(const entry of r.entries){const rows=linesByTx.get(entry.transaction_id)??[];rows.push(entry);linesByTx.set(entry.transaction_id,rows);}
 for(const revision of r.revisions){const rows=revisionsByTx.get(revision.transaction_id)??[];rows.push(revision);revisionsByTx.set(revision.transaction_id,rows);}
 const events=r.transactions.map((t:any)=>parseEvent(t,linesByTx.get(t.id)??[],(revisionsByTx.get(t.id)??[]).map((v:any)=>({editedAt:new Date(v.edited_at).toISOString(),command:v.previous_command,requestKey:v.request_key??undefined,replacement:v.replacement_command}))));
 const allocations:Allocation[]=r.funding.map((f:any)=>({id:f.id,loan:f.loan_account_id,purpose:f.purpose,holding:f.holding_account_id,assigned:Number(f.assigned_paise),remaining:Number(f.remaining_paise),committed:Number(f.committed_paise),used:Number(f.used_paise),released:Number(f.released_paise),returned:Number(f.returned_paise),commitments:f.legacy_commitments??{}}));
 const budgets:Wallet['budgets']={}; for(const b of r.budgets){const month=String(b.month).slice(0,7);(budgets[month]??={total:0,categories:{}}).categories[b.category_id]=Number(b.amount_paise);budgets[month].total+=Number(b.amount_paise);}
 const history=r.history.filter((h:any)=>h.action!=='deletedAccountSnapshot').map((h:any)=>({action:h.action,id:h.entity_id,at:new Date(h.recorded_at).toISOString(),before:h.before_data}));
 const deletedAccounts=r.history.filter((h:any)=>h.action==='deletedAccountSnapshot').map((h:any)=>h.before_data);
 const wallet=upgradeWallet({accounts:r.accounts.map(parseAccount),events,allocations,categories,budgets,timezone:r.wallet.timezone,schemaVersion:2,deletedAccounts,managementHistory:history});
 const computed=accountBalances(wallet);
 for(const account of r.accounts){if(Number(account.balance_paise)!==computed.get(account.id))throw new Error('Stored account balance is out of sync with its journal.');}
 return wallet;
}

 async function saveRows(db:Db,user:string,table:string,oldRows:any[],newRows:any[],columns:string[]){
 const old=byId(oldRows), next=byId(newRows), jsonColumns=new Set(['credit_limit_history','metadata','details','legacy_commitments']);
 for(const [id,value] of next){if(stable(old.get(id))===stable(value))continue;const vals=columns.map(c=>jsonColumns.has(c)?db.json((value as any)[c] as never):(value as any)[c]);const placeholders=columns.map((_,i)=>`$${i+1}`).join(',');const updates=columns.filter(c=>c!=='wallet_id'&&c!=='id').map(c=>`${c}=excluded.${c}`).join(',');
  await db.unsafe(`INSERT INTO ${table}(${columns.join(',')}) VALUES(${placeholders}) ON CONFLICT(wallet_id,id) DO UPDATE SET ${updates}`,[...vals]);}
 const removed=[...old.keys()].filter(id=>!next.has(id)); if(removed.length)await db.unsafe(`DELETE FROM ${table} WHERE wallet_id=$1 AND id=ANY($2::text[])`,[user,removed]);
}

export async function writeWallet(db:Db,user:string,before:Wallet,after:Wallet){
 const names=[...new Set([...before.accounts,...after.accounts].map(a=>a.institution).filter(Boolean).map(n=>n.normalize('NFKC').trim().toLowerCase().replace(/\s+/g,' ')))];
 const institutions=names.length?await db.unsafe('SELECT id,normalized_name,kind FROM dw_institutions WHERE active AND normalized_name=ANY($1::text[])',[names]):[];
 const institutionId=(name:string,type:string)=>{const kind=type==='loan'?'lender':type==='investment'?'investment':'bank';const normalized=name.normalize('NFKC').trim().toLowerCase().replace(/\s+/g,' ');return institutions.find((i:any)=>i.kind===kind&&i.normalized_name===normalized)?.id??null;};
 // The prior wallet was read once under the wallet row lock. Derive its rows
 // in memory; do not fetch every table again just to discover what changed.
 const oldBalances=accountBalances(before),newBalances=accountBalances(after);
 const oldAccounts=before.accounts.map((a,i)=>row(a,user,i,institutionId(a.institution,a.type),oldBalances.get(a.id)??0));
 const oldCategories=before.categories.map((c,i)=>({wallet_id:user,id:c.id,position:i,name:c.name,archived:c.archived,icon:c.icon??'other',is_system:!!c.system}));
 const oldTx=before.events.map((e,i)=>({...eventRow(e,user),position:i}));
 const oldLines=before.events.flatMap(e=>e.lines.map((l,i)=>({id:`${e.id}:${i}`,wallet_id:user,transaction_id:e.id,line_no:i,account_id:l.account.startsWith('system:')?null:l.account,system_account:l.account.startsWith('system:')?l.account.slice(7):null,amount_paise:l.delta})));
 const oldRevisions=before.events.flatMap(e=>(e.revisions??[]).map((r,i)=>({wallet_id:user,transaction_id:e.id,revision:i+1,edited_at:r.editedAt,request_key:r.requestKey??null,previous_command:r.command,replacement_command:r.replacement??e.command,id:`${e.id}:${i+1}`})));
 const oldFunding=before.allocations.map(f=>({wallet_id:user,id:f.id,loan_account_id:f.loan,holding_account_id:f.holding,source_transaction_id:f.id.replace(/^fund-/,''),purpose:f.purpose,assigned_paise:f.assigned,remaining_paise:f.remaining,committed_paise:f.committed,used_paise:f.used,released_paise:f.released,returned_paise:f.returned,legacy_commitments:f.commitments,metadata:{}}));
 const oldBudgets=Object.entries(before.budgets).flatMap(([month,b])=>Object.entries(b.categories).map(([category_id,amount_paise])=>({id:`${month}:${category_id}`,wallet_id:user,month:`${month}-01`,category_id,amount_paise})));
 const newAccounts=after.accounts.map((a,i)=>row(a,user,i,institutionId(a.institution,a.type),newBalances.get(a.id)??0));
 await saveRows(db,user,'dw_accounts',oldAccounts,newAccounts,['wallet_id','id','position','name','type','opening_paise','opening_date','balance_paise','credit_limit_paise','institution_id','counterparty','purpose','loan_type','terms','due_date','archived','generated','created_at','closed_at','credit_limit_history','metadata']);
 await saveRows(db,user,'dw_categories',oldCategories,after.categories.map((c,i)=>({wallet_id:user,id:c.id,position:i,name:c.name,archived:c.archived,icon:c.icon??'other',is_system:!!c.system})),['wallet_id','id','position','name','archived','icon','is_system']);
 const txRows=after.events.map((e,i)=>({...eventRow(e,user),position:i}));
 await saveRows(db,user,'dw_transactions',oldTx,txRows,['wallet_id','id','position','type','effective_at','recorded_at','description','notes','category_id','amount_paise','income_paise','expense_paise','inflow_paise','outflow_paise','revision','details']);
 const lines=after.events.flatMap(e=>e.lines.map((l,i)=>({id:`${e.id}:${i}`,wallet_id:user,transaction_id:e.id,line_no:i,account_id:l.account.startsWith('system:')?null:l.account,system_account:l.account.startsWith('system:')?l.account.slice(7):null,amount_paise:l.delta})));
 // Entries use a composite key; update only transactions whose lines changed.
 const beforeEvents=byId(before.events),afterEvents=byId(after.events);
 const touched=new Set([...new Set([...beforeEvents.keys(),...afterEvents.keys()])].filter(id=>stable(beforeEvents.get(id)?.lines)!==stable(afterEvents.get(id)?.lines)));
 for(const id of touched){await db.unsafe('DELETE FROM dw_transaction_entries WHERE wallet_id=$1 AND transaction_id=$2',[user,id]);for(const l of lines.filter(x=>x.transaction_id===id))await db.unsafe('INSERT INTO dw_transaction_entries(wallet_id,transaction_id,line_no,account_id,system_account,amount_paise) VALUES($1,$2,$3,$4,$5,$6)',[user,l.transaction_id,l.line_no,l.account_id,l.system_account,l.amount_paise]);}
 const revisions=after.events.flatMap(e=>(e.revisions??[]).map((r,i)=>({wallet_id:user,transaction_id:e.id,revision:i+1,edited_at:r.editedAt,request_key:r.requestKey??null,previous_command:r.command,replacement_command:r.replacement??e.command}))).map(r=>({...r,id:`${r.transaction_id}:${r.revision}`}));
 // Immutable history is append-only; reject accidental rewrite or deletion.
 const oldRevisionKey=new Set(oldRevisions.map((x:any)=>`${x.transaction_id}:${x.revision}`));
 for(const r of revisions)if(oldRevisionKey.has(r.id)){const old=oldRevisions.find((x:any)=>`${x.transaction_id}:${x.revision}`===r.id);if(!old||stable(old.previous_command)!==stable(r.previous_command)||old.request_key!==r.request_key)throw new Error('Transaction revision history is immutable.');}
 for(const r of revisions.filter(x=>!oldRevisionKey.has(x.id)))await db.unsafe('INSERT INTO dw_transaction_revisions(wallet_id,transaction_id,revision,edited_at,request_key,previous_command,replacement_command) VALUES($1,$2,$3,$4,$5,$6::jsonb,$7::jsonb)',[user,r.transaction_id,r.revision,r.edited_at,r.request_key,db.json(r.previous_command as never),db.json(r.replacement_command as never)]);
 const funding=after.allocations.map(f=>({wallet_id:user,id:f.id,loan_account_id:f.loan,holding_account_id:f.holding,source_transaction_id:f.id.replace(/^fund-/,''),purpose:f.purpose,assigned_paise:f.assigned,remaining_paise:f.remaining,committed_paise:f.committed,used_paise:f.used,released_paise:f.released,returned_paise:f.returned,legacy_commitments:f.commitments,metadata:{}}));
 await saveRows(db,user,'dw_loan_funding',oldFunding,funding,['wallet_id','id','loan_account_id','holding_account_id','source_transaction_id','purpose','assigned_paise','remaining_paise','committed_paise','used_paise','released_paise','returned_paise','legacy_commitments','metadata']);
 const budgets=Object.entries(after.budgets).flatMap(([month,b])=>Object.entries(b.categories).map(([category_id,amount_paise])=>({id:`${month}:${category_id}`,wallet_id:user,month:`${month}-01`,category_id,amount_paise})));
 // Budgets also have a composite key; persist changed month/category rows only.
 const oldBudgetMap=new Map(oldBudgets.map((b:any)=>[`${String(b.month).slice(0,7)}:${b.category_id}`,b]));const nextBudgetMap=new Map(budgets.map(b=>[b.id,b]));
 for(const [id,b] of nextBudgetMap)if(Number(oldBudgetMap.get(id)?.amount_paise)!==b.amount_paise)await db.unsafe('INSERT INTO dw_budgets(wallet_id,month,category_id,amount_paise) VALUES($1,$2,$3,$4) ON CONFLICT(wallet_id,month,category_id) DO UPDATE SET amount_paise=excluded.amount_paise',[user,b.month,b.category_id,b.amount_paise]);
 for(const [id,b] of oldBudgetMap)if(!nextBudgetMap.has(id))await db.unsafe('DELETE FROM dw_budgets WHERE wallet_id=$1 AND month=$2 AND category_id=$3',[user,b.month,b.category_id]);
 const oldHistoryCount=before.managementHistory?.length??0;
 for(const [i,h] of (after.managementHistory??[]).slice(oldHistoryCount).entries())await db.unsafe("INSERT INTO dw_audit_log(wallet_id,actor_id,action,entity_type,entity_id,before_data,sequence,recorded_at) VALUES($1,$1,$2,'wallet_history',$3,$4::jsonb,$5,$6)",[user,h.action,h.id,db.json(h.before as never),oldHistoryCount+i,h.at]);
 const deletedBefore=before.deletedAccounts??[];
 for(const [i,d] of (after.deletedAccounts??[]).slice(deletedBefore.length).entries())await db.unsafe("INSERT INTO dw_audit_log(wallet_id,actor_id,action,entity_type,entity_id,before_data,sequence,recorded_at) VALUES($1,$1,'deletedAccountSnapshot','wallet_history',$2,$3::jsonb,$4,$5)",[user,d.account.id,db.json(d as never),1_000_000+i,d.deletedAt]);
 await db`UPDATE dw_wallets SET timezone=${after.timezone},version=version+1,updated_at=now() WHERE id=${user}`;
}

export async function createRelationalWallet(db:Db,user:string){
 const w=emptyWallet(),before={...w,categories:[]};await db`INSERT INTO dw_wallets(id,timezone) VALUES(${user},${w.timezone})`;
 await writeWallet(db,user,before,w);
}

export const auditId = () => randomUUID();
