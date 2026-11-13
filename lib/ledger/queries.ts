import type { Account, Wallet, Journal } from "./types";
import { check } from "./money";

export const liquid = (a: Account) => a.type === "bank" || a.type === "cash";

export const liability = (a: Account) => a.type === "loan" || a.type === "card";

export function balance(w: Wallet, id: string): number {
  const a = w.accounts.find((a) => a.id === id);
  check(a, "Account not found.");
  return (
    w.events.reduce(
      (sum, e) =>
        sum +
        e.lines
          .filter((l) => l.account === id)
          .reduce((n, l) => n + l.delta, 0),
      0,
    ) * (liability(a) ? -1 : 1) || 0
  );
}

export function localDate(date: string, timezone: string): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(date));
}

export function creditLimitAt(
  a: Account,
  date = new Date().toISOString(),
  recordedAt?: string,
): number {
  if (!a.limitHistory?.length) return a.limit;
  const changes = a.limitHistory
    .filter(
      (h) =>
        Date.parse(h.date) < Date.parse(date) ||
        (Date.parse(h.date) === Date.parse(date) &&
          (!recordedAt || Date.parse(h.recordedAt) <= Date.parse(recordedAt))),
    )
    .sort((a, b) => Date.parse(a.date) - Date.parse(b.date));
  return changes.at(-1)?.limit ?? a.limitHistory[0].limit;
}

export function availableBalance(
  w: Wallet,
  a: Account,
  date?: string,
  event?: Journal,
): number {
  const n = event ? event.balances[a.id] || 0 : balance(w, a.id);
  return a.type === "card"
    ? Math.max(0, creditLimitAt(a, date, event?.recordedAt) - n)
    : n;
}

export function summary(w: Wallet, month: string) {
  const events = w.events.filter((e) =>
    localDate(e.date, w.timezone).startsWith(month),
  );
  const available = w.accounts
    .filter(liquid)
    .reduce((s, a) => s + balance(w, a.id), 0);
  const netWorth = w.accounts.reduce(
    (s, a) => s + balance(w, a.id) * (liability(a) ? -1 : 1),
    0,
  );
  const reserved = w.allocations.reduce((s, a) => s + a.remaining, 0);
  return {
    available,
    netWorth,
    reserved,
    unallocated: available - reserved,
    income: events.reduce((s, e) => s + e.income, 0),
    expenses: events.reduce((s, e) => s + e.expense, 0),
    inflow: events.reduce((s, e) => s + e.inflow, 0),
    outflow: events.reduce((s, e) => s + e.outflow, 0),
  };
}

export function accountHasActivity(w: Wallet, id: string): boolean {
  return w.events.some(
    (e) =>
      e.type !== "opening" &&
      (e.lines.some((l) => l.account === id) ||
        e.command?.account === id ||
        e.command?.target === id ||
        e.command?.loanFunding === id ||
        w.allocations.some(
          (f) => f.loan === id && f.id === e.command?.allocation,
        ) ||
        e.revisions?.some(
          (r) =>
            r.command.account === id ||
            r.command.target === id ||
            r.command.loanFunding === id,
        )),
  );
}

export function categoryUsed(w: Wallet, id: string): boolean {
  return w.events.some(
    (e) => e.category === id || e.revisions?.some((r) => r.command.category === id),
  );
}

export function withinEditWindow(
  recordedAt: string | undefined,
  now = Date.now(),
): boolean {
  if (!recordedAt) return false;
  const elapsed = now - Date.parse(recordedAt);
  return Number.isFinite(elapsed) && elapsed >= 0 && elapsed < 24 * 60 * 60 * 1000;
}

