import {test} from 'node:test';
import assert from 'node:assert/strict';
import postgres from 'postgres';
import {randomUUID} from 'node:crypto';
import {openPostgresStore} from '../lib/store';
import {createAccount,post,balance,editTransaction,type Command} from '../lib/ledger';
const url=process.env.DIGIWALLET_TEST_POSTGRES_URL;
// Opt-in only: use a disposable test database, never the production DATABASE_URL.
test('PostgreSQL: identity isolation, catalog uniqueness, migration, row locking and rollback', {skip:!url},async()=>{
 const schema='dw_test_'+randomUUID().replaceAll('-','');
 const admin=postgres(url!,{max:1,prepare:false});
 let store:ReturnType<typeof openPostgresStore>|undefined;
 try{
  await admin`CREATE SCHEMA ${admin(schema)}`;
  const sql=postgres(url!,{max:1,prepare:false,connection:{search_path:schema}});
  try{await sql.unsafe(`CREATE TABLE users(id text PRIMARY KEY,email text UNIQUE NOT NULL,password text NOT NULL,name text NOT NULL);
  CREATE TABLE wallets(user_id text PRIMARY KEY REFERENCES users(id),state jsonb NOT NULL,version integer NOT NULL DEFAULT 0,updated_at timestamptz NOT NULL DEFAULT now());
  CREATE TABLE sessions(hash text PRIMARY KEY,user_id text REFERENCES users(id),expires bigint NOT NULL);
  CREATE TABLE institutions(id text PRIMARY KEY,name text NOT NULL,kind text NOT NULL,country text NOT NULL,normalized text NOT NULL,UNIQUE(kind,country,normalized));
  CREATE TABLE audit(id text PRIMARY KEY,user_id text REFERENCES users(id),action text NOT NULL,recorded_at timestamptz NOT NULL);
  CREATE TABLE attempts(key text PRIMARY KEY,count integer NOT NULL,expires bigint NOT NULL);`);}finally{await sql.end();}
  store=openPostgresStore(url!,{schema});const s=store;
  const u=await s.register('test@example.com','long-test-password','Test');
  const other=await s.register('other@example.com','long-test-password','Other');
  const token=await s.session(u.id);
  assert.equal((await s.identify(token))?.id,u.id);
  assert.equal(await s.identify('forged'),undefined);
  assert.equal((await s.login(u.email,'long-test-password')).id,u.id);
  await assert.rejects(s.login(u.email,'wrong-password'));
  await s.logout(token);assert.equal(await s.identify(token),undefined);
  await s.addInstitution(' ＨＤＦＣ   Bank ','bank','IN');
  await s.addInstitution('hdfc bank','bank','IN');
  assert.equal((await s.getInstitutions()).length,1);
  await s.change(u.id,'account',w=>createAccount(w,{id:'bank',name:'Bank',type:'bank',opening:'100',date:'2026-01-01T00:00:00Z'}));
  const command:Command={key:'expense',type:'expense',amount:'100',account:'bank',date:'2026-01-02T00:00:00Z',description:'Expense',category:'other'};
  assert.equal((await s.read(other.id)).accounts.length,0);
  await assert.rejects(s.change(other.id,'foreign-account',w=>post(w,command)));
  // Force a failure after the UPDATE to prove the enclosing transaction rolls it back.
  const fault=postgres(url!,{max:1,prepare:false,connection:{search_path:schema}});
  try {
    await fault.unsafe(`CREATE FUNCTION fail_test_audit() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF NEW.action = 'injected-failure' THEN RAISE EXCEPTION 'injected failure'; END IF; RETURN NEW; END; $$;
      CREATE TRIGGER fail_audit BEFORE INSERT ON audit FOR EACH ROW EXECUTE FUNCTION fail_test_audit();`);
    await assert.rejects(s.change(u.id,'injected-failure',w=>post(w,command)));
    assert.equal(balance(await s.read(u.id),'bank'),10000);
    assert.equal((await fault`SELECT count(*)::int AS n FROM audit WHERE action = 'injected-failure'`)[0].n,0);
  } finally { await fault.end(); }
  const results=await Promise.allSettled([s.change(u.id,'transaction',w=>post(w,command)),s.change(u.id,'transaction',w=>post(w,{...command,key:'competing'}))]);
  assert.equal(results.filter(r=>r.status==='fulfilled').length,1);
  const w=await s.read(u.id),e=w.events.at(-1)!;
  await s.change(u.id,'editTransaction',w=>editTransaction(w,e.id,{...e.command!,amount:'50'},0,'edit-one'));
  const after=await s.read(u.id);assert.equal(after.schemaVersion,2);assert.equal(balance(after,'bank'),5000);assert.equal(after.events.at(-1)!.revisions?.length,1);
  await assert.rejects(s.change(u.id,'invalid-edit',w=>editTransaction(w,e.id,{...e.command!,amount:'101'},1,'edit-two')));
  assert.deepEqual(await s.read(u.id),after);
 }finally{
  await store?.close?.();
  // The identifier is generated above and cannot refer to an existing application schema.
  await admin`DROP SCHEMA IF EXISTS ${admin(schema)} CASCADE`;await admin.end();
 }
});
