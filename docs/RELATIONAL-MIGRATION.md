# Relational storage rollout

## What is implemented

This release adds a **compatibility-first relational store**. It does not change authentication or financial rules and does not activate production wallets automatically.

Tracked migrations live in `database/migrations/`. `001_initial.sql` captures the existing PostgreSQL bootstrap schema. `003_relational_wallet.sql` adds wallet storage selection and these tables:

| Table | Data |
|---|---|
| `dw_v3_wallet_meta` | Source version, checksum, timezone/schema metadata |
| `dw_v3_accounts` | Account identities, types, opening amounts and descriptive fields |
| `dw_v3_categories` | Category definitions |
| `dw_v3_events` | Current journal/transaction headers |
| `dw_v3_lines` | Signed journal postings |
| `dw_v3_revisions` | Earlier commands and edit metadata |
| `dw_v3_limits` | Dated credit-limit history |
| `dw_v3_allocations` | Bank-held loan allocations and counters |
| `dw_v3_commitments` | Legacy card-funding commitments |
| `dw_v3_budgets` | Monthly budget totals |
| `dw_v3_budget_categories` | Category budget allocations |
| `dw_v3_deleted_accounts` | Historical deleted-account snapshots |
| `dw_v3_management` | Account/category management history |

The `dw_v3_` names avoid collisions with existing tables. Text identifiers are preserved, including generated loan IDs and seeded institution IDs. Money columns use BIGINT constrained to JavaScript's exact integer range. Required financial fields become columns; optional metadata, command snapshots, revision payloads and historical per-event balance snapshots remain JSONB. Date strings retain their exact historical representation in this compatibility release. Typed date projections and transaction pagination are future query-layer work; do not assume text-date indexes correctly order arbitrary timezone offsets.

Institution strings are preserved as-is rather than being silently matched to catalog IDs. Existing audit records stay in `audit`, and detailed existing history is preserved in the new history tables. Standalone allocation-movement and request-deduplication tables are not introduced yet: command/revision history and existing ledger idempotency remain authoritative.

## Safety properties

- No production connection is used automatically by the migration tool. It requires `DIGIWALLET_MIGRATION_URL` explicitly.
- Migration files are versioned with SHA-256 checksums and executed transactionally under an advisory lock. Applied files must not be edited; add another migration for later changes.
- `backfill` copies and verifies data without changing the active storage mode.
- `activate` locks one wallet, refreshes its relational copy from the latest JSON version, verifies the database round trip, then switches that wallet atomically.
- Each wallet is independently resumable. An interrupted batch may have completed earlier wallets; rerunning is safe. It is not an all-users atomic switch.
- Active relational writes update changed rows and the wallet version in one transaction. The original JSON is frozen, not continually rewritten.
- Wallet reads use a repeatable-read snapshot. Changes serialize on the existing wallet row lock.
- Composite foreign keys enforce ownership for child records. Deferred journal checks reject unbalanced postings and foreign/missing financial accounts while permitting internal equity/income/expense accounts.
- Revision, management-history and deleted-account snapshots cannot be rewritten or removed by the relational adapter.
- Legacy JSONB objects and legacy JSON-encoded strings are both supported.
- Reconciliation compares all persisted wallet content, individual account balances and summaries. Missing and undefined optional JavaScript properties are equivalent after JSON persistence. Migration never resets original recording timestamps.

## Database access model

This release keeps server-side custom sessions. Tables are not available for direct browser CRUD: RLS is enabled and PUBLIC/anon/authenticated table permissions are revoked by the migration. This includes the existing authentication/wallet tables. The current server and migration connection must use the trusted table-owning PostgreSQL role. Do not enable this migration for a restricted deployment role without first designing and testing its explicit permissions.

This is **not** a Supabase Auth/auth.uid()-policy implementation. Server endpoints still authenticate the session and select the correct user. Composite ownership constraints are additional protection, not a substitute for API authorization. Privileged database credentials remain server-only. A later Auth migration must design restricted-role permissions and per-user policies explicitly.

## Operator runbook

Run from the project root with Node dependencies installed. Supply `DIGIWALLET_MIGRATION_URL` privately in the shell/environment. Do not paste credentials into source files or command logs. Use a direct/session connection suitable for schema migrations; the application can keep its existing pooler connection. Do not change Vercel `DATABASE_URL` merely to select relational storage.

1. Back up the actual database and rehearse restoring it into an isolated environment. The local synthetic rehearsal is not a substitute for production-data verification.
2. Deploy this backwards-compatible application build while wallets are still using JSON. Do not activate wallets until every serving instance understands relational storage.
3. Run `npm run db -- migrate` against staging first, then the intended database. It adds tables and permissions; it does not switch wallets.
4. Run `npm run db -- backfill --all`. A mismatch or unsupported historical shape aborts that wallet rather than silently dropping data.
5. Inspect the staging application and financial reports. Use `npm run db -- status` for mode counts.
6. During a maintenance window that stops registrations and wallet writes, run `npm run db -- activate --all`. After successful completion, the database default also changes so newly registered wallets use relational storage.
7. Check `npm run db -- status`, then sign in and verify balances, history, borrowing, card repayment, editing and export before reopening writes.
8. Retain legacy JSON and backups. This release intentionally contains no destructive retirement migration.

Use `--user USER_ID` instead of `--all` for a staging/canary wallet. Activating one user does not change the registration default. Status on a brand-new empty database requires the initial schema first.

For rollback while this build is still running, stop writes and run `npm run db -- rollback --all`. This exports the **current relational state including post-cutover writes** back to JSON before switching each wallet back. It also resets the registration default. Check mode counts and data before deploying an older build. Never manually flip storage_mode back to jsonb: the preserved JSON can be stale.

The schema migration runner and CLI assume the standard configured database search path; do not target an unrelated schema. `--all` operations require the maintenance window to avoid registrations racing with the batch/default change.

## Verification and remaining rollout work

Tests cover exact codec preservation, loan-funded card repayment without double expenses, available balance/net worth, old metadata/commitments, transaction revisions, idempotency, composite ownership, deferred balancing, concurrent changes, rollback after an injected audit failure, backwards-compatible legacy operation, new relational registrations, and reverse export after new writes.

The full existing accounting engine still reconstructs/replays a wallet. Reads still assemble all records and verify a checksum; event balance snapshots can grow with account count. This release establishes a tested migration boundary, **not a demonstrated performance improvement for large wallets**. Next stages are paginated reads, SQL summaries, typed time projections, more selective replay, expanded structured audit events, and measured performance benchmarks. Supabase Auth migration remains a separate stage requiring identity mapping, recovery flow and deployment configuration.

No production data, Supabase settings, Vercel settings, or users were changed during local implementation. Production backup restoration and reconciliation against actual data remain operator rollout requirements.
