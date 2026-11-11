# Mobile-first UI redesign

Implemented 11 November 2026 from the approved UI References plan.

- One centered, maximum-440px wallet layout at every screen size, with open space on desktop.
- White and pale-blue surfaces, glossy blue balance card, compact account cards, consistent icons and bottom navigation.
- Redesigned sign-in, Home, Accounts, Activity, Budget, profile/settings, account creation and transaction entry.
- Account filters cover bank/cash, cards, investments, borrowed money and lending. Loan details have separate funded-use and repayment views.
- Amount-first transactions use a review step with projected balances before confirmation. Borrowing retains new linked-loan creation and credits the chosen bank.
- Available balance, net worth and reserved funds remain distinct. Supporting explanations are expandable.
- Search, filters, heatmap drilldown, budgets, account management, category management and export remain accessible.
- Native modal dialogs, visible keyboard focus, reduced-motion support and safe-area spacing are included.

API and ledger/storage files were compared against pre-redesign hashes and are unchanged. All 22 existing tests and the TypeScript check passed. Browser-based visual, keyboard and mobile-device checks remain pending because the browser-control tools were unavailable during this redesign. Earlier browser verification in STATUS.md refers to the previous UI.

Existing product and production gaps in STATUS.md still apply, except that separate loan usage/repayment tabs are now implemented. No new backend capabilities were added.
