# Supabase PostgreSQL-only storage

DigiWallet now uses Supabase PostgreSQL for both local development and Vercel. There is no embedded database adapter, in-memory database substitute, temporary-file database or automatic fallback.

## Configuration

Set DATABASE_URL on the server. For local Next.js development, put it in .env.local at the project root; for Vercel, set it for the appropriate deployment environment and redeploy. Do not prefix it with NEXT_PUBLIC_. Copy the complete transaction-pooler URL from your Supabase project, replacing the password placeholder with the URL-encoded database password:

```text
postgresql://postgres.PROJECT_REF:ENCODED_PASSWORD@YOUR_POOLER_HOST:6543/postgres
```

Do not copy the placeholder hostname literally or commit real credentials. Existing working DATABASE_URL values do not need to change for this code update. DIGIWALLET_DB is no longer used.

The server requires a nonempty postgres:// or postgresql:// URL with a host and database name. Invalid/missing configuration fails explicitly when a request initializes storage; it never creates local files. Database access stays lazy, so compilation and pure unit tests do not need production credentials. Builds succeeding does not prove database connectivity.

The existing application schema must be provisioned in Supabase: users, wallets (state JSONB, version, updated_at), sessions, institutions, audit and attempts. This adapter removal requires no new database fields or tables and does not alter or reset existing Supabase records. The application continues using its own password/session model backed by PostgreSQL; it does not switch to Supabase Auth.

## Removed

- Embedded database adapter, its Node import and filesystem setup.
- Local and temporary database path selection and in-memory database mode.
- Optional database selection: PostgreSQL is mandatory.
- Embedded-storage test setup and database-handle field on the Store interface.

A separate PostgreSQL-only singleton avoids reusing an old adapter instance during development reloads. Existing local database files/backups are left intact but are no longer read. This change does not import old local records into Supabase.

## Validation

Run npm test, npm run typecheck and npm run build. Configuration tests cover missing URLs, invalid/non-PostgreSQL URLs and avoiding credentials in configuration error messages. Accounting, management, UI-rendering and origin checks remain database-independent.

Set DIGIWALLET_TEST_POSTGRES_URL to a disposable PostgreSQL test database to enable the integration test. It does not use the production DATABASE_URL implicitly. It creates a randomly named dw_test_ schema, verifies sessions/login/logout, wallet isolation, normalized institution uniqueness, row locking, versioned edits and rollback after an injected audit-write failure, then removes its own test schema.

Without a dedicated test URL, that integration test is explicitly skipped. The HTTP smoke scripts likewise require a running app connected to a separate PostgreSQL QA database; they create synthetic data. Earlier SQLite-based HTTP/storage results in historical reports do not validate this update's live Supabase connection.
