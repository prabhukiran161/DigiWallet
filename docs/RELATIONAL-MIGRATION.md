# DigiWallet database schema

## Design

The database stores one row per independent record. Accounts, categories, transactions, journal entries, revisions, loan funding, and monthly category budgets have separate tables. A transaction updates only affected account and history rows; it does not replace a wallet JSON document.

| Table | Purpose |
|---|---|
| `dw_users` | Application users and salted password hashes. |
| `dw_sessions` | Hashed sign-in tokens and expirations. |
| `dw_wallets` | Per-user wallet settings, timezone, version, and timestamps. |
| `dw_institutions` | Shared bank, investment, and lender catalog. |
| `dw_accounts` | Bank, cash, card, investment, loan, and receivable accounts. Stores current balance in paise and dated credit-limit history. |
| `dw_categories` | Per-wallet transaction categories. |
| `dw_transactions` | Transaction header, date, amount, category, summary figures, and optional command details. |
| `dw_transaction_entries` | Balanced signed entries that change accounts or internal equity/income/expense accounts. |
| `dw_transaction_revisions` | Immutable earlier commands for corrections and retry protection. |
| `dw_loan_funding` | Loan amount, purpose, holding bank, remaining amount, usage, and old card-funding commitments. |
| `dw_budgets` | One row per wallet, month, and category; monthly totals are calculated with `SUM`. |
| `dw_audit_log` | Operational actions, management history, and deleted-account snapshots. |
| `dw_rate_limits` | Shared, expiring request limits for server instances. |
| `dw_schema_migrations` | Applied schema version and checksum. |

There is no separate card table: credit cards are accounts with `type='card'`. IDs remain text because the application and generated loan accounts already use stable text identifiers. Money is integer paise, constrained to JavaScript's safe integer range. JSONB is limited to small flexible details, credit-limit history, transaction command/snapshot details, and legacy funding commitments; it is never the entire wallet.

Current account balances are stored for fast account/dashboard reads and updated inside the same transaction as their journal entries. Reads check the stored balance against the journal. A mismatch is reported instead of silently correcting the balance. Account name edits do not change historical opening-transaction descriptions.

## Apply the schema

From the project directory, configure `DIGIWALLET_MIGRATION_URL` privately in PowerShell. Use a Supabase direct or session-pooler connection. The tool deliberately does not fall back to `DATABASE_URL`; that connection is normally for the running application.

```powershell
$secret = Read-Host 'Supabase PostgreSQL URL' -AsSecureString
$env:DIGIWALLET_MIGRATION_URL = [System.Net.NetworkCredential]::new('', $secret).Password
npm.cmd run db -- migrate
npm.cmd run db -- status
```

For this development reset, confirm the database is the intended DigiWallet development project, then run:

```powershell
npm.cmd run db -- reset --confirm-empty-development
npm.cmd run db -- status
```

Reset removes only named DigiWallet tables in `public` (including the previous `dw_v3_*` and old app tables), then creates the new schema. It does not drop Supabase-managed schemas such as `auth` or `storage`. It is destructive to DigiWallet tables and must never be aimed at a database whose data should be kept.

The SQL enables RLS and denies browser roles direct table access. The current app uses its own server-verified sessions and a trusted server-side PostgreSQL role. Do not expose the database password or privileged keys in the browser. The app must be deployed with the new code before it is used against this schema. Keep Vercel's server-only `DATABASE_URL` pointed at the same database and update/redeploy the code through the normal deployment flow.

Remove the migration URL when done:

```powershell
Remove-Item Env:DIGIWALLET_MIGRATION_URL
Remove-Variable secret
```

## Query and write behavior

The current UI still asks for a complete wallet view, so the read endpoint assembles that response in one SQL statement. It no longer reads a JSON wallet from one database column. On a change, the server locks the user's wallet row, reads the wallet projection, applies existing ledger validation, and writes only rows whose values changed. Account changes update account rows; transaction changes update transaction and journal rows; budgets update the affected month/category rows. Changes, audit records, and wallet version commit or roll back together.

The next performance step is adding paginated transaction endpoints and screen-specific dashboard/history queries, so the browser and server do not load all historical activity for every screen. The current architecture improves write scope and round trips but still reconstructs the accounting projection in application memory. Do not claim large-ledger performance until it has been measured.

Loan receipts create the loan account and bank journal entry. Purpose funding is held against the selected bank. Credit-card expenses remain separate from funding selection; card repayment can consume bank-held loan funds without recording the expense twice. Available balance and net worth remain separately derived measures.

## Verification

Set `DIGIWALLET_TEST_POSTGRES_URL` to a disposable PostgreSQL database to run database integration tests. Tests create a random temporary schema and remove that schema after the run. Never point it to a database containing important data. The default suite skips these tests when the variable is absent.
