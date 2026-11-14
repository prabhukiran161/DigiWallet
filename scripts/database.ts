import postgres from 'postgres';
import { resolve } from 'node:path';
import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { requireDatabaseUrl } from '../lib/store/config';

const [command, ...args] = process.argv.slice(2);
const commands = ['status', 'migrate', 'reset'];
if (!commands.includes(command)) throw new Error('Usage: npm run db -- status|migrate|reset --confirm-empty-development');
// Explicit migration credential only: never silently use the production app URL.
const url = requireDatabaseUrl(process.env.DIGIWALLET_MIGRATION_URL);
const sql = postgres(url, { max: 1, prepare: false, connect_timeout: 10 });
try {
  if (command === 'migrate' || command === 'reset') {
    if (command === 'reset' && !(args.length===1 && args[0]==='--confirm-empty-development')) throw new Error('Reset requires --confirm-empty-development.');
    if (command === 'migrate' && args.length) throw new Error('migrate takes no additional arguments.');
    const file=resolve('database/schema.sql');
    const body=await readFile(file,'utf8');
    const checksum=createHash('sha256').update(body).digest('hex');
    const logos=await readFile(resolve('database/002_institution_logos.sql'),'utf8');
    const logosChecksum=createHash('sha256').update(logos).digest('hex');
    await sql.begin(async tx=>{
      await tx`SELECT pg_advisory_xact_lock(71904123)`;
      await tx.unsafe('SET LOCAL search_path TO public');
      if(command==='reset') {
        await tx.unsafe(`DROP TABLE IF EXISTS dw_v3_wallet_meta,dw_v3_accounts,dw_v3_categories,dw_v3_events,dw_v3_lines,dw_v3_revisions,dw_v3_limits,dw_v3_allocations,dw_v3_commitments,dw_v3_budgets,dw_v3_budget_categories,dw_v3_deleted_accounts,dw_v3_management,attempts,audit,institutions,wallets,sessions,users,dw_rate_limits,dw_audit_log,dw_budgets,dw_loan_funding,dw_transaction_revisions,dw_transaction_entries,dw_transactions,dw_categories,dw_accounts,dw_sessions,dw_institutions,dw_wallets,dw_users,dw_schema_migrations CASCADE`);
        await tx.unsafe('DROP FUNCTION IF EXISTS dw_check_balanced_transaction() CASCADE; DROP FUNCTION IF EXISTS dw_check_funding_account_types() CASCADE; DROP FUNCTION IF EXISTS dw_v3_check_journal() CASCADE;');
      }
      else {
        const exists=await tx`SELECT to_regclass('public.dw_users') AS present`;
        if(exists[0].present) {
          const applied=await tx`SELECT checksum FROM dw_schema_migrations WHERE name='002_institution_logos'`;
          if (applied[0]) {
            if (applied[0].checksum !== logosChecksum) throw new Error('Institution logo migration checksum mismatch.');
            return;
          }
          await tx.unsafe(logos);
          await tx`INSERT INTO dw_schema_migrations(name,checksum) VALUES('002_institution_logos',${logosChecksum})`;
          return;
        }
        const legacy=await tx`SELECT to_regclass('public.users') AS present`;
        if(legacy[0].present)throw new Error('Old DigiWallet tables exist. Inspect data and use the explicit development reset.');
      }
      await tx.unsafe(body);
      await tx`INSERT INTO dw_schema_migrations(name,checksum) VALUES('001_initial',${checksum})`;
      await tx.unsafe(logos);
      await tx`INSERT INTO dw_schema_migrations(name,checksum) VALUES('002_institution_logos',${logosChecksum})`;
    });
    console.log(command==='reset'?'DigiWallet-owned tables reset and new schema created.':'DigiWallet migrations are up to date.');
  } else if (command === 'status') {
    const tables=await sql`SELECT tablename FROM pg_tables WHERE schemaname='public' AND tablename LIKE 'dw_%' ORDER BY tablename`;
    const counts=await sql`SELECT (SELECT count(*)::int FROM dw_users) users,(SELECT count(*)::int FROM dw_wallets) wallets,(SELECT count(*)::int FROM dw_accounts) accounts,(SELECT count(*)::int FROM dw_transactions) transactions`;
    console.log(JSON.stringify({tables:tables.map(x=>x.tablename),counts:counts[0]}, null, 2));
  }
} catch (error) {
  // Do not print connection URLs, wallet contents, or database error details.
  console.error('Database operation stopped. Completed wallets remain committed; the failing wallet was rolled back.');
  console.error(error instanceof Error ? error.name : 'Unknown error');
  process.exitCode = 1;
} finally {
  await sql.end();
}
