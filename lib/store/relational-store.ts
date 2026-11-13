import type { Sql } from 'postgres';
import type { Wallet } from '../ledger';
import { encodeWallet, decodeWallet, fields, canonical, reconcile, fingerprint, type Collection, type EncodedWallet, type Row } from './relational-codec';

type Query = Pick<Sql, 'unsafe' | 'json'>;
const collections = Object.keys(fields) as Collection[];

// Caller supplies a transaction. Reads must use a repeatable snapshot or hold
// the parent wallet lock; otherwise separate child queries could mix versions.
export async function readRelational(sql: Query, user: string, version: number): Promise<Wallet> {
  const meta = await sql.unsafe('SELECT * FROM dw_v3_wallet_meta WHERE wallet_id=$1', [user]);
  if (!meta[0] || meta[0].source_version !== version) throw new Error('Relational wallet is missing or out of sync.');
  const rows = {} as EncodedWallet['rows'];
  for (const kind of collections) {
    const result = await sql.unsafe(`SELECT to_jsonb(r) - 'wallet_id' AS record FROM dw_v3_${kind} r WHERE wallet_id=$1 ORDER BY position`, [user]);
    rows[kind] = result.map(r => r.record as Row);
  }
  const wallet = decodeWallet({ metadata: meta[0].metadata, rows });
  if (fingerprint(wallet) !== meta[0].checksum) throw new Error('Relational wallet checksum mismatch.');
  return wallet;
}

export async function writeRelational(sql: Query, user: string, wallet: Wallet, version: number) {
  const encoded = encodeWallet(wallet);
  const report = reconcile(wallet, decodeWallet(structuredClone(encoded)));
  await sql.unsafe(`INSERT INTO dw_v3_wallet_meta(wallet_id,source_version,metadata,checksum)
    VALUES($1,$2,$3::jsonb,$4) ON CONFLICT(wallet_id) DO UPDATE SET
    source_version=excluded.source_version,metadata=excluded.metadata,checksum=excluded.checksum`,
    [user, version, sql.json(encoded.metadata as never), report.checksum]);
  for (const kind of collections) {
    const table = 'dw_v3_' + kind; // Closed allowlist, never request input.
    const existing = await sql.unsafe(`SELECT to_jsonb(r) - 'wallet_id' AS record FROM ${table} r WHERE wallet_id=$1`, [user]);
    const before = new Map(existing.map(r => [r.record.row_id, canonical(r.record)]));
    if (['revisions','management','deleted_accounts'].includes(kind)) {
      const after = new Map(encoded.rows[kind].map(r => [r.row_id, canonical(r)]));
      for (const [id, value] of before) if (after.get(id) !== value) throw new Error('Historical records cannot be changed or removed.');
    }
    for (const row of encoded.rows[kind]) {
      if (before.get(row.row_id) === canonical(row)) continue;
      const keys = Object.keys(row).filter(k => k !== 'row_id');
      // All keys come from this module's codec, not user-provided object keys.
      await sql.unsafe(`INSERT INTO ${table} SELECT * FROM jsonb_populate_record(NULL::${table},$1::jsonb)
        ON CONFLICT(wallet_id,row_id) DO UPDATE SET ${keys.map(k => `${k}=excluded.${k}`).join(',')}`,
        [sql.json({ wallet_id: user, ...row } as never)]);
    }
  }
  for (const kind of [...collections].reverse()) {
    await sql.unsafe(`DELETE FROM dw_v3_${kind} WHERE wallet_id=$1 AND row_id NOT IN
      (SELECT jsonb_array_elements_text($2::jsonb))`, [user, sql.json(encoded.rows[kind].map(r => r.row_id))]);
  }
  // Verify the actual database representation, not just the in-memory codec.
  reconcile(wallet, await readRelational(sql, user, version));
  return report;
}

export async function backfillWallet(sql: Sql, user: string, activate = false) {
  return sql.begin(async tx => {
    const rows = await tx`SELECT state,version,storage_mode FROM wallets WHERE user_id=${user} FOR UPDATE`;
    const row = rows[0];
    if (!row) throw new Error('Wallet not found.');
    if (row.storage_mode === 'relational') {
      const wallet = await readRelational(tx, user, row.version);
      return { ...reconcile(wallet, wallet), mode: 'relational', alreadyMigrated: true };
    }
    const report = await writeRelational(tx, user, (typeof row.state === 'string' ? JSON.parse(row.state) : row.state) as Wallet, row.version);
    if (activate) await tx`UPDATE wallets SET storage_mode='relational' WHERE user_id=${user}`;
    return { ...report, mode: activate ? 'relational' : 'jsonb', alreadyMigrated: false };
  });
}

// Explicit reverse export includes all writes made AFTER activation. Never
// switch back to the old frozen state directly.
export async function restoreJsonStorage(sql: Sql, user: string) {
  await sql.begin(async tx => {
    const rows = await tx`SELECT version,storage_mode FROM wallets WHERE user_id=${user} FOR UPDATE`;
    if (!rows[0]) throw new Error('Wallet not found.');
    if (rows[0].storage_mode !== 'relational') return;
    const wallet = await readRelational(tx, user, rows[0].version);
    await tx`UPDATE wallets SET state=${tx.json(wallet as never)}::jsonb,storage_mode='jsonb' WHERE user_id=${user}`;
  });
}
