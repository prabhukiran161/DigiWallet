import type { Wallet } from "./types";
import { check, money } from "./money";
import { upgradeWallet } from "./wallet";

export function saveBudget(
  source: Wallet,
  input: {
    month: string;
    total: string;
    categories: Record<string, string>;
  },
): Wallet {
  const w = upgradeWallet(source),
    previous = w.budgets[input.month];

  const categories = Object.fromEntries(
    Object.entries(input.categories).map(([id, value]) => {
      const c = w.categories.find((c) => c.id === id);
      check(c, "Unknown category.");
      const n = money(value);
      check(
        !c.archived || n <= (previous?.categories[id] || 0),
        "Archived categories cannot receive new or increased allocations.",
      );
      return [id, n];
    }),
  );

  const total = money(input.total);
  check(
    Object.values(categories).reduce((s, n) => s + n, 0) === total,
    "Category allocations must equal the overall budget.",
  );

  // An archived allocation must be explicitly retained or redistributed, never silently dropped.
  for (const c of w.categories.filter(
    (c) => c.archived && (previous?.categories[c.id] || 0) > 0,
  )) {
    check(
      Object.hasOwn(categories, c.id),
      "Explicitly redistribute the archived category allocation.",
    );
  }

  w.budgets[input.month] = { total, categories };
  return w;
}

