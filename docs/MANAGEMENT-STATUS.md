# Project status — account and transaction management

13 November 2026. Implementation is complete in source for the approved revised rules. Local validation is complete as detailed below; live PostgreSQL and interactive browser/device validation remain outstanding. The initial request for transaction deletion was explicitly withdrawn by the user.

## A. Existing implementation

Before this change, DigiWallet provided registration/sign-in/sign-out, persistent per-user wallets, bank/cash/card/investment/loan/receivable accounts, opening balances, account rename/archive, institution selection, expense categories, monthly budgets, account filters, transaction search, heatmap drilldown and JSON export.

Financial events included income, cash/card expenses, liquid transfers, investment contributions/returns, borrowed funds with linked loan creation, lending and receipts, principal repayment with interest/fees, card payments, ordinary linked refunds and purpose reservation releases/transfers. The ledger used exact integer paise and balanced journal lines. Available bank/cash balance and net worth were separate.

The user had added PostgreSQL storage, alongside SQLite fallback, before this implementation. PostgreSQL mutations use row locking and a database transaction covering wallet state and audit writes. The UI used one centered mobile-width blue/white layout.

## B. Newly implemented features

- Full unused-account editing; opening/type/details lock after non-opening activity.
- Permanent closure of cleared accounts and Profile → Closed accounts/history.
- Deletion of unused accounts, including nonzero openings, with retained account/opening snapshots.
- Server-recorded creation timestamps and institution editing limited to the first 24 hours; unknown legacy timestamps remain locked.
- Dated credit-limit history, including reductions below outstanding debt and blocked further spending.
- Credit-card available-credit input with automatic opening debt calculation.
- Dedicated /transactions/[id] detail pages, previous-version display, and editing within 24 hours of original recording.
- Swipe-left to reveal Edit, followed by tapping Edit; a visible Edit button also supports desktop/keyboard access.
- Revision conflict checks and idempotent edit retries.
- Predefined category icon picker, unused category editing/deletion, used category locking/archive, and budget-reference preservation.

No transaction deletion was implemented. No Deleted Transactions section exists, as requested in the revised requirements.

## C. Updated functionality

Payment selectors show bank/cash balances and spendable card credit. Account-specific transaction rows show dated balance-after values; Home recent activity does not. Long descriptions truncate in lists and appear fully on the detail page.

A bank holding usable loan funds reveals Own/Loan. A single eligible loan is selected automatically; multiple eligible loans are listed by loan, limited to that bank. Multiple draws for the same loan can fund a single debit. New borrowed receipts are tracked in their selected bank.

Card purchases have no loan selector. Paying the card from a loan-holding bank can consume the selected loan funding. The card purchase remains the expense; the repayment is not a second expense and does not reduce loan principal. The event is visible in bank/card history and the linked loan-use history. Existing earmarked card purchases remain replayable and settle their commitments first.

Transaction edits rebuild later balances, loan allocations, reports and category spending. Invalid edits (insufficient funds, excessive refunds, broken loan funding, closed-account obligations, etc.) fail atomically. Original recorded timestamps never reset. Current balances cannot be directly overwritten.

Archived categories are absent from new expense choices. Existing budget allocations remain visible where relevant and must be explicitly retained or redistributed; new/increased archived-category allocations are rejected.

## D. Database changes

No new relational tables or columns. The wallet document gains additive version-2 fields for lifecycle timestamps, dated limits, revision history, deleted unused-account snapshots, management history, category icons and loan funding references. Detailed field definitions and deployment steps are in MIGRATION-V2.md.

Reads and mutations normalize old documents idempotently, without manufacturing account creation times. Defaults persist on the next successful mutation. Transaction revisions and management records remain in the same atomic wallet document and are included in JSON export. Current PostgreSQL table layout and ownership boundaries are retained.

## E. Backend implementation

The authenticated wallet API now supports editAccount, deleteAccount, closeAccount, creditLimit, editTransaction and deleteCategory, alongside existing actions. Existing archive/category/budget actions enforce the new rules. Strict request schemas reject unsupported actions, including transaction deletion.

