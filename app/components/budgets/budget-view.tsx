"use client";
import { useState } from "react";
import { AccountSpendingCard } from "./account-spending-card";
import { MonthlyBudgetCard } from "./monthly-budget-card";
import { CategorySpendingChart } from "./category-spending-chart";
import { localDate, type Wallet } from "@/lib/ledger";
import { currency } from "@/lib/display";
import type { Save } from "../primitives";
import { BudgetEditor } from "./budget-editor";
import { UnbudgetedSpendingCard } from "./unbudgeted-spending-card";

interface BudgetViewProps {
  wallet: Wallet;
  month: string;
  save: Save;
}

export function BudgetView({ wallet, month, save }: BudgetViewProps) {
  const [editing, setEditing] = useState(false);
  const budget = wallet.budgets[month];
  const expenses = wallet.events.filter((e) =>
    localDate(e.date, wallet.timezone).startsWith(month),
  );
  const actual = expenses.reduce((s, e) => s + e.expense, 0);
  const spendByCategory = new Map<string, number>();
  for (const event of expenses) {
    if (!event.expense) continue;
    spendByCategory.set(event.category, (spendByCategory.get(event.category) ?? 0) + event.expense);
  }
  const unbudgeted = [...spendByCategory].filter(([id, spent]) => spent > 0 && !budget?.categories[id]);

  const allocatedCategories = wallet.categories
    .filter((c) => (budget?.categories[c.id] ?? 0) > 0)
    .sort((a, b) => {
      const overage = (id: string) => Math.max(0, (spendByCategory.get(id) ?? 0) - (budget?.categories[id] ?? 0));
      return overage(b.id) - overage(a.id);
    });
  return (
    <section className="budget-section">
      <MonthlyBudgetCard month={month} budget={budget} spent={actual}
        save={save} onEdit={() => setEditing(true)} />

      {allocatedCategories.length > 0 && (
        <CategorySpendingChart categories={allocatedCategories.map((category) => ({
          id: category.id,
          name: category.name,
          color: category.color,
          spent: spendByCategory.get(category.id) ?? 0,
          allocated: budget?.categories[category.id] ?? 0,
        }))} />
      )}
      {unbudgeted.length > 0 && (
        <UnbudgetedSpendingCard wallet={wallet} spending={unbudgeted} />
      )}

      <AccountSpendingCard wallet={wallet} month={month} />

      {editing && <BudgetEditor wallet={wallet} month={month} save={save}
        onClose={() => setEditing(false)} />}
    </section>
  );
}

