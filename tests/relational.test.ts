import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { randomUUID } from 'node:crypto';
import postgres from 'postgres';
import { openPostgresStore } from '../lib/store';
import { balance, summary, post, editTransaction, editAccount, createAccount, type Command } from '../lib/ledger';

const url=process.env.DIGIWALLET_TEST_POSTGRES_URL;
test('normalized PostgreSQL schema, targeted account writes, ledger rules and rollback', {skip:!url},async()=>{
 const schema='dw_test_'+randomUUID().replaceAll('-','');
 const admin=postgres(url!,{max:1,prepare:false,onnotice:()=>{}});
 let store:ReturnType<typeof openPostgresStore>|undefined;
 try {
  await admin`CREATE SCHEMA ${admin(schema)}`;
  const sql=postgres(url!,{max:1,prepare:false,onnotice:()=>{},connection:{search_path:schema}});
  try {
    await sql.unsafe(await readFile(resolve('database/schema.sql'),'utf8'));
    await sql.unsafe(await readFile(resolve('database/002_institution_logos.sql'),'utf8'));
  } finally {await sql.end();}
  store=openPostgresStore(url!,{schema});const s=store;
  const u=await s.register('test@example.test','long-test-password','Test');
  const other=await s.register('other@example.test','long-test-password','Other');
  assert.equal((await s.read(u.id)).categories.length,5);
  const token=await s.session(u.id);
  assert.equal((await s.identify(token))?.id,u.id);
  assert.equal((await s.login(u.email,'long-test-password')).id,u.id);
  await s.logout(token);assert.equal(await s.identify(token),undefined);
  await s.change(u.id,'account',w=>createAccount(w,{id:'bank',name:'Bank',type:'bank',opening:'1000',date:'2026-01-01T00:00:00.000Z'}));
  await s.change(u.id,'account',w=>createAccount(w,{id:'card',name:'Card',type:'card',limit:'10000',date:'2026-01-01T00:00:00.000Z'}));
  const borrow:Command={key:'borrow',type:'borrow',amount:'5000',account:'bank',counterparty:'Lender',reserve:true,date:'2026-01-02T00:00:00Z',description:'Office loan'};
  await s.change(u.id,'transaction',w=>post(w,borrow));
  const loan=(await s.read(u.id)).accounts.find(a=>a.type==='loan')!;
  const rent:Command={key:'rent',type:'expense',amount:'2000',account:'card',category:'other',date:'2026-01-03T00:00:00Z',description:'Office rent'};
  await s.change(u.id,'transaction',w=>post(w,rent));
  const payment:Command={key:'payment',type:'cardPayment',amount:'1000',account:'bank',target:'card',loanFunding:loan.id,date:'2026-01-04T00:00:00Z',description:'Card repayment'};
  await s.change(u.id,'transaction',w=>post(w,payment));
  const snapshot=await s.read(u.id);
  assert.equal(balance(snapshot,'bank'),500000);
  assert.equal(balance(snapshot,'card'),100000);
  assert.equal(summary(snapshot,'2026-01').expenses,200000);
  assert.equal(summary(snapshot,'2026-01').netWorth,-100000);
  assert.equal(snapshot.allocations[0].remaining,400000);
  assert.equal((await s.read(other.id)).accounts.length,0);

  // A name-only edit must not update any transaction or journal row.
  const blocker=postgres(url!,{max:1,prepare:false,onnotice:()=>{},connection:{search_path:schema}});
  try {await blocker.unsafe(`CREATE FUNCTION reject_tx_update() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'transaction row must not change: %', NEW.id; END $$; CREATE TRIGGER reject_tx_update BEFORE UPDATE ON dw_transactions FOR EACH ROW EXECUTE FUNCTION reject_tx_update();`);
   await s.change(u.id,'rename-account',w=>editAccount(w,{id:'bank',name:'Renamed bank',type:'bank',opening:'1000',date:'2026-01-01T00:00:00.000Z',limit:'0',institution:'',counterparty:'',purpose:'',loanType:'',terms:'',dueDate:''}));
   assert.equal((await s.read(u.id)).accounts.find(a=>a.id==='bank')?.name,'Renamed bank');
  } finally {await blocker.end();}

  const e=(await s.read(u.id)).events.find(e=>e.id==='payment')!;
  await s.change(u.id,'editTransaction',w=>editTransaction(w,e.id,{...e.command!,amount:'1500'},0,'edit-payment'));
  const corrected=await s.read(u.id);
  assert.equal(corrected.events.find(e=>e.id==='payment')?.revisions?.length,1);
  assert.equal(corrected.allocations[0].remaining,350000);
  assert.equal(balance(corrected,'bank'),450000);
  assert.equal(summary(corrected,'2026-01').expenses,200000);

  const fault=postgres(url!,{max:1,prepare:false,onnotice:()=>{},connection:{search_path:schema}});
  try {
   await fault.unsafe(`CREATE FUNCTION reject_wallet_audit() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF NEW.action='injected-failure' THEN RAISE EXCEPTION 'injected failure'; END IF; RETURN NEW; END $$; CREATE TRIGGER reject_wallet_audit BEFORE INSERT ON dw_audit_log FOR EACH ROW EXECUTE FUNCTION reject_wallet_audit();`);
   const invalid={...rent,key:'fault',amount:'999999'};
   await assert.rejects(s.change(u.id,'injected-failure',w=>post(w,invalid)));
   assert.deepEqual(await s.read(u.id),corrected);
  } finally {await fault.end();}

  // Database-level balancing rejects an otherwise well-formed but unbalanced line.
  await assert.rejects(admin`INSERT INTO ${admin(schema)}.dw_transaction_entries(wallet_id,transaction_id,line_no,account_id,system_account,amount_paise) VALUES(${u.id},'rent',99,'bank',NULL,5)`);
 } finally {
  await store?.close();
  await admin`DROP SCHEMA IF EXISTS ${admin(schema)} CASCADE`;
  await admin.end();
 }
});
