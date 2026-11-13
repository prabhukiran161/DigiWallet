import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
const base=process.env.TEST_URL||'http://127.0.0.1:3107';
async function request(path,{method='GET',cookie='',body}={}){const r=await fetch(base+path,{method,headers:{origin:base,cookie,'Content-Type':'application/json'},body:body===undefined?undefined:JSON.stringify(body)});const data=await r.json();return {status:r.status,data,cookie:r.headers.get('set-cookie')?.split(';')[0]||cookie};}
const registration=await request('/api/auth',{method:'POST',body:{mode:'register',name:'Management QA',email:`management-${randomUUID()}@example.test`,password:'test-password-long'}});assert.equal(registration.status,200);const cookie=registration.cookie;
const save=(action,data)=>request('/api/wallet',{method:'POST',cookie,body:{action,data}});
async function ok(action,data){const r=await save(action,data);assert.equal(r.status,200,JSON.stringify(r.data));return r.data.wallet;}
const date='2026-01-01T10:00:00.000Z';
let w=await ok('account',{id:'bank',name:'Bank',type:'bank',opening:'10000',date});
w=await ok('account',{id:'unused',name:'Unused',type:'bank',opening:'123',date});w=await ok('deleteAccount',{id:'unused'});assert.equal(w.deletedAccounts[0].account.opening,12300);
w=await ok('account',{id:'card',name:'Card',type:'card',limit:'10000',availableCredit:'10000',date});
const command={key:randomUUID(),type:'borrow',amount:'5000',account:'bank',description:'Office loan',date:'2026-01-02T10:00:00.000Z',counterparty:'Lender'};
w=await ok('transaction',command);const loan=w.accounts.find(a=>a.type==='loan').id;assert.equal(w.allocations[0].remaining,500000);
const purchase={key:randomUUID(),type:'expense',amount:'2000',account:'card',description:'Office rent',category:'other',date:'2026-01-03T10:00:00.000Z'};w=await ok('transaction',purchase);
const payment={key:randomUUID(),type:'cardPayment',amount:'1000',account:'bank',target:'card',loanFunding:loan,description:'Rent card repayment',date:'2026-01-04T10:00:00.000Z'};w=await ok('transaction',payment);assert.equal(w.allocations[0].used,100000);
const revision={id:payment.key,command:{...payment,amount:'1500'},expectedRevision:0,requestKey:randomUUID()};w=await ok('editTransaction',revision);const edited=w.events.find(e=>e.id===payment.key);assert.equal(edited.balances.card,50000);assert.equal(edited.balances.bank,1350000);assert.equal(edited.balances[loan],500000);assert.equal(edited.revision,1);assert.equal(w.allocations[0].remaining,350000);
const retry=await ok('editTransaction',revision);assert.equal(retry.events.find(e=>e.id===payment.key).revisions.length,1);
assert.equal((await save('editTransaction',{...revision,requestKey:randomUUID()})).status,409);
assert.equal((await save('deleteAccount',{id:'bank'})).status,400);
assert.equal((await save('deleteTransaction',{id:payment.key})).status,400);
assert.equal((await save('closeAccount',{id:'card'})).status,400);
assert.equal((await save('transaction',{...purchase,key:randomUUID(),loanFunding:loan})).status,400);
w=await ok('category',{id:'health',name:'Health',icon:'health'});w=await ok('category',{id:'health',name:'Medical',icon:'health'});w=await ok('deleteCategory',{id:'health'});assert.ok(!w.categories.some(c=>c.id==='health'));
assert.equal((await save('category',{id:'other',name:'Changed used category'})).status,400);
w=await ok('category',{id:'other',archived:true});assert.equal((await save('transaction',{...purchase,key:randomUUID()})).status,400);
w=await ok('creditLimit',{id:'card',limit:'100',date:'2026-01-05T10:00:00.000Z'});assert.equal(w.accounts.find(a=>a.id==='card').limit,10000);
const page=await fetch(`${base}/transactions/${payment.key}`);assert.equal(page.status,200);
console.log('Management API smoke PASS: card availability, loan-funded payment, editing/retry/conflict, audit preservation, account/category rules, deletion rejected, detail route.');
