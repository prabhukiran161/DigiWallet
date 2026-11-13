"use client";
import { useState } from "react";
import { Search, SlidersHorizontal, ArrowRight, X } from "lucide-react";
import { localDate, type Wallet, type Journal } from "@/lib/ledger";
import { labels } from "@/lib/display";
import { Empty } from "../primitives";
import { TransactionRow } from "./transaction-row";
import { dayLabel } from "./utils";

type HistoryProps = {
  wallet: Wallet;
  month: string;
  day?: string;
  account?: string;
  compact?: boolean;
  hidden?: boolean;
  onSeeAll?: () => void;
  onClearDay?: () => void;
  mode?: "all" | "usage" | "repayments";
};

export function History({
  wallet,
  month,
  day = "",
  account = "",
  compact = false,
  hidden = false,
  onSeeAll,
  onClearDay,
  mode = "all",
}: HistoryProps) {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("");
  const [category, setCategory] = useState("");
  const [eventType, setEventType] = useState("");
  const [showFilters, setShowFilters] = useState(false);

  const selected = account || filter;
  const filterCount = [filter, category, eventType].filter(Boolean).length;

  const events = wallet.events
    .filter((e) => {
      const d = localDate(e.date, wallet.timezone);
      return (
        d.startsWith(month) &&
        (!day || d === day) &&
        (!selected ||
          e.id === `opening-${selected}` ||
          e.lines.some((l) => l.account === selected) ||
          e.command?.target === selected ||
          e.command?.loanFunding === selected ||
          wallet.allocations.some(
            (f) => f.loan === selected && f.id === e.command?.allocation,
          )) &&
        (!category || e.category === category) &&
        (!eventType || e.type === eventType) &&
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

  const groups = (compact ? events.slice(0, 4) : events).reduce<
    Record<string, Journal[]>
  >((groups, e) => {
    const d = localDate(e.date, wallet.timezone);
    (groups[d] ??= []).push(e);
    return groups;
  }, {});

  return (
    <section className="activity-section">
      <div className="section-head">
        <h2>
          {compact ? "Recent activity" : day ? dayLabel(day) : "Transactions"}
        </h2>
        {onSeeAll ? (
          <button className="text-button" onClick={onSeeAll}>
            See all
            <ArrowRight size={14} />
          </button>
        ) : (
          <span className="count">{events.length}</span>
        )}
      </div>

      {!compact && (
        <>
          <div className="search-row">
            <label className="search">
              <Search size={18} />
              <input
                aria-label="Search transactions"
                placeholder="Search activity"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </label>
            <button
              className="icon-button"
              aria-label="Transaction filters"
              aria-expanded={showFilters}
              onClick={() => setShowFilters(!showFilters)}
            >
              <SlidersHorizontal size={19} />
            </button>
          </div>

          {showFilters && (
            <div className="filter-panel">
              {!account && (
                <label className="field">
                  <span>Account</span>
                  <select
                    value={filter}
                    onChange={(e) => setFilter(e.target.value)}
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
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
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
                  value={eventType}
                  onChange={(e) => setEventType(e.target.value)}
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
                  setFilter("");
                  setCategory("");
                  setEventType("");
                }}
              >
                Clear filters
              </button>
            </div>
          )}

          {day && onClearDay && (
            <button className="day-chip" onClick={onClearDay}>
              {dayLabel(day)}
              <X size={14} />
            </button>
          )}
        </>
      )}

      {!events.length ? (
        <Empty title="Nothing here yet">
          <p>
            {query || day || filterCount
              ? "Try another day or filter."
              : "Your recorded activity will appear here."}
          </p>
        </Empty>
      ) : (
        Object.entries(groups).map(([date, group]) => (
          <div key={date} className="history-group">
            {!compact && <h3 className="date-heading">{dayLabel(date)}</h3>}
            <div className="history-list">
              {group.map((e) => (
                <TransactionRow
                  key={e.id}
                  wallet={wallet}
                  event={e}
                  account={selected}
                  hidden={hidden}
                  compact={compact}
                  month={month}
                />
              ))}
            </div>
          </div>
        ))
      )}
    </section>
  );
}

