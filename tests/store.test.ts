import {test} from 'node:test';
import assert from 'node:assert/strict';
import {openStore,register,login,session,identify,normalize} from '../lib/store';
import {createAccount,post,balance} from '../lib/ledger';

test('AC17 sessions isolate wallets; foreign account IDs cannot be posted', async ()=>{
  const s = openStore(':memory:');
  try {
    const a = await register(s, 'a@example.com', 'long-password', 'A'), b = await register(s, 'b@example.com', 'long-password', 'B');
    const token = await session(s, a.id);
    assert.equal((await identify(s, token))?.id, a.id);
    assert.equal(await identify(s, 'forged'), undefined);
    await assert.rejects(async () => login(s, 'a@example.com', 'wrong-password'));
    await s.change(a.id, 'account', w => createAccount(w, {id: 'private', name: 'Private', type: 'bank', opening: '100', date: '2026-01-01T00:00:00Z'}));
    assert.equal((await s.read(b.id)).accounts.length, 0);
    await assert.rejects(async () => s.change(b.id, 'transaction', w => post(w, {key: 'x', type: 'expense', amount: '10', account: 'private', description: 'Try', date: '2026-01-02T00:00:00Z'})));
  } finally {
    await s.close?.();
  }
});

test('AC20 SQLite rollback prevents partial financial writes; second spend is rejected', async ()=>{
  const s = openStore(':memory:');
  try {
    const u = await register(s, 'a@example.com', 'long-password', 'A');
    await s.change(u.id, 'account', w => createAccount(w, {id: 'bank', name: 'Bank', type: 'bank', opening: '100', date: '2026-01-01T00:00:00Z'}));
    s.db.exec(`CREATE TRIGGER fail_audit BEFORE INSERT ON audit WHEN NEW.action='fail' BEGIN SELECT RAISE(ABORT, 'injected failure'); END;`);
    const spend = (key: string) => s.change(u.id, key, w => post(w, {key, type: 'expense', amount: '100', account: 'bank', description: 'Purchase', date: '2026-01-02T00:00:00Z'}));
    await assert.rejects(async () => spend('fail'));
    assert.equal(balance(await s.read(u.id), 'bank'), 10000);
    await spend('first');
    await assert.rejects(async () => spend('second'));
    assert.equal(balance(await s.read(u.id), 'bank'), 0);
  } finally {
    await s.close?.();
  }
});

test('AC16 institution normalization handles Unicode case and whitespace', async ()=>{
  assert.equal(normalize('  ＨＤＦＣ   Bank '), normalize('hdfc bank'));
  const s = openStore(':memory:');
  try {
    const insert = s.db.prepare('INSERT INTO institutions VALUES(?,?,?,?,?)');
    assert.throws(() => insert.run('duplicate', ' HDFC   BANK ', 'bank', 'IN', normalize(' HDFC   BANK ')));
  } finally {
    await s.close?.();
  }
});
