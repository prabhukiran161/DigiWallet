"use client";

import { useId, useRef, useState, type FormEvent } from "react";
import { CalendarDays, CalendarRange, ChartNoAxesColumn, Layers, Wallet as WalletIcon, X } from "lucide-react";
import { accountSpending, monthRange, type SpendingRange } from "@/lib/account-spending";
import { currency } from "@/lib/display";
import { findInstitution } from "@/lib/institutions";
import { localDate, type Wallet } from "@/lib/ledger";
import { ACCOUNT_ICONS } from "../accounts/types";
import { InstitutionMark, useInstitutionCatalog } from "../institution-brand";
import { DatePicker } from "../layout/date-picker";
import surface from "./monthly-budget-card.module.css";
import styles from "./account-spending-card.module.css";

const periods = [
  { id: "weekly", label: "Weekly", Icon: CalendarDays },
  { id: "monthly", label: "Monthly", Icon: CalendarDays },
  { id: "yearly", label: "Yearly", Icon: ChartNoAxesColumn },
  { id: "custom", label: "Custom Range", Icon: CalendarRange },
] as const;
type Period = (typeof periods)[number]["id"];

function getRange(period: Period, month: string, today: string): SpendingRange {
  const range = monthRange(month);
  if (period === "yearly") return { from: `${month.slice(0, 4)}-01-01`, to: `${month.slice(0, 4)}-12-31` };
  if (period !== "weekly") return range;
  const to = today.startsWith(month) ? today : range.to;
  const start = new Date(`${to}T00:00:00Z`);
  start.setUTCDate(start.getUTCDate() - 6);
  return { from: start.toISOString().slice(0, 10), to };
}

