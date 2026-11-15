import { localDate, type Wallet } from "./ledger";

export interface SpendingRange {
  from: string;
  to: string;
}

export function accountSpending(wallet: Wallet, { from, to }: SpendingRange) {
  const totals = new Map<string, number>();
  for (const event of wallet.events) {
    const id = event.command?.account;
    if (!id || !event.expense) continue;
    const date = localDate(event.date, wallet.timezone);
    if (date >= from && date <= to) {
      totals.set(id, (totals.get(id) ?? 0) + event.expense);
    }
  }
  return wallet.accounts.map(({ id, name, institution, type }) => ({
    id, name, institution, type, spent: totals.get(id) ?? 0,
  })).filter(({ spent }) => spent !== 0).sort((a, b) => b.spent - a.spent);
}

export function monthRange(month: string): SpendingRange {
  const [year, index] = month.split("-").map(Number);
  const end = new Date(0);
  end.setUTCFullYear(year, index, 0);
  return {
    from: `${month}-01`,
    to: end.toISOString().slice(0, 10),
  };
}
