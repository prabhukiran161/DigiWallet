"use client";

import { useId, useRef, useState } from "react";
import { Pencil, Plus, RotateCcw, Target, Wallet, X } from "lucide-react";
import { currency } from "@/lib/display";
import type { Wallet as WalletData } from "@/lib/ledger";
import type { Save } from "../primitives";
import styles from "./monthly-budget-card.module.css";

export function MonthlyBudgetCard({ month, budget, spent, save, onEdit }: {
  month: string;
  budget?: WalletData["budgets"][string];
  spent: number;
  save: Save;
  onEdit: () => void;
}) {
  const confirmation = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const descriptionId = useId();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  if (!budget?.total) {
    return (
      <section className={styles.empty} aria-label="Monthly Budget">
        <svg className={styles.emptyIcon} width="112" height="50" viewBox="0 0 200 90"
          fill="none" stroke="currentColor" strokeWidth="3.8" strokeLinecap="round"
          strokeLinejoin="round" aria-hidden="true">
          <path d="M66 25 121 8a7 7 0 0 1 9 5l4 13" />
          <path d="m93 25 37-10" />
          <rect x="63" y="25" width="76" height="53" rx="8" />
          <rect x="117" y="43" width="27" height="16" rx="6" fill="#f4f7ff" />
          <circle cx="126" cy="51" r="2.7" fill="currentColor" stroke="none" />
          <path d="m21 26-9-6m6 19H5m16 13-9 7m167-33 9-6m-6 19h13m-16 13 9 7" />
        </svg>
        <h2>No Budget Yet</h2>
        <p>Set your monthly budget to start tracking your spending.</p>
        <button type="button" className={styles.primary} onClick={onEdit}>
          <Plus size={20} /> Set Budget
        </button>
      </section>
    );
  }

  const remaining = budget.total - spent;
  const percent = Math.round(Math.max(0, spent / budget.total) * 100);

  async function reset() {
    if (!budget || busy) return;
    setBusy(true);
    setError("");
    try {
      await save("budget", {
        month,
        total: "0",
        categories: Object.fromEntries(Object.keys(budget.categories).map((id) => [id, "0"])),
      });
      confirmation.current?.close();
    } catch {
      setError("Couldn't reset the budget. Try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className={styles.card} aria-label="Monthly Budget">
      <div className={styles.main}>
        <div className={styles.header}>
          <h2>Monthly Budget</h2>
          <div className={styles.actions}>
            <button type="button" className={styles.secondary} disabled={busy}
              onClick={() => { setError(""); confirmation.current?.showModal(); }} aria-haspopup="dialog">
              <RotateCcw size={16} /> Reset
            </button>
            <button type="button" className={styles.primary} disabled={busy} onClick={onEdit}>
              <Pencil size={16} /> Edit
            </button>
          </div>
        </div>
        <div className={styles.overview}>
          <div className={styles.ring}>
            <svg viewBox="0 0 120 120" aria-hidden="true">
              <circle className={styles.track} cx="60" cy="60" r="53" />
              <circle className={styles.progress} cx="60" cy="60" r="53" pathLength="100"
                strokeDasharray={`${Math.min(100, percent)} 100`}
                visibility={percent === 0 ? "hidden" : undefined} />
            </svg>
            <div><strong>{percent}%</strong><span>Spent</span></div>
          </div>
          <div className={styles.remaining}>
            <span>{remaining < 0 ? "Over budget" : "Left to spend"}</span>
            <strong>{currency(Math.abs(remaining))}</strong>
            <span>of {currency(budget.total)}</span>
          </div>
        </div>
      </div>
      <div className={styles.metrics}>
        <div><Wallet size={24} aria-hidden /><span>Spent<strong>{currency(spent)}</strong></span></div>
        <div><Target size={24} aria-hidden /><span>Budget<strong>{currency(budget.total)}</strong></span></div>
      </div>
      <dialog ref={confirmation} className={styles.confirm} aria-labelledby={titleId}
        aria-describedby={descriptionId} onCancel={(event) => event.preventDefault()}>
        <div className={styles.confirmArt} aria-hidden="true">
          <span className={styles.waveFeather} />
          <svg className={styles.walletArt} viewBox="0 0 200 112" fill="none"
            stroke="currentColor" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M53 31 123 8a9 9 0 0 1 11 6l5 18" fill="#bfdcff" />
            <rect x="45" y="30" width="108" height="81" rx="13" fill="#b5d5ff" />
            <rect x="116" y="56" width="44" height="30" rx="10" fill="#f8fbff" />
            <circle cx="129" cy="71" r="4.3" fill="currentColor" stroke="none" />
            <path d="M74 65a16 16 0 1 1-2 8m1-15v8l8-2M22 56l-11-7m10 19H1m21 12-11 7m166-31 11-7m-10 19h21m-22 12 11 7" />
          </svg>
        </div>
        <button type="button" className={styles.close} aria-label="Close Reset Budget confirmation"
          disabled={busy} onClick={() => confirmation.current?.close()}>
          <X size={22} />
        </button>
        <div className={styles.confirmBody}>
          <h2 id={titleId}>Reset Budget?</h2>
          <p id={descriptionId}>Reset this month’s budget and its category allocations?</p>
          {error && <p role="alert">{error}</p>}
          <div className={styles.confirmActions}>
            <button type="button" className={styles.secondary} autoFocus disabled={busy}
              onClick={() => confirmation.current?.close()}>Cancel</button>
            <button type="button" className={styles.primary} disabled={busy}
              onClick={() => void reset()}>{busy ? "Resetting…" : "Reset"}</button>
          </div>
        </div>
      </dialog>
    </section>
  );
}
