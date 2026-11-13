# Account and transaction management — approved implementation

13 November 2026. This plan incorporates the user's revisions and replaces the transaction-deletion proposal in the initial instructions.

## Approved rules

- Opening balance and account type can change only before any non-opening activity. An unused account with a nonzero opening balance can be deleted, with a retained deletion record.
- Account names remain editable; institution changes require a known server creation timestamp less than 24 hours old. Older accounts without that timestamp remain locked for institution changes.
- No current-balance overwrite or adjustment feature. Used accounts keep their opening details. Credit-limit changes are separate dated records.
- Close only cleared accounts with no remaining funding obligations. Closure is permanent, blocks new transactions, and is accessible under Profile. Archive is reversible and blocks new transactions.
- Card creation uses total limit and available credit; outstanding is their difference. Limit reductions can create over-limit debt, but no further purchases are allowed beyond the effective limit.
- No transaction deletion or Deleted Transactions section. Editing is permitted for less than 24 hours from original recordedAt, retains previous versions, and atomically replays subsequent entries. Invalid edits fail without partial changes.
- Home recent activity has no balance-after values. Account-specific history has account balances/card credit after each transaction. Dedicated transaction details and swipe-then-tap Edit are provided.
- Funding is chosen only from the bank holding loan funds. Select Own or Loan; auto-select a sole eligible loan, or select among loans held in that bank.
- A card purchase records the expense with no loan funding selector. A subsequent bank-to-card payment can use loan funds, reducing bank funds, card debt and unused allocation once. It does not reduce loan principal or record another expense.
- Older card commitments retain their history and settle without double-counting.
- Used categories cannot be renamed, re-iconed or deleted. Archive preserves transactions and reports and prevents new use. Budget allocations for archived categories can be retained or explicitly reduced/redistributed, never increased.
- Unused custom categories can be edited or deleted if unreferenced by budgets. Predefined category identities remain protected.

## Delivery sequence

1. Extend the shared ledger and backward-compatible wallet model.
2. Add server validations and authenticated management actions within existing atomic storage operations.
3. Update account/card forms and lifecycle management.
4. Implement bank-based loan selectors, editing and transaction detail navigation.
5. Apply Paytm-inspired list/category treatments and YONO-inspired account statement balances within the existing centered blue/white layout.
6. Add icon/category management and archived-budget handling.
7. Test finance rules, deadlines, compatibility, rendering and HTTP routes; document PostgreSQL/browser validation limits.
8. Publish the A–I status report and migration/deployment instructions with the source changes.