export function AccountSpendingCard({ wallet, month }: { wallet: Wallet; month: string }) {
  const [period, setPeriod] = useState<Period>("monthly");
  const [custom, setCustom] = useState<SpendingRange & { rows: ReturnType<typeof accountSpending> }>();
  const [draft, setDraft] = useState(() => monthRange(month));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [pressedAccount, setPressedAccount] = useState<string>();
  const dialog = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const catalog = useInstitutionCatalog();
  const today = localDate(new Date().toISOString(), wallet.timezone);
  const range = getRange(period, month, today);
  const rows = period === "custom" && custom ? custom.rows : accountSpending(wallet, range);
  const largest = rows.reduce((max, row) => Math.max(max, Math.abs(row.spent)), 0);
  const order = 10 ** Math.floor(Math.log10(Math.max(100, largest / 5)));
  const step = ([1, 2, 2.5, 5, 10].find((size) => size * order * 5 >= largest) ?? 10) * order;
  const ceiling = step * 5;
  const total = rows.reduce((sum, row) => sum + row.spent, 0);
  const rangeFormatter = new Intl.DateTimeFormat("en-IN", {
    day: "numeric", month: "short", year: "numeric", timeZone: "UTC",
  });
  const displayedRange = period === "custom" && custom ? custom : range;
  const timeline = period === "yearly" ? month.slice(0, 4) : period === "monthly"
    ? new Intl.DateTimeFormat("en-IN", { month: "short", year: "numeric", timeZone: "UTC" })
      .format(new Date(`${range.from}T00:00:00Z`))
    : rangeFormatter.formatRange(
      new Date(`${displayedRange.from}T00:00:00Z`),
      new Date(`${displayedRange.to}T00:00:00Z`),
    );

  async function applyRange(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    setError("");
    if (!draft.from || !draft.to || draft.from > draft.to) {
      setError("Choose a valid start and end date.");
      return;
    }
    setBusy(true);
    try {
      const query = new URLSearchParams({ accountSpending: "1", ...draft });
      const response = await fetch(`/api/wallet?${query}`, { cache: "no-store" });
      if (!response.ok) throw new Error("Couldn’t load spending. Please try again.");
      const data: { accounts: ReturnType<typeof accountSpending> } = await response.json();
      setCustom({ ...draft, rows: data.accounts });
      setPeriod("custom");
      dialog.current?.close();
    } catch {
      setError("Couldn’t load spending. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className={`${surface.surface} ${styles.card}`} aria-label="Account Wise Spending">
      <div className={styles.heading}>
        <h2>Account Wise Spending</h2>
        <span className={styles.timeline} title={timeline}>{timeline}</span>
      </div>
      <div className={styles.periods} role="group" aria-label="Spending period">
        {periods.map(({ id, label, Icon }) => (
          <button key={id} type="button" aria-pressed={period === id} aria-haspopup={id === "custom" ? "dialog" : undefined}
            onClick={() => {
              if (id !== "custom") { setPeriod(id); return; }
              setDraft(custom ? { from: custom.from, to: custom.to } : monthRange(month));
              setError("");
              dialog.current?.showModal();
            }}>
            <Icon size={15} aria-hidden /> {label}
          </button>
        ))}
      </div>
      {rows.length ? (
        <div className={styles.chart} aria-label="Net spending by account">
          <div className={styles.axis} aria-hidden="true">
            {Array.from({ length: 6 }, (_, index) => (
              <span key={index}>{currency((5 - index) * step).replace(/\.00$/, "")}</span>
            ))}
          </div>
          <div className={styles.plotScroll} tabIndex={rows.length > 3 ? 0 : undefined}>
            <ul className={styles.plot}>
              {rows.map((row) => {
                const institution = findInstitution(catalog, row.institution, row.type);
                const Icon = ACCOUNT_ICONS[row.type];
                const label = [row.name, institution?.name || row.institution].filter(Boolean).join(" · ");
                return (
                  <li key={row.id} className={styles.column} aria-label={`${label}: ${currency(row.spent)}`}>
                    <div className={styles.barSlot}>
                      <div className={styles.bar} data-refund={row.spent < 0}
                        style={{ height: `${Math.abs(row.spent) / ceiling * 100}%` }}>
                        <span className={styles.barLabel} data-preview={pressedAccount === row.id} aria-hidden="true">
                          <span>{currency(row.spent)}</span>
                          <span>{row.name}</span>
                        </span>
                      </div>
                    </div>
                    <button type="button" className={styles.logo} aria-label={`Hold to show ${label}`}
                      onContextMenu={(event) => event.preventDefault()}
                      onPointerDown={(event) => {
                        if (!event.isPrimary || event.button !== 0) return;
                        event.currentTarget.setPointerCapture(event.pointerId);
                        setPressedAccount(row.id);
                      }}
                      onPointerUp={() => setPressedAccount(undefined)}
                      onPointerCancel={() => setPressedAccount(undefined)}
                      onLostPointerCapture={() => setPressedAccount(undefined)}
                      onBlur={() => setPressedAccount(undefined)}
                      onKeyDown={(event) => {
                        if (event.key === " " || event.key === "Enter") setPressedAccount(row.id);
                      }}
                      onKeyUp={(event) => {
                        if (event.key === " " || event.key === "Enter") setPressedAccount(undefined);
                      }}>
                      <InstitutionMark src={institution?.logoUrl}><Icon size={23} aria-hidden /></InstitutionMark>
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        </div>
      ) : <p className={styles.empty}>No spending in this period.</p>}
      {rows.some(({ spent }) => spent < 0) && <p className={styles.range}>Green bars show net refunds.</p>}
      <div className={styles.metrics}>
        <div><span><WalletIcon size={20} aria-hidden /></span><p>Total Spending<strong>{currency(total)}</strong></p></div>
        <div><span><Layers size={20} aria-hidden /></span><p>Accounts<strong>{rows.length}</strong></p></div>
      </div>
      <dialog ref={dialog} className={styles.dialog} aria-labelledby={titleId}
        onCancel={(event) => { if (busy) event.preventDefault(); }}>
        <div className={styles.dialogHeader}>
          <h2 id={titleId}>Custom Range</h2>
          <button type="button" aria-label="Close date picker" disabled={busy} onClick={() => dialog.current?.close()}><X size={20} /></button>
        </div>
        <form onSubmit={applyRange} aria-busy={busy}>
          <DatePicker label="Start date" required value={draft.from} today={today} max={draft.to || undefined} disabled={busy}
            onChange={(from) => { setDraft((current) => ({ ...current, from })); setError(""); }} />
          <DatePicker label="End date" required value={draft.to} today={today} min={draft.from || undefined} disabled={busy}
            onChange={(to) => { setDraft((current) => ({ ...current, to })); setError(""); }} />
          {error && <p role="alert" className={styles.error}>{error}</p>}
          <button type="submit" className={styles.apply} disabled={busy}>
            {busy && <WalletIcon size={18} className={styles.loading} aria-hidden />}
            {busy ? "Loading spending…" : "Apply Range"}
          </button>
        </form>
      </dialog>
    </section>
  );
}
