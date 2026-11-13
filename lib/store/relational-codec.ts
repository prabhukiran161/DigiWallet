import { createHash } from 'node:crypto';
import { isDeepStrictEqual } from 'node:util';
import { upgradeWallet, balance, summary, type Wallet } from '../ledger';

// Required, queryable fields become columns. Optional historical metadata and
// immutable command/balance snapshots retain their original JSON representation.
export const fields = {
  accounts: ['name', 'type', 'opening', 'date', 'limit', 'institution', 'counterparty', 'purpose', 'loanType', 'terms', 'dueDate', 'archived'],
  categories: ['name', 'archived'],
  events: ['type', 'date', 'recordedAt', 'description', 'notes', 'category', 'expense', 'income', 'inflow', 'outflow'],
  lines: ['account', 'delta'],
  revisions: ['editedAt'],
  limits: ['date', 'limit', 'recordedAt'],
  allocations: ['loan', 'purpose', 'holding', 'assigned', 'remaining', 'committed', 'used', 'released', 'returned'],
  commitments: ['account', 'amount'],
  budgets: ['total'],
  budget_categories: ['category', 'amount'],
  deleted_accounts: ['deletedAt'],
  management: ['action', 'id', 'at'],
} as const;
export type Collection = keyof typeof fields;
export type Row = { row_id: string; parent_id: string | null; position: number; data: Record<string, unknown>; [key: string]: unknown };
export type EncodedWallet = { metadata: Record<string, unknown>; rows: Record<Collection, Row[]> };
const collections = Object.keys(fields) as Collection[];
export const column = (name: string) => 'f_' + name.replace(/[A-Z]/g, x => '_' + x.toLowerCase());

export function canonical(value: unknown): string {
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) return '[' + value.map(canonical).join(',') + ']';
  const obj = value as Record<string, unknown>;
  return '{' + Object.keys(obj).filter(k => obj[k] !== undefined).sort().map(k => JSON.stringify(k) + ':' + canonical(obj[k])).join(',') + '}';
}
export const fingerprint = (value: unknown) => createHash('sha256').update(canonical(value)).digest('hex');

export function encodeWallet(source: Wallet): EncodedWallet {
  const w = upgradeWallet(source);
  const rows = Object.fromEntries(collections.map(k => [k, []])) as unknown as EncodedWallet['rows'];
  function put(kind: Collection, id: string, position: number, value: object, parent: string | null = null) {
    const data = structuredClone(value) as Record<string, unknown>;
    const row: Row = { row_id: id, parent_id: parent, position, data };
    for (const field of fields[kind]) {
      if (!(field in data)) throw new Error(`Missing ${kind}.${field}`);
      const v = data[field];
      if (typeof v === 'number' && !Number.isSafeInteger(v)) throw new Error(`Unsafe integer in ${kind}.${field}`);
      row[column(field)] = v;
      delete data[field];
    }
    if (rows[kind].some(r => r.row_id === id)) throw new Error(`Duplicate ${kind} identity`);
    rows[kind].push(row);
  }
  w.accounts.forEach((a, i) => {
    const { limitHistory, ...rest } = a;
    put('accounts', a.id, i, { ...rest, ...(limitHistory !== undefined ? { hasLimitHistory: true } : {}) });
    limitHistory?.forEach((l, j) => put('limits', JSON.stringify([a.id, j]), j, l, a.id));
  });
  w.categories.forEach((c, i) => put('categories', c.id, i, c));
  w.events.forEach((e, i) => {
    const { lines, revisions, ...rest } = e;
    if (lines.reduce((n, l) => n + BigInt(l.delta), 0n) !== 0n) throw new Error('Unbalanced journal entry');
    put('events', e.id, i, { ...rest, ...(revisions !== undefined ? { hasRevisions: true } : {}) });
    lines.forEach((l, j) => put('lines', JSON.stringify([e.id, j]), j, l, e.id));
    revisions?.forEach((r, j) => put('revisions', JSON.stringify([e.id, j]), j, r, e.id));
  });
  w.allocations.forEach((a, i) => {
    const { commitments, ...rest } = a;
    put('allocations', a.id, i, rest);
    Object.entries(commitments).forEach(([account, amount], j) => put('commitments', JSON.stringify([a.id, account]), j, { account, amount }, a.id));
  });
  Object.entries(w.budgets).forEach(([month, b], i) => {
    put('budgets', month, i, { total: b.total });
    Object.entries(b.categories).forEach(([category, amount], j) => put('budget_categories', JSON.stringify([month, category]), j, { category, amount }, month));
  });
  w.deletedAccounts?.forEach((a, i) => put('deleted_accounts', String(i), i, a));
  w.managementHistory?.forEach((m, i) => put('management', String(i), i, m));
  const { accounts, categories, events, allocations, budgets, deletedAccounts, managementHistory, ...metadata } = w;
  return { metadata, rows };
}

export function decodeWallet(encoded: EncodedWallet): Wallet {
  const rows = <T>(kind: Collection, parent?: string): T[] => encoded.rows[kind]
    .filter(r => parent === undefined || r.parent_id === parent)
    .sort((a, b) => a.position - b.position)
    .map(r => {
      const result = structuredClone(r.data);
      for (const f of fields[kind]) result[f] = r[column(f)];
      return result as T;
    });
  const accounts = rows<Wallet['accounts'][number] & { hasLimitHistory?: boolean }>('accounts');
  accounts.forEach(a => { if (a.hasLimitHistory) a.limitHistory = rows('limits', a.id); delete a.hasLimitHistory; });
  const events = rows<Wallet['events'][number] & { hasRevisions?: boolean }>('events');
  events.forEach(e => {
    e.lines = rows('lines', e.id);
    if (e.hasRevisions) e.revisions = rows('revisions', e.id);
    delete e.hasRevisions;
  });
  const allocations = rows<Wallet['allocations'][number]>('allocations');
  allocations.forEach(a => { a.commitments = Object.fromEntries(rows<{ account: string; amount: number }>('commitments', a.id).map(r => [r.account, r.amount])); });
  const budgets: Wallet['budgets'] = {};
  for (const row of encoded.rows.budgets.sort((a, b) => a.position - b.position)) {
    budgets[row.row_id] = { total: row.f_total as number, categories: Object.fromEntries(rows<{ category: string; amount: number }>('budget_categories', row.row_id).map(r => [r.category, r.amount])) };
  }
  return { ...encoded.metadata, accounts, categories: rows('categories'), events, allocations, budgets,
    deletedAccounts: rows('deleted_accounts'), managementHistory: rows('management') } as Wallet;
}

export function reconcile(source: Wallet, restored: Wallet) {
  const expected = upgradeWallet(source);
  if (canonical(expected) !== canonical(restored)) throw new Error('Migration mismatch: wallet history or metadata differs');
  for (const a of expected.accounts) if (balance(expected, a.id) !== balance(restored, a.id)) throw new Error('Migration mismatch: account balance');
  const months = new Set([...Object.keys(expected.budgets), ...expected.events.map(e => e.date.slice(0, 7))]);
  for (const month of months) if (!isDeepStrictEqual(summary(expected, month), summary(restored, month))) throw new Error('Migration mismatch: summary');
  return { checksum: fingerprint(expected), accounts: expected.accounts.length, events: expected.events.length, allocations: expected.allocations.length };
}
