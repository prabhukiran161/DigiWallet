"use client";
import { useState } from "react";
import { Pencil, Plus, Check } from "lucide-react";
import { localDate, type Wallet } from "@/lib/ledger";
import { currency, decimal } from "@/lib/display";
import { Field, Modal, InfoNote, type Save } from "../primitives";
import { CategoryIcon } from "../category-icon";
import { AmountInput } from "../amount-input";

interface BudgetViewProps {
  wallet: Wallet;
  month: string;
  save: Save;
}

export function BudgetView({ wallet, month, save }: BudgetViewProps) {
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const budget = wallet.budgets[month];
  const expenses = wallet.events.filter((e) =>
    localDate(e.date, wallet.timezone).startsWith(month),
  );
  const actual = expenses.reduce((s, e) => s + e.expense, 0);
  const remaining = (budget?.total || 0) - actual;
  const ratio = budget?.total
    ? Math.min(1, Math.max(0, actual / budget.total))
    : actual > 0
      ? 1
      : 0;

  async function handleSaveBudget(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setBusy(true);
    const fd = new FormData(e.currentTarget);
    try {
      await save("budget", {
        month,
        total: fd.get("total"),
        categories: Object.fromEntries(
          wallet.categories.map((c) => [c.id, fd.get(c.id) || "0"]),
        ),
      });
      setEditing(false);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="budget-section">
      <div className="budget-overview">
        <div className="section-head">
          <span>Monthly budget</span>
          <button
            className="icon-button"
            aria-label={budget ? "Edit budget" : "Set budget"}
            onClick={() => setEditing(true)}
          >
            <Pencil size={17} />
          </button>
        </div>

        <div className="budget-ring">
          <svg viewBox="0 0 200 200" aria-hidden="true">
            <defs>
              <linearGradient id="budget-blue">
                <stop stopColor="#619aff" />
                <stop offset="1" stopColor="#2864eb" />
              </linearGradient>
            </defs>
            <circle className="ring-track" cx="100" cy="100" r="85" />
            <circle
              className={`ring-value ${remaining < 0 ? "over" : ""}`}
              cx="100"
              cy="100"
              r="85"
              strokeDasharray={`${ratio * 534.07} 534.07`}
            />
          </svg>
          <div>
            <span>
              {budget
                ? remaining < 0
                  ? "Over budget"
                  : "Left to spend"
                : "Spent this month"}
            </span>
            <strong>
              {currency(budget ? Math.abs(remaining) : actual)}
            </strong>
            {budget ? (
              <small>of {currency(budget.total)}</small>
            ) : (
              <button className="text-button" onClick={() => setEditing(true)}>
                Set a budget
                <Plus size={13} />
              </button>
            )}
          </div>
        </div>

        <div className="metric-pair">
          <div>
            <span>Spent</span>
            <strong>{currency(actual)}</strong>
          </div>
          <div>
            <span>Budget</span>
            <strong>{budget ? currency(budget.total) : "Not set"}</strong>
          </div>
        </div>
      </div>

      <div className="section-head">
        <h2>By category</h2>
        <span className="pill">{wallet.categories.length} categories</span>
      </div>

      <div className="budget-rows">
        {wallet.categories
          .filter(
            (c) =>
              !c.archived ||
              (budget?.categories[c.id] || 0) > 0 ||
              expenses.some((e) => e.category === c.id),
          )
          .map((c) => {
            const spent = expenses
              .filter((e) => e.category === c.id)
              .reduce((s, e) => s + e.expense, 0);
            const cap = budget?.categories[c.id] || 0;

            return (
              <div className="budget-row" key={c.id}>
                <span className={`transaction-icon category-${c.id}`}>
                  <CategoryIcon category={c.id} wallet={wallet} />
                </span>
                <div className="budget-row-main">
                  <div>
                    <strong>
                      {c.name}
                      {c.archived ? " · archived" : ""}
                    </strong>
                    <span>{currency(spent)}</span>
                  </div>
                  <progress
                    className={spent > cap ? "over" : ""}
                    aria-label={`${c.name} budget used`}
                    max={Math.max(cap, spent, 1)}
                    value={Math.max(0, spent)}
                  />
                  <small>
                    {cap
                      ? spent > cap
                        ? `${currency(spent - cap)} over`
                        : `${currency(cap - spent)} left`
                      : "Unbudgeted"}
                  </small>
                </div>
              </div>
            );
          })}
      </div>

      <InfoNote label="What counts as spending?">
        Expenses, card purchases, paid interest and fees, less refunds.
        Transfers, investments, lending and principal repayments are excluded.
      </InfoNote>

      {editing && (
        <Modal
          title={budget ? "Edit budget" : "Set a budget"}
          onClose={() => setEditing(false)}
        >
          <form onSubmit={handleSaveBudget}>
            <div className="amount-entry">
              <Field label="Monthly limit (₹)">
                <AmountInput
                  name="total"
                  required
                  defaultValue={budget ? decimal(budget.total) : ""}
                />
              </Field>
            </div>

            <h3 className="form-section-title">Allocate to categories</h3>
            {wallet.categories
              .filter((c) => !c.archived || (budget?.categories[c.id] || 0) > 0)
              .map((c) => (
                <div className="budget-input-row" key={c.id}>
                  <span className={`transaction-icon category-${c.id}`}>
                    <CategoryIcon category={c.id} wallet={wallet} />
                  </span>
                  <Field label={`${c.name}${c.archived ? " (archived)" : ""} (₹)`}>
                    <AmountInput
                      name={c.id}
                      defaultValue={budget?.categories[c.id] ? decimal(budget.categories[c.id]) : ""}
                      aria-describedby={
                        c.archived ? "archived-budget-note" : undefined
                      }
                    />
                  </Field>
                </div>
              ))}

            <p id="archived-budget-note" className="muted">
              Archived allocations can be retained or reduced and explicitly
              redistributed, but cannot be increased.
            </p>
            <small className="muted">
              Allocations must match your monthly limit.
            </small>

            {error && (
              <p className="error" role="alert">
                {error}
              </p>
            )}

            <div className="form-footer">
              <button className="primary full" disabled={busy}>
                {busy ? "Saving…" : "Save budget"}
                <Check size={17} />
              </button>
            </div>
          </form>
        </Modal>
      )}
    </section>
  );
}