Shared ledger functions handle account lifecycle, edit deadlines, revision checks, exact monetary parsing, historical credit limits, category restrictions, budgets and bank-specific loan funding. Rebuild updates dependent financial projections and refuses invalid results before committing. PostgreSQL and SQLite adapters both normalize version-2 documents at their read/write boundaries.

Credit-card debt may exceed a newly reduced limit; spendable credit displays zero. Purchases are validated against the limit effective on their transaction date. Payments can reduce that debt normally.

## F. Frontend implementation

Updated account forms, account settings, credit-limit history/editor, closure/deletion confirmation and profile closed-account access. Updated debit funding controls and editable transaction forms with review/confirmation. Added full transaction detail routes with timestamps, affected accounts, balances, notes, loan metadata and revision history.

History uses compact category icons, date/time, ellipsis descriptions, right-aligned amounts, account-specific balances and swipe actions. Budget categories use soft colour panels. The five new Paytm/YONO references informed these details without adding unrelated bank/payment capabilities or replacing the existing mobile-first shell.

Category management now offers a predefined icon grid and clear active/archived/used states. Archived budget allocations are explicitly editable downward rather than silently discarded.

## G. Testing report

- 49 automated tests passed; 1 optional PostgreSQL integration test skipped because DIGIWALLET_TEST_POSTGRES_URL was not supplied.
- TypeScript checking passed.
- Next.js production build passed, including the new dynamic transaction route.
- Existing production HTTP smoke suite passed on an isolated local SQLite QA database: authentication, ownership, origin rejection, borrowing/linked loans, full cash-loan example, retries/conflicts, budgets, concurrent spend protection and export.
- New management HTTP smoke suite passed: derived card openings, loan-funded card repayments, transaction edits, retry idempotency, stale-edit conflict, audit retention, invalid account/category operations, rejected transaction deletion and the detail route response.
- Component rendering tests verify ordinary debit funding is hidden, holding-bank funding is shown, card purchases hide funding, account history includes balance-after while Home does not, and card opening inputs derive outstanding debt.
- Accounting tests cover dated limit reductions, over-limit naming edits, funding isolation by bank/loan, multiple draws, 24-hour boundary, subsequent running-balance replay, generated loans, failed edit rollback, closed balances, category history and idempotent migration.
- Legacy card-commitment regression fixtures are explicitly built as old records; new creation of that old funding pattern is rejected as required.

During validation, two old tests initially attempted to create now-disallowed loan-funded card purchases. They were converted into explicit legacy-history fixtures so compatibility continues to be tested, while new tests assert that new card purchases cannot select loan funds. Review also corrected name editing on over-limit cards and preserved original funding choices during historical edits.

Windows filesystem/localhost restrictions required rerunning the build and HTTP checks with appropriate access. These reruns passed. Test data remained isolated from the user's normal database.

Interactive swipe behaviour, keyboard traversal, modal stacking and pixel-level layout on physical/mobile browsers were not verified because browser-control tools were unavailable. Server-rendering tests do not substitute for those checks.

## H. Pending work

- Run the opt-in PostgreSQL integration test against a disposable PostgreSQL database, then exercise the deployed staging app with Supabase. No live database test was claimed.
- Perform interactive desktop/mobile visual and accessibility checks, including swipe gestures and nested account/category dialogs.
- Push/deploy the source update when ready; no GitHub push or Vercel deployment was performed.
- Existing out-of-scope product gaps remain: split-category/funding transactions, partial reservation transfers, funded-refund restoration, opening reservations for legacy debt, automated interest, official bank logos/catalog moderation, generalized adjustments/write-offs and scalable paginated reporting.
- Existing production considerations remain: PostgreSQL schema provisioning/backup verification, authentication/rate-limit hardening and removing unsafe temporary SQLite fallback if DATABASE_URL is absent on Vercel. This feature change did not redesign hosting or identity.

## I. Overall project status

The approved account/category management, 24-hour transaction editing, linked-bank loan funding and transaction detail/list changes are implemented and pass local automated/build/HTTP checks. No requested transaction-deletion work remains: that feature was explicitly cancelled. The remaining release work is PostgreSQL integration and interactive browser verification, followed by deployment.
