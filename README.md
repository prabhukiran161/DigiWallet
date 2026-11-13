Latest update: [Account and transaction management](docs/MANAGEMENT-STATUS.md). See [wallet model migration and deployment](docs/MIGRATION-V2.md) for PostgreSQL-compatible changes and validation steps.

# DigiWallet

A runnable Next.js personal finance tracker built from the included **Project Document.docx** and its confirmed project decisions. This implementation covers the core daily accounting and loan workflows; it is not yet the complete production release described by the specification. See `docs/STATUS.md` for the precise gaps.

## Run locally

Use Node.js 22.18 or newer (the app uses `node:sqlite`). From this folder:

```powershell
npm ci
npm run dev
```

Open http://127.0.0.1:3000 and create a local account. New wallets are empty. Data persists in `data/digiwallet.sqlite`; it is not stored in the browser. No bank connections or real payments are made. Set `DIGIWALLET_DB` to choose another database file.

```powershell
npm test
npm run typecheck
npm run build
npm start
```

With the server running, `node tests/api-smoke.mjs` verifies the HTTP workflow using isolated synthetic accounts. It adds test accounts to that server's database; use a separate database for QA. Webpack is selected because this Windows environment's Turbopack CSS helper failed to start. The production Webpack build was verified.

## Core behavior

- Bank accounts, physical cash, credit cards, investments, loan liabilities and lending receivables, with dated opening balances.
- Credit/debit forms for income, expenses, loans received, transfers, investment contributions and capital returns, card payments, lending, repayment receipts, loan principal/interest/fees, ordinary refunds and reservation release.
- Receiving borrowed money atomically credits the chosen bank and creates a linked loan, or adds a draw to an existing loan. Lender, type, purpose and manual terms are retained.
- Purpose funding is a reservation, not another cash asset. Funded spending debits the real payment account once and does not reduce principal. Principal repayments do not inflate budget expenses.
- Available balance = bank + cash. Net worth = those balances + investments + receivables − card debt − loan principal. Reserved and unallocated cash are separate planning metrics.
- Monthly budgets, editable/archiveable categories, daily heatmap drilldown, filtered history, linked entries, balance-after-event details, account rename/archive and JSON export.
- Local password authentication with scrypt, hashed opaque sessions, HTTP-only cookies, same-origin mutations, per-wallet ownership checks and atomic SQLite writes.

## Structure

`app/` contains the interface and authenticated HTTP routes. `lib/ledger.ts` owns financial rules and rebuildable journal projections. `lib/store.ts` owns durable transactions and identity. `tests/` contains accounting, storage, origin and HTTP tests. `docs/` records the source, implementation decisions and remaining release work.

Amounts are exact integer paise within a bounded safe-integer range. Inputs are parsed with BigInt before conversion; excess decimal precision is rejected. Wallet state and its journals are stored as one JSON aggregate per user. With DATABASE_URL set, PostgreSQL stores it as JSONB and uses row-locked atomic writes; otherwise the local SQLite adapter is used. This simple local baseline is intentionally documented: it is not the normalized BIGINT/PostgreSQL architecture recommended for the final large-scale release.

## Data and deployment

The server binds to loopback by default. Keep the database private. Production requires HTTPS, encrypted storage/backups, deployment-specific identity and rate-limit review, and the remaining controls in `docs/STATUS.md`. Do not deploy this Node/SQLite application as a static site or to a Worker-only runtime.

For a local backup, stop the app cleanly and copy the `data` folder, including any SQLite WAL/SHM files if present. Restore into an isolated directory first; retain the original. An automated encrypted backup and measured restore drill are still release work.

## Guidance used

[Frontend UI engineering](https://github.com/addyosmani/agent-skills/blob/main/skills/frontend-ui-engineering/SKILL.md), [test-driven development](https://github.com/addyosmani/agent-skills/blob/main/skills/test-driven-development/SKILL.md), and the [Next.js installation documentation](https://nextjs.org/docs/app/getting-started/installation), plus the version-matched Next.js documentation bundled in `node_modules/next/dist/docs/`.
