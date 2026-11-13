import postgres from 'postgres';
import { resolve } from 'node:path';
import { applyMigrations } from '../lib/store/migrations';
import { backfillWallet, restoreJsonStorage } from '../lib/store/relational-store';
import { requireDatabaseUrl } from '../lib/store/config';

const [command, ...args] = process.argv.slice(2);
const commands = ['status', 'migrate', 'backfill', 'activate', 'rollback'];
if (!commands.includes(command)) throw new Error('Usage: npm run db -- status|migrate|backfill|activate|rollback [--all | --user ID]');
// Explicit migration credential only: never silently use the production app URL.
const url = requireDatabaseUrl(process.env.DIGIWALLET_MIGRATION_URL);
const sql = postgres(url, { max: 1, prepare: false, connect_timeout: 10 });
try {
  if (command === 'migrate') {
    if (args.length) throw new Error('migrate takes no additional arguments');
    await applyMigrations(sql, resolve('database/migrations'));
    console.log('Schema migrations applied. No wallets activated.');
  } else if (command === 'status') {
    const rows = await sql`SELECT COALESCE(to_jsonb(wallets)->>'storage_mode','jsonb') AS mode,count(*)::int AS wallets FROM wallets GROUP BY 1`;
    console.log(JSON.stringify(rows, null, 2));
  } else {
    const all = args.length === 1 && args[0] === '--all';
    const user = args.length === 2 && args[0] === '--user' && args[1] ? args[1] : null;
    if (!all && !user) throw new Error('Select --user ID or --all explicitly.');
    if (all && command === 'rollback') await sql.unsafe("ALTER TABLE wallets ALTER COLUMN storage_mode SET DEFAULT 'jsonb'");
    const users = user ? [{ user_id: user }] : await sql`SELECT user_id FROM wallets ORDER BY user_id`;
    let processed = 0;
    for (const row of users) {
      if (command === 'rollback') await restoreJsonStorage(sql, row.user_id);
      else await backfillWallet(sql, row.user_id, command === 'activate');
      processed++;
    }
    if (all && command === 'activate') await sql.unsafe("ALTER TABLE wallets ALTER COLUMN storage_mode SET DEFAULT 'relational'");
    console.log(JSON.stringify({ operation: command, processed }));
  }
} catch (error) {
  // Do not print connection URLs, wallet contents, or database error details.
  console.error('Database operation stopped. Completed wallets remain committed; the failing wallet was rolled back.');
  console.error(error instanceof Error ? error.name : 'Unknown error');
  process.exitCode = 1;
} finally {
  await sql.end();
}
