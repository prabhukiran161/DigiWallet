import type { Wallet } from "./types";
import { categoryIcons, defaultCategoryIds } from "../category-options";

export function emptyWallet(): Wallet {
  return {
    accounts: [],
    events: [],
    allocations: [],
    categories: ["Food", "Transport", "Shopping", "Bills", "Other"].map(
      (name) => ({ id: name.toLowerCase(), name, archived: false }),
    ),
    budgets: {},
    timezone: "Asia/Kolkata",
  };
}

export function upgradeWallet(input: Wallet): Wallet {
  const w = structuredClone(input);
  w.schemaVersion = 2;
  w.deletedAccounts ??= [];
  w.managementHistory ??= [];
  for (const c of w.categories) {
    c.icon ??= categoryIcons.includes(c.id as never) ? c.id : "other";
    c.system ??= defaultCategoryIds.includes(c.id);
  }
  for (const e of w.events) {
    e.revision ??= 0;
    e.revisions ??= [];
  }
  return w;
}

export function management(
  w: Wallet,
  action: string,
  id: string,
  before: unknown,
) {
  (w.managementHistory ??= []).push({
    action,
    id,
    at: new Date().toISOString(),
    before: structuredClone(before),
  });
}

