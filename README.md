# DigiWallet

DigiWallet is a personal finance tracker built with Next.js, React, TypeScript, and Supabase PostgreSQL. It records accounts and manually entered financial activity; it does not connect to banks or make payments.

## Start locally

Use Node.js 22.18 or newer. Configure `DATABASE_URL` for the server and create the database with [the schema guide](docs/RELATIONAL-MIGRATION.md). Keep credentials server-side.

```powershell
npm ci
npm run dev
```

## Verify the app

```powershell
npm test
npm run typecheck
npm run build
```

Set `DIGIWALLET_TEST_POSTGRES_URL` to a disposable database to run the PostgreSQL integration test. It creates and removes a random temporary schema.

## Financial model

- Opening balances are starting positions, not income.
- Borrowed funds increase the selected bank balance and create an equal loan liability.
- Loan-purpose funding is held against the bank account. Credit-card purchases record the expense; later card repayment can draw on loan funds in that bank without recording the expense twice.
- Available funds, reserved funds, card credit, and net worth are separate measures.
- Transfers and investment movements are not ordinary expenses.
- Transaction corrections preserve revisions and rebuild affected projections.

## Code layout

`app/` contains the interface and API routes. `lib/ledger/` enforces financial rules. `lib/store/` handles authentication and PostgreSQL access. `database/schema.sql` defines the PostgreSQL tables. `docs/` contains setup instructions, requirements, and implementation history.
