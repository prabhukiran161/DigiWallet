import { test } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { resolve } from 'node:path';
import postgres from 'postgres';
import { emptyWallet, createAccount, post, editTransaction, summary, balance, upgradeWallet, saveBudget, type Wallet } from '../lib/ledger';
import { encodeWallet, decodeWallet, reconcile } from '../lib/store/relational-codec';
import { applyMigrations } from '../lib/store/migrations';
import { backfillWallet, restoreJsonStorage, readRelational } from '../lib/store/relational-store';
import { openPostgresStore } from '../lib/store';

function fixture(): Wallet {
  const date = '2026-01-01T10:00:00.000Z';
  let w = createAccount(emptyWallet(), { id: 'bank', name: 'Bank', type: 'bank', opening: '1000', date });
  w = createAccount(w, { id: 'card', name: 'Card', type: 'card', limit: '10000', date });
  w = post(w, { key: 'borrow', type: 'borrow', amount: '5000', account: 'bank', counterparty: 'Lender', reserve: true, date, description: 'Office loan' });
  const loan = w.accounts.find(a => a.type === 'loan')!.id;
  w = post(w, { key: 'rent', type: 'expense', amount: '2000', account: 'card', category: 'other', date, description: 'Office rent' });
  w = post(w, { key: 'payment', type: 'cardPayment', amount: '1000', account: 'bank', target: 'card', loanFunding: loan, date, description: 'Repay office card' });
  w = editTransaction(w, 'payment', { ...w.events.at(-1)!.command!, amount: '1500' }, 0, 'revision-one');
  w = saveBudget(w, { month: '2026-01', total: '2000', categories: { other: '2000' } });
  return w;
}

test('relational codec preserves complete wallet, revisions, bank loan funds and net worth', () => {
  const w = fixture();
  const restored = decodeWallet(encodeWallet(w));
  assert.deepEqual(restored, upgradeWallet(w));
  reconcile(w, restored);
  assert.equal(balance(restored, 'bank'), 450000);
  assert.equal(balance(restored, 'card'), 50000);
  assert.equal(restored.allocations[0].remaining, 350000);
  assert.equal(summary(restored, '2026-01').expenses, 200000);
  assert.equal(summary(restored, '2026-01').netWorth, -100000);
  assert.equal(restored.events.at(-1)!.revisions!.length, 1);
});

test('codec preserves missing timestamps, tombstones, limit history and old commitments', () => {
  const w = fixture();
  delete w.accounts[0].createdAt;
  w.accounts[1].limitHistory = [{ date: w.accounts[1].date, limit: 300000, recordedAt: '2026-01-02T10:00:00Z' }];
  w.allocations[0].commitments = { card: 10000 };
  w.allocations[0].committed = 10000;
  w.deletedAccounts = [{ account: { ...w.accounts[0], id: 'old' }, deletedAt: '2026-01-03T00:00:00Z' }];
  w.managementHistory = [{ action: 'rename', id: 'bank', at: '2026-01-03T00:00:00Z', before: { name: 'Old bank' } }];
  assert.deepEqual(decodeWallet(encodeWallet(w)), upgradeWallet(w));
});

test('migration rejects unbalanced journals, duplicate identities and altered history', () => {
  const w = fixture();
  const broken = structuredClone(w); broken.events[0].lines[0].delta++;
  assert.throws(() => encodeWallet(broken), /Unbalanced/);
  const duplicate = structuredClone(w); duplicate.accounts.push(duplicate.accounts[0]);
  assert.throws(() => encodeWallet(duplicate), /Duplicate/);
  const changed = decodeWallet(encodeWallet(w)); changed.events[0].recordedAt = '2026-01-01';
  assert.throws(() => reconcile(w, changed), /mismatch/);
});

