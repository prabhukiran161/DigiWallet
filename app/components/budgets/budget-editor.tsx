"use client";

import { useEffect, useState, type FormEvent } from "react";
import {
  Check,
  CircleAlert,
  LoaderCircle,
  Lock,
  LockOpen,
  WandSparkles,
  X,
} from "lucide-react";
import balanceStyles from "@/app/views/balance-card.module.css";
import { currency, decimal } from "@/lib/display";
import { categoryBadgeStyle } from "@/lib/category-colors";
import { money, type Wallet } from "@/lib/ledger";
import { AmountInput } from "../amount-input";
import { CategoryIcon } from "../category-icon";
import { Field, Modal, type Save } from "../primitives";
import styles from "./budget-editor.module.css";

export function BudgetEditor({
  wallet,
  month,
  save,
  onClose,
}: {
  wallet: Wallet;
  month: string;
  save: Save;
  onClose: () => void;
}) {
  const budget = wallet.budgets[month];
  const [year, monthNumber] = month.split("-").map(Number);
  const monthName = new Intl.DateTimeFormat("en-IN", {
    month: "long",
    timeZone: "UTC",
  }).format(new Date(Date.UTC(year, monthNumber - 1, 1)));
  const previousMonth = new Date(Date.UTC(year, monthNumber - 2, 1))
    .toISOString()
    .slice(0, 7);
  const previous = wallet.budgets[previousMonth];
  const categories = wallet.categories.filter(
    (c) => !c.archived || Boolean(budget?.categories[c.id]),
  );
  const active = categories.filter((c) => !c.archived);
  const [values, setValues] = useState<Record<string, string>>(() =>
    Object.fromEntries(
      categories.map(({ id }) => [
        id,
        budget?.categories[id] ? decimal(budget.categories[id]) : "",
      ]),
    ),
  );
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState<{ message: string; error: boolean } | null>(null);
  const [locked, setLocked] = useState(true);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 4500);
    return () => clearTimeout(timer);
  }, [toast]);

  function notify(message: string, error = false) {
    setToast({ message, error });
  }

  function paise(value = "") {
    try {
      return money(value || "0");
    } catch {
      return null;
    }
  }

  const allocated = categories.reduce(
    (sum, c) => sum + (paise(values[c.id]) ?? 0),
    0,
  );
  const total = paise(decimal(allocated));

  function autoAllocate() {
    if (locked || busy) return;
    if (!previous) {
      notify("No previous budget found.");
      return;
    }

    const next = { ...values };
    for (const { id } of active) {
      const amount = previous.categories[id] ?? 0;
      if (!Number.isSafeInteger(amount) || amount < 0 || paise(decimal(amount)) === null) {
        notify("Couldn't copy previous budget. Try again.", true);
        return;
      }
      next[id] = amount ? decimal(amount) : "";
    }
    setValues(next);
    const copiedMonth = new Intl.DateTimeFormat("en-IN", {
      month: "long", timeZone: "UTC",
    }).format(new Date(Date.UTC(year, monthNumber - 2, 1)));
    notify(`${copiedMonth}'s budget copied successfully.`);
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    if (total === null || categories.some((c) =>
      paise(values[c.id]) === null ||
      (c.archived && (paise(values[c.id]) ?? 0) > (budget?.categories[c.id] ?? 0))
    )) {
      notify("Please enter a valid budget amount.", true);
      return;
    }
    if (!total) {
      notify("Add an allocation before saving.", true);
      return;
    }
    if (budget && total === budget.total && categories.every(({ id }) =>
      paise(values[id]) === (budget.categories[id] ?? 0)
    )) {
      notify("Budget is already up to date.");
      return;
    }
    setBusy(true);
    try {
      await save("budget", {
        month,
        total: decimal(total),
        categories: Object.fromEntries(
          categories.map(({ id }) => [id, values[id] || "0"]),
        ),
      });
      onClose();
    } catch (err) {
      notify(
        err instanceof TypeError ? "Connection lost. Check your internet."
          : "Couldn't save budget. Try again.",
        true,
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal
      title={budget ? "Edit budget" : "Set a budget"}
      onClose={onClose}
      className={styles.screen}
      pageHeader
    >
      <form onSubmit={submit}>
        <div
          className={`${styles.hero} relative isolate overflow-hidden text-white`}
        >
          <div
            aria-hidden="true"
            className={`${balanceStyles.waves} ${styles.wave} pointer-events-none absolute inset-0 -z-10`}
          />
          <div className="field">
            <span className="field-label">{monthName} Budget</span>
            <span className="block break-words">{currency(allocated)}</span>
          </div>
          <button
            type="button"
            aria-label={
              locked
                ? "Unlock category allocations"
                : "Lock category allocations"
            }
            className={`${styles.edit} absolute top-4 right-4 grid size-9 place-items-center rounded-full`}
            onClick={() => setLocked((current) => !current)}
          >
            {locked ? (
              <Lock size={17} aria-hidden />
            ) : (
              <LockOpen size={17} aria-hidden />
            )}
          </button>
        </div>
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h3 className={styles.heading}>Allocate to categories</h3>
          <button
            type="button"
            className={`text-button ${styles.allocate}`}
            disabled={busy || locked || !active.length}
            onClick={autoAllocate}
          >
            <WandSparkles size={17} /> Auto allocate
          </button>
        </div>
        {categories.map((c) => {
          const value = paise(values[c.id]) ?? 0;
          const percent = total ? Math.round((value / total) * 100) : 0;
          return (
            <div
              className={`${styles.row} grid grid-cols-[auto_minmax(0,1fr)_auto] items-center`}
              key={c.id}
            >
              <span
                className={styles.categoryIcon}
                data-category={c.name.trim().toLowerCase()}
                style={categoryBadgeStyle(c.color)}
              >
                <CategoryIcon category={c.id} wallet={wallet} size={20} />
              </span>
              <Field label={`${c.name}${c.archived ? " (archived)" : ""} (₹)`}>
                <AmountInput
                  aria-invalid={
                    paise(values[c.id]) === null ||
                    (c.archived && value > (budget?.categories[c.id] || 0))
                  }
                  disabled={locked || busy}
                  onFocus={(event) => { if (!locked) event.currentTarget.select(); }}
                  value={values[c.id] || ""}
                  onValueChange={(amount) => {
                    setValues((current) => ({ ...current, [c.id]: amount }));
                    setToast(null);
                  }}
                />
              </Field>
              <span
                aria-label={`${c.name}: ${percent}% of the monthly budget`}
                className={styles.badge}
              >
                {percent}%
              </span>
            </div>
          );
        })}
        <div className={styles.footer}>
          {toast && (
            <div className={styles.toast}>
              {toast.error ? <CircleAlert size={18} aria-hidden /> : <Check size={18} aria-hidden />}
              <span role={toast.error ? "alert" : "status"}>{toast.message}</span>
              <button type="button" aria-label="Dismiss notification" onClick={() => setToast(null)}>
                <X size={16} aria-hidden />
              </button>
            </div>
          )}
          <button className={styles.save} disabled={busy}>
            {busy ? "Saving…" : "Save budget"}
            {busy ? (
              <LoaderCircle
                size={22}
                className="motion-safe:animate-spin"
                aria-hidden
              />
            ) : (
              <Check size={22} aria-hidden />
            )}
          </button>
        </div>
      </form>
    </Modal>
  );
}
