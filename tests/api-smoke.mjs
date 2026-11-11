import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
const base=process.env.TEST_URL||'http://127.0.0.1:3000';
async function request(path,{cookie,body,origin=base,method}={}){const r=await fetch(base+path,{method:method||(body?'POST':'GET'),headers:{...(cookie?{Cookie:cookie}:{}),...(body?{'Content-Type':'application/json',Origin:origin}:{} )},body:body?JSON.stringify(body):undefined});return {status:r.status,data:await r.json(),cookie:r.headers.get('set-cookie')?.split(';')[0]};}
async function user(){const r=await request('/api/auth',{body:{mode:'register',name:'API test',email:`qa-${randomUUID()}@example.test`,password:randomUUID()}});assert.equal(r.status,200,JSON.stringify(r.data));assert.ok(r.cookie);return r.cookie;}
const a=await user(),b=await user();
const save=(cookie,action,data)=>request('/api/wallet',{cookie,body:{action,data}});
const date='2026-01-01T10:00:00.000Z';
assert.equal((await request('/api/wallet')).status,401);
assert.equal((await request('/api/wallet',{cookie:a,origin:'https://other.example',body:{action:'account',data:{}}})).status,403);
assert.equal((await save(a,'account',{id:'bank',name:'Bank',type:'bank',opening:'5000',date})).status,200);
const command={key:randomUUID(),type:'borrow',amount:'10000',account:'bank',description:'Startup funds',date:'2026-01-02T10:00:00.000Z',counterparty:'Lender',purpose:'Startup',reserve:true};
const first=await save(a,'transaction',command);assert.equal(first.status,200,JSON.stringify(first.data));
assert.equal(first.data.wallet.accounts.filter(a=>a.type==='loan').length,1);
const last=first.data.wallet.events.at(-1);assert.equal(last.balances.bank,1500000);assert.equal(last.income,0);
const retry=await save(a,'transaction',command);assert.equal(retry.status,200);assert.equal(retry.data.wallet.events.length,first.data.wallet.events.length);
assert.equal((await save(a,'transaction',{...command,amount:'10001'})).status,409);
assert.equal((await save(b,'transaction',{...command,key:randomUUID()})).status,400);
assert.equal((await request('/api/wallet',{cookie:b})).data.wallet.accounts.length,0);
const allocation=first.data.wallet.allocations[0].id,loan=first.data.wallet.accounts.find(a=>a.type==='loan').id;
async function event(c){const r=await save(a,'transaction',{key:randomUUID(),type:'expense',account:'bank',amount:'1',description:'API test',date:'2026-01-03T10:00:00.000Z',category:'other',...c});assert.equal(r.status,200,JSON.stringify(r.data));return r.data.wallet;}
let wallet=await event({amount:'3000',allocation});assert.equal(wallet.events.at(-1).balances.bank,1200000);assert.equal(wallet.events.at(-1).balances[loan],1000000);
wallet=await event({type:'repay',target:loan,amount:'2000',interest:'200'});assert.equal(wallet.events.at(-1).balances.bank,980000);assert.equal(wallet.allocations[0].remaining,700000);
wallet=await event({type:'repay',target:loan,amount:'1000',returnUnused:true,allocation});assert.equal(wallet.events.at(-1).balances.bank,880000);assert.equal(wallet.events.at(-1).balances[loan],700000);
const allocations=Object.fromEntries(wallet.categories.map(c=>[c.id,'2000']));assert.equal((await save(a,'budget',{month:'2026-01',total:'10000',categories:allocations})).status,200);assert.equal((await save(a,'budget',{month:'2026-01',total:'9000',categories:allocations})).status,400);
assert.equal((await save(b,'account',{id:'race',name:'Race',type:'bank',opening:'100',date})).status,200);
const race=await Promise.all([1,2].map(()=>save(b,'transaction',{key:randomUUID(),type:'expense',account:'race',amount:'100',description:'Race',date:'2026-01-02T10:00:00.000Z',category:'other'})));assert.deepEqual(race.map(r=>r.status).sort(),[200,400]);
const exported=await request('/api/wallet?export=1',{cookie:a});assert.equal(exported.data.events.length,wallet.events.length);
console.log('API smoke PASS: authentication, ownership, origin protection, linked loan, full worked example, retries, budgets, concurrent spending, export.');