const url = process.env.DIGIWALLET_TEST_POSTGRES_URL;
test('relational PostgreSQL migration, activation, writes, isolation and safe rollback', { skip: !url }, async () => {
  const schema = 'dw_rel_' + randomUUID().replaceAll('-', '');
  const admin = postgres(url!, { max: 1, prepare: false, onnotice: () => {} });
  let sql: ReturnType<typeof postgres> | undefined;
  let store: ReturnType<typeof openPostgresStore> | undefined;
  try {
    await admin`CREATE SCHEMA ${admin(schema)}`;
    sql = postgres(url!, { max: 1, prepare: false, onnotice: () => {}, connection: { search_path: schema } });
    await applyMigrations(sql, resolve('database/migrations'));
    await applyMigrations(sql, resolve('database/migrations')); // Safe rerun.
    store = openPostgresStore(url!, { schema });
    const a = await store.register('a@example.test', 'long-test-password', 'A');
    const b = await store.register('b@example.test', 'long-test-password', 'B');
    const source = fixture();
    await store.change(a.id, 'fixture', () => source);
    await backfillWallet(sql, a.id);
    assert.equal((await sql`SELECT storage_mode FROM wallets WHERE user_id=${a.id}`)[0].storage_mode, 'jsonb');
    await backfillWallet(sql, a.id, true);
    await backfillWallet(sql, a.id, true);
    assert.deepEqual(await store.read(a.id), JSON.parse(JSON.stringify(upgradeWallet(source))));
    assert.equal((await store.read(b.id)).accounts.length, 0);
    await backfillWallet(sql, b.id, true);
    await sql.unsafe("ALTER TABLE wallets ALTER COLUMN storage_mode SET DEFAULT 'relational'");
    const fresh = await store.register('fresh@example.test', 'long-test-password', 'Fresh');
    assert.equal((await sql`SELECT storage_mode FROM wallets WHERE user_id=${fresh.id}`)[0].storage_mode, 'relational');
    assert.deepEqual(await store.read(fresh.id), upgradeWallet(emptyWallet()));
    // Composite foreign keys must reject cross-wallet ownership.
    await assert.rejects(sql`INSERT INTO dw_v3_limits(wallet_id,row_id,parent_id,position,data,f_date,f_limit,f_recorded_at)
      VALUES(${b.id},'bad','bank',0,'{}','2026-01-01',100,'2026-01-01')`);
    const originalJSON = (await sql`SELECT state FROM wallets WHERE user_id=${a.id}`)[0].state;
    const command = { key: 'new-income', type: 'income' as const, amount: '10', account: 'bank', date: '2026-01-04T00:00:00Z', description: 'New income' };
    await store.change(a.id, 'transaction', w => post(w, command));
    // Active relational writes must not rewrite the frozen JSON document.
    assert.deepEqual((await sql`SELECT state FROM wallets WHERE user_id=${a.id}`)[0].state, originalJSON);
    const updated = await store.read(a.id);
    assert.equal(balance(updated, 'bank'), 451000);
    // Duplicate retry is financially idempotent.
    await store.change(a.id, 'transaction', w => post(w, command));
    assert.equal(balance(await store.read(a.id), 'bank'), 451000);
    await assert.rejects(store.change(a.id, 'invalid', w => post(w, { ...command, key: 'bad', type: 'expense', amount: '999999', category: 'other' })));
    assert.deepEqual(await store.read(a.id), updated);
    await store.change(a.id, 'editTransaction', w => editTransaction(w, 'new-income', { ...command, amount: '11' }, 0, 'new-income-edit'));
    assert.equal((await store.read(a.id)).events.at(-1)!.revisions!.length, 1);
    await assert.rejects(store.change(a.id, 'tamper-history', w => { w.events.find(e => e.id === 'new-income')!.revisions = []; return w; }));
    // Database constraints catch balanced-line violations outside the application.
    await assert.rejects(sql`UPDATE dw_v3_lines SET f_delta=f_delta+1 WHERE wallet_id=${a.id} AND row_id=${JSON.stringify(['new-income',0])}`);
    // Simultaneous mutations serialize on the existing parent-wallet lock.
    await Promise.all([store.change(a.id, 'transaction', w => post(w, { ...command, key: 'parallel-1' })),store.change(a.id, 'transaction', w => post(w, { ...command, key: 'parallel-2' }))]);
    const final = await store.read(a.id);
    assert.equal(balance(final, 'bank'), 453100);
    await restoreJsonStorage(sql, a.id);
    assert.deepEqual(await store.read(a.id), final);
    assert.equal((await sql`SELECT storage_mode FROM wallets WHERE user_id=${a.id}`)[0].storage_mode, 'jsonb');
    await backfillWallet(sql, a.id, true);
    assert.deepEqual(await store.read(a.id), final);
    // Audit failure after child-table writes must roll back the entire operation.
    await sql.unsafe(`CREATE FUNCTION reject_audit() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF NEW.action='fault' THEN RAISE EXCEPTION 'injected'; END IF; RETURN NEW; END $$; CREATE TRIGGER reject_audit BEFORE INSERT ON audit FOR EACH ROW EXECUTE FUNCTION reject_audit();`);
    await assert.rejects(store.change(a.id, 'fault', w => post(w, { ...command, key: 'fault' })));
    assert.deepEqual(await store.read(a.id), final);
  } finally {
    await store?.close(); await sql?.end();
    await admin`DROP SCHEMA IF EXISTS ${admin(schema)} CASCADE`; await admin.end();
  }
});
