import {test} from 'node:test';
import assert from 'node:assert/strict';
import {renderToStaticMarkup} from 'react-dom/server';
import {createElement} from 'react';
import {History} from '../app/components/history';
import {TransactionForm} from '../app/components/transaction-form';
import {AccountForm} from '../app/components/account-form';
import {emptyWallet,createAccount,post,type Command} from '../lib/ledger';
const date='2026-01-01T10:00:00Z';
const save=async()=>{};
const done=()=>{};
function fixture(){let w=createAccount(emptyWallet(),{id:'bank',name:'Bank',type:'bank',opening:'10000',date});w=createAccount(w,{id:'card',name:'Card',type:'card',limit:'10000',date});return w;}
const command=(overrides:Partial<Command>={}):Command=>({key:'test',type:'expense',account:'bank',amount:'100',description:'Office rent',category:'other',date,...overrides});
test('regular debit has no funding control; loan holding bank does',()=>{let w=fixture();const regular=renderToStaticMarkup(createElement(TransactionForm,{wallet:w,save,onDone:done}));assert.doesNotMatch(regular,/Funding source/);w=post(w,command({type:'borrow',counterparty:'Lender',reserve:true}));const funded=renderToStaticMarkup(createElement(TransactionForm,{wallet:w,save,onDone:done}));assert.match(funded,/Funding source/);assert.doesNotMatch(funded,/Which loan\?/);});
test('credit-card purchase hides funding source even when bank holds loan funds',()=>{let w=post(fixture(),command({type:'borrow',counterparty:'Lender',reserve:true}));w=post(w,command({key:'purchase',account:'card'}));const html=renderToStaticMarkup(createElement(TransactionForm,{wallet:w,save,onDone:done,editing:w.events.at(-1)}));assert.doesNotMatch(html,/Funding source/);assert.match(html,/Card/);});
test('account history displays balance after and navigation; home recent activity does not',()=>{const w=post(fixture(),command());const detailed=renderToStaticMarkup(createElement(History,{wallet:w,month:'2026-01',account:'bank'}));assert.match(detailed,/Balance/);assert.match(detailed,/9,900\.00/);assert.match(detailed,/\/transactions\/test/);const recent=renderToStaticMarkup(createElement(History,{wallet:w,month:'2026-01',compact:true}));assert.doesNotMatch(recent,/9,900\.00/);});
test('credit-card creation/edit-before-use exposes available-credit input and calculated outstanding',()=>{const w=createAccount(emptyWallet(),{id:'card',name:'Card',type:'card',limit:'100000',availableCredit:'65000',date});const html=renderToStaticMarkup(createElement(AccountForm,{wallet:w,account:w.accounts[0],save,onDone:done}));assert.match(html,/Currently available credit/);assert.match(html,/35,000\.00/);});
