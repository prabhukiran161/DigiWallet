"use client";
import { useState } from "react";
import { Search, SlidersHorizontal, ArrowRight, X, Download, CalendarDays, Layers, LayoutGrid } from "lucide-react";
import { localDate, money, type Wallet, type Journal } from "@/lib/ledger";
import { accountSpending, monthRange } from "@/lib/account-spending";
import { currency, labels } from "@/lib/display";
import { Empty } from "../primitives";
import { ReportingMonthPicker } from "../layout/reporting-month-picker";
import { TransactionRow } from "./transaction-row";
import { amountLabel, dayLabel, transactionAccount } from "./utils";
import { TransactionSearchSheet } from "./transaction-search-sheet";
import { TransactionFilterSheet, type TransactionFilters } from "./transaction-filter-sheet";
import styles from "./activity-transactions.module.css";

type HistoryProps = {
  wallet: Wallet;
  month: string;
  day?: string;
  account?: string;
  compact?: boolean;
  activity?: boolean;
  hidden?: boolean;
  onSeeAll?: () => void;
  onClearDay?: () => void;
  onSetMonth?: (month: string) => void;
  mode?: "all" | "usage" | "repayments";
};

export function History({
  wallet,
  month,
  day = "",
  account = "",
  compact = false,
  activity = false,
  hidden = false,
  onSeeAll,
  onClearDay,
  onSetMonth,
  mode = "all",
}: HistoryProps) {
  const [query, setQuery] = useState("");
  const [accounts, setAccounts] = useState<string[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [eventTypes, setEventTypes] = useState<string[]>([]);
  const [showFilters, setShowFilters] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [ranges, setRanges] = useState({ from: "", to: "", min: "", max: "", transfers: true });

  const selectedAccounts = account ? [account] : accounts;
  const selected = selectedAccounts.length === 1 ? selectedAccounts[0] : "";
  const hasDateRange = Boolean(ranges.from || ranges.to);
  const hasAmountRange = Boolean(ranges.min || ranges.max);
  const filterCount = [accounts.length, categories.length, eventTypes.length, hasDateRange, hasAmountRange, !ranges.transfers].filter(Boolean).length;
  const min = ranges.min ? money(ranges.min) : 0;
  const max = ranges.max ? money(ranges.max) : Infinity;
  const showAccountMonth = Boolean(account && onSetMonth);
  const monthlySpending = showAccountMonth && !hidden
    ? accountSpending(wallet, monthRange(month)).find(({ id }) => id === account)?.spent ?? 0
    : 0;

  function applyFilters(next: TransactionFilters) {
    const { account: accountIds, category: categoryIds, type, ...datesAndAmounts } = next;
    setAccounts(accountIds);
    setCategories(categoryIds);
    setEventTypes(type);
    setRanges(datesAndAmounts);
    onClearDay?.();
    setShowFilters(false);
  }

  const events = wallet.events
    .filter((e) => {
      const d = localDate(e.date, wallet.timezone);
      const amount = hasAmountRange ? Math.round(Number(amountLabel(e, selected).replace(/[^\d.]/g, "")) * 100) : 0;
      return (
        (!showAccountMonth || d.startsWith(month)) &&
        (hasDateRange
          ? (!ranges.from || d >= ranges.from) && (!ranges.to || d <= ranges.to)
          : d.startsWith(month)) &&
        (!day || d === day) &&
        (!hasAmountRange || (amount >= min && amount <= max)) &&
        (ranges.transfers || e.type !== "transfer") &&
        (!selectedAccounts.length || selectedAccounts.some((id) =>
          e.id === `opening-${id}` ||
          e.lines.some((l) => l.account === id) ||
          e.command?.target === id ||
          e.command?.loanFunding === id ||
          wallet.allocations.some(
            (f) => f.loan === id && f.id === e.command?.allocation,
          ))) &&
        (!categories.length || categories.some((id) => e.category === id)) &&
        (!eventTypes.length || eventTypes.includes(e.type)) &&
        (mode === "all" ||
          (mode === "repayments" && ["repay", "receive"].includes(e.type)) ||
          (mode === "usage" &&
            ["expense", "invest", "lend", "cardPayment"].includes(e.type))) &&
        `${e.description} ${e.notes} ${e.command?.counterparty || ""} ${e.command?.purpose || ""}`
          .toLowerCase()
          .includes(query.toLowerCase())
      );
    })
    .reverse();

  function renderGroups(results: Journal[]) {
    const groups = (compact ? results.slice(0, 4) : results).reduce<Record<string, Journal[]>>((groups, event) => {
      const date = localDate(event.date, wallet.timezone);
      (groups[date] ??= []).push(event);
      return groups;
    }, {});

    return Object.entries(groups).map(([date, group]) => (
          <div key={date} className="history-group">
            {!compact && <h3 className={activity ? styles.date : "date-heading"}>
              {dayLabel(date)}{activity && `, ${new Date(`${date}T12:00:00Z`).toLocaleDateString("en-IN", { weekday: "short", timeZone: "UTC" })}`}
            </h3>}
            <div className="history-list">
              {group.map((e) => (
                <TransactionRow
                  key={e.id}
                  wallet={wallet}
                  event={e}
                  account={selected}
                  hidden={hidden}
                  compact={compact}
                  activity={activity}
                  month={month}
                />
              ))}
            </div>
          </div>
        ));
  }

  function downloadTransactions() {
    const cell = (value: string) => `"${value.replace(/^[\s]*[=+@-]/, (prefix) => "'" + prefix).replaceAll('"', '""')}"`;
    const rows = events.map((event) => [
      localDate(event.date, wallet.timezone),
      event.description,
      wallet.categories.find((item) => item.id === event.category)?.name ?? labels[event.type],
      transactionAccount(wallet, event)?.name ?? "",
      amountLabel(event, selected).replace(/[₹,]/g, "").replace("−", "-").replace(/^\+/, ""),
    ]);
    const csv = ["Date,Description,Category,Account,Amount (INR)", ...rows.map((row) =>
      row.map((value, index) => index === 4 ? value : cell(value)).join(","),
    )].join("\r\n");
    const url = URL.createObjectURL(new Blob(["\ufeff", csv], { type: "text/csv;charset=utf-8" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = `digiwallet-transactions-${month}.csv`;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  return (
    <section className={activity ? styles.activity : "activity-section"}>
      <div className={activity ? `${styles.toolbar}${showAccountMonth ? ` ${styles.accountToolbar}` : ""}` : "section-head"}>
        <h2>
          {compact ? "Recent activity" : !activity && day ? dayLabel(day) : "Transactions"}
        </h2>
        {activity ? (
          <div className={styles.actions}>
            <button type="button" className="icon-button" aria-label="Search transactions" aria-haspopup="dialog" aria-expanded={showSearch}
              onClick={() => setShowSearch(true)}>
              <Search size={19} />
            </button>
            <button type="button" className="icon-button" aria-label="Transaction filters" aria-haspopup="dialog" aria-expanded={showFilters}
              onClick={() => setShowFilters(!showFilters)}>
              <SlidersHorizontal size={19} />
              {(filterCount > 0 || day) && <span className={styles.filterDot} aria-label="Filters applied" />}
            </button>
            <button type="button" className="icon-button" aria-label="Download displayed transactions" disabled={hidden || !events.length}
              onClick={downloadTransactions}><Download size={19} /></button>
          </div>
        ) : onSeeAll ? (
          <button className="text-button" onClick={onSeeAll}>
            See all
            <ArrowRight size={14} />
          </button>
        ) : (
          <span className="count">{events.length}</span>
        )}
      </div>

      {showAccountMonth && onSetMonth && (
        <ReportingMonthPicker month={month} onSetMonth={(nextMonth) => {
          if (nextMonth === month) return;
          setRanges((current) => ({ ...current, from: "", to: "" }));
          onSetMonth(nextMonth);
        }} summary={
          <div className={styles.monthSpending}>
            <span>Total Spent</span>
            <strong>{hidden ? "••••" : currency(monthlySpending)}</strong>
          </div>
        } />
      )}

      {!compact && (
        <>
          {!activity && <div className="search-row">
            <label className="search">
              <Search size={18} />
              <input
                aria-label="Search transactions"
                placeholder="Search activity"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </label>
            {!activity && <button
              className="icon-button"
              aria-label="Transaction filters"
              aria-expanded={showFilters}
              onClick={() => setShowFilters(!showFilters)}
            >
              <SlidersHorizontal size={19} />
            </button>}
          </div>}

          {!activity && showFilters && (
            <div className="filter-panel">
              {!account && (
                <label className="field">
                  <span>Account</span>
                  <select
                    value={accounts[0] ?? ""}
                    onChange={(e) => setAccounts(e.target.value ? [e.target.value] : [])}
                  >
                    <option value="">All accounts</option>
                    {wallet.accounts
                      .filter((a) => !a.closedAt)
                      .map((a) => (
                        <option key={a.id} value={a.id}>
                          {a.name}
                        </option>
                      ))}
                  </select>
                </label>
              )}
              <label className="field">
                <span>Category</span>
                <select
                  value={categories[0] ?? ""}
                  onChange={(e) => setCategories(e.target.value ? [e.target.value] : [])}
                >
                  <option value="">All categories</option>
                  {wallet.categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="field">
                <span>Type</span>
                <select
                  value={eventTypes[0] ?? ""}
                  onChange={(e) => setEventTypes(e.target.value ? [e.target.value] : [])}
                >
                  <option value="">All types</option>
                  {Object.entries(labels)
                    .filter(([key]) => wallet.events.some((e) => e.type === key))
                    .map(([key, label]) => (
                      <option key={key} value={key}>
                        {label}
                      </option>
                    ))}
                </select>
              </label>
              <button
                className="text-button"
                onClick={() => {
                  setAccounts([]);
                  setCategories([]);
                  setEventTypes([]);
                }}
              >
                Clear filters
              </button>
            </div>
          )}

          {activity ? (
            (day || filterCount > 0) && <div className={styles.chips}>
              {day && <button type="button" onClick={onClearDay} aria-label="Clear date filter"><CalendarDays size={15} /> {dayLabel(day)} <X size={13} /></button>}
              {hasDateRange && <button type="button" onClick={() => setRanges({ ...ranges, from: "", to: "" })} aria-label="Clear date range">
                <CalendarDays size={15} /> {ranges.from && ranges.to ? `${dayLabel(ranges.from)} – ${dayLabel(ranges.to)}` : ranges.from ? `From ${dayLabel(ranges.from)}` : `Through ${dayLabel(ranges.to)}`} <X size={13} />
              </button>}
              {accounts.length > 0 && <button type="button" onClick={() => setAccounts([])} aria-label="Clear account filter"><Layers size={15} /> {accounts.length === 1 ? `Account: ${wallet.accounts.find((a) => a.id === accounts[0])?.name ?? accounts[0]}` : `${accounts.length} Accounts`} <X size={13} /></button>}
              {categories.length > 0 && <button type="button" onClick={() => setCategories([])} aria-label="Clear category filter"><LayoutGrid size={15} /> {categories.length === 1 ? `Category: ${wallet.categories.find((c) => c.id === categories[0])?.name ?? categories[0]}` : `${categories.length} Categories`} <X size={13} /></button>}
              {eventTypes.length > 0 && <button type="button" onClick={() => setEventTypes([])} aria-label="Clear type filter">{eventTypes.length === 1 ? `Type: ${labels[eventTypes[0]]}` : `${eventTypes.length} Types`} <X size={13} /></button>}
              {hasAmountRange && <button type="button" onClick={() => setRanges({ ...ranges, min: "", max: "" })} aria-label="Clear amount range">Amount Range <X size={13} /></button>}
              {!ranges.transfers && <button type="button" onClick={() => setRanges({ ...ranges, transfers: true })} aria-label="Include transfers">No Transfers <X size={13} /></button>}
            </div>
          ) : day && onClearDay && (
            <button className="day-chip" onClick={onClearDay}>
              {dayLabel(day)}
              <X size={14} />
            </button>
          )}
        </>
      )}

      {activity && showSearch && <TransactionSearchSheet wallet={wallet} events={events}
        account={selected} renderResults={renderGroups} onClose={() => setShowSearch(false)} />}
      {activity && showFilters && <TransactionFilterSheet wallet={wallet}
        fixedAccount={account}
        initial={{ ...ranges, account: accounts, category: categories, type: eventTypes,
          from: day || ranges.from, to: day || ranges.to }}
        onApply={applyFilters} onClose={() => setShowFilters(false)} />}

      {!events.length ? (
        <Empty title="Nothing here yet">
          <p>
            {query || day || filterCount
              ? "Try another day or filter."
              : "Your recorded activity will appear here."}
          </p>
        </Empty>
      ) : (
        renderGroups(events)
      )}
    </section>
  );
}

