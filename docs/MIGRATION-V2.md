# Wallet model version 2 — migration and deployment

## What changes

The existing PostgreSQL wallets.state JSONB document remains the storage boundary. Supabase PostgreSQL is now the only supported database backend. No new tables or relational columns are required for this feature set. Existing users, sessions, wallets, institutions, attempts and audit tables remain in use.

The idempotent upgradeWallet function returns a cloned version-2 document on read and before each mutation. New defaults are persisted on the next successful atomic wallet write. Failed writes do not partially persist migrations. There is no bulk production rewrite and no historical balance change merely from reading a wallet.

Additive document fields:

- Wallet: schemaVersion, deletedAccounts, managementHistory.
- Account: createdAt (new accounts only), closedAt, limitHistory[{date, limit, recordedAt}].
- Category: icon, system.
- Journal: revision, revisions[{editedAt, command, requestKey, replacement}], availableBalances on replayed events.
- Command: loanFunding (loan ID, resolved against funding held in the selected bank).
- Account API input: availableCredit (decimal string used to derive opening debt).

Old accounts without createdAt deliberately stay timestamp-unknown. Their institution is locked, rather than inventing an editing window from the opening date. Historic credit limits without saved history use the recorded account limit; the app cannot reconstruct bank changes never entered previously. Older events without availableBalances use their existing balances with dated credit-limit history for display.

Legacy allocation IDs and card commitments still replay. Existing commands are not rewritten to the new funding model. New card purchases cannot select loan funds. Bank card payments consume old commitments first, then any selected uncommitted loan funding.

## Deployment

1. Retain a database backup before deploying changed financial logic.
2. Deploy the source to Vercel using the existing server-only DATABASE_URL (Supabase transaction-pooler connection). No new production environment variable is required.
3. Confirm the existing PostgreSQL schema includes wallets.state (JSONB), wallets.version and wallets.updated_at, as required by the pre-existing adapter. This update does not create or repair the original PostgreSQL schema.
4. Open an existing wallet and verify accounts/history. Version defaults persist with its next successful write.
5. Verify new-account opening correction, card purchase followed by loan-funded card payment, and transaction editing in a staging environment.

No live Supabase schema, data, environment variables, GitHub branch or Vercel deployment was changed during implementation.

## Tests

- npm test: accounting, management, configuration, origin and server-rendered component checks, plus opt-in PostgreSQL integration.
- npm run typecheck and npm run build.
- TEST_URL selects the isolated server used by tests/api-smoke.mjs and tests/management-api-smoke.mjs. Both scripts create synthetic users and transactions; run against a QA server, not production.
- DIGIWALLET_TEST_POSTGRES_URL explicitly enables tests/postgres.test.ts. Supply a disposable PostgreSQL test database. It creates a randomly named dw_test_ schema, checks concurrent writes/edits/rollback, then removes only that schema. The test never falls back to DATABASE_URL and is skipped when the test variable is absent.

Do not roll back to an older application version after users begin creating version-2 records without a compatibility review: older code does not enforce closed-account, revision or funding semantics. Preserve the database backup and export rather than deleting new history.
