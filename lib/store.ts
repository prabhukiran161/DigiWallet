import {DatabaseSync} from 'node:sqlite';
import {mkdirSync} from 'node:fs';
import {dirname,resolve} from 'node:path';
import {randomBytes,scryptSync,timingSafeEqual,createHash,randomUUID} from 'node:crypto';
import {emptyWallet,type Wallet} from './ledger';

export function openStore(path=process.env.DIGIWALLET_DB||resolve('data/digiwallet.sqlite')) {
 if(path!==':memory:')mkdirSync(dirname(path),{recursive:true});
 const db=new DatabaseSync(path);db.exec(`PRAGMA journal_mode=WAL; PRAGMA foreign_keys=ON; PRAGMA busy_timeout=5000;
 CREATE TABLE IF NOT EXISTS users(id TEXT PRIMARY KEY,email TEXT UNIQUE NOT NULL,password TEXT NOT NULL,name TEXT NOT NULL);
 CREATE TABLE IF NOT EXISTS sessions(hash TEXT PRIMARY KEY,user_id TEXT NOT NULL REFERENCES users(id),expires INTEGER NOT NULL);
 CREATE TABLE IF NOT EXISTS wallets(user_id TEXT PRIMARY KEY REFERENCES users(id),state TEXT NOT NULL,version INTEGER NOT NULL DEFAULT 0);
 CREATE TABLE IF NOT EXISTS institutions(id TEXT PRIMARY KEY,name TEXT NOT NULL,kind TEXT NOT NULL,country TEXT NOT NULL,normalized TEXT NOT NULL,UNIQUE(kind,country,normalized));
 CREATE TABLE IF NOT EXISTS audit(id TEXT PRIMARY KEY,user_id TEXT NOT NULL REFERENCES users(id),action TEXT NOT NULL,recorded_at TEXT NOT NULL);
 CREATE TABLE IF NOT EXISTS attempts(key TEXT PRIMARY KEY,count INTEGER NOT NULL,expires INTEGER NOT NULL);`);
 for(const name of ['State Bank of India','HDFC Bank','ICICI Bank','Axis Bank','Punjab National Bank','Kotak Mahindra Bank'])db.prepare('INSERT OR IGNORE INTO institutions VALUES(?,?,?,?,?)').run(name,name,'bank','IN',normalize(name));
 const read=(user:string):Wallet=>{const row=db.prepare('SELECT state FROM wallets WHERE user_id=?').get(user) as {state:string}|undefined;if(!row)throw new Error('Wallet not found.');return JSON.parse(row.state);};
 const change=(user:string,action:string,fn:(w:Wallet)=>Wallet)=>{db.exec('BEGIN IMMEDIATE');try{const updated=fn(read(user));db.prepare('UPDATE wallets SET state=?,version=version+1 WHERE user_id=?').run(JSON.stringify(updated),user);db.prepare('INSERT INTO audit VALUES(?,?,?,?)').run(randomUUID(),user,action,new Date().toISOString());db.exec('COMMIT');return updated;}catch(error){db.exec('ROLLBACK');throw error;}};
 return {db,read,change};
}
export function normalize(name:string){return name.normalize('NFKC').trim().replace(/\s+/g,' ').toLocaleLowerCase('en');}
export type Store=ReturnType<typeof openStore>;
const globals=globalThis as typeof globalThis&{walletStore?:Store};
export const store=()=>globals.walletStore??=openStore();
export function register(s:Store,email:string,password:string,name:string){const id=randomUUID(),salt=randomBytes(16).toString('hex');const hash=scryptSync(password,salt,64).toString('hex');s.db.exec('BEGIN IMMEDIATE');try{s.db.prepare('INSERT INTO users VALUES(?,?,?,?)').run(id,email.toLowerCase(),`${salt}:${hash}`,name);s.db.prepare('INSERT INTO wallets(user_id,state) VALUES(?,?)').run(id,JSON.stringify(emptyWallet()));s.db.exec('COMMIT');return {id,email,name};}catch(error){s.db.exec('ROLLBACK');throw error;}}
export function login(s:Store,email:string,password:string){const u=s.db.prepare('SELECT * FROM users WHERE email=?').get(email.toLowerCase()) as {id:string;email:string;name:string;password:string}|undefined;const [salt,hash]=(u?.password||'dummy:'+Buffer.alloc(64).toString('hex')).split(':');const actual=scryptSync(password,salt,64);if(!timingSafeEqual(actual,Buffer.from(hash,'hex'))||!u)throw new Error('Email or password is incorrect.');return {id:u.id,name:u.name,email:u.email};}
const digest=(token:string)=>createHash('sha256').update(token).digest('hex');
export function session(s:Store,user:string){const token=randomBytes(32).toString('hex');s.db.prepare('DELETE FROM sessions WHERE expires<?').run(Date.now());s.db.prepare('INSERT INTO sessions VALUES(?,?,?)').run(digest(token),user,Date.now()+7*86400000);return token;}
export function identify(s:Store,token:string){return s.db.prepare('SELECT users.id,users.name,users.email FROM users JOIN sessions ON users.id=sessions.user_id WHERE sessions.hash=? AND sessions.expires>?').get(digest(token),Date.now()) as {id:string;name:string;email:string}|undefined;}
export function logout(s:Store,token:string){s.db.prepare('DELETE FROM sessions WHERE hash=?').run(digest(token));}
export function limit(s:Store,key:string,max=100){const now=Date.now();s.db.prepare('DELETE FROM attempts WHERE expires<?').run(now);s.db.prepare('INSERT INTO attempts VALUES(?,1,?) ON CONFLICT(key) DO UPDATE SET count=count+1').run(key,now+60000);const row=s.db.prepare('SELECT count FROM attempts WHERE key=?').get(key) as {count:number};if(row.count>max)throw new Error('Too many requests. Please wait a minute.');}
