import type { Journal } from "@/lib/ledger";
import { money } from "@/lib/ledger";
import { currency } from "@/lib/display";

export function dayLabel(date: string): string {
  return new Date(`${date}T12:00:00`).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
  });
}

export function amountLabel(e: Journal, account = ""): string {
  const delta = e.lines
    .filter((l) => l.account === account)
    .reduce((n, l) => n + l.delta, 0);

  if (account && delta && e.type !== "opening") {
    return (delta > 0 ? "+" : "−") + currency(Math.abs(delta));
  }

  const prefix =
    e.type === "opening"
      ? ""
      : e.inflow > 0
        ? "+"
        : e.outflow > 0 || e.expense > 0
          ? "−"
          : "";

  const amount = e.command
    ? money(e.command.amount) +
      money(e.command.interest || "0") +
      money(e.command.fee || "0")
    : Math.abs(e.lines[0]?.delta || 0);

  return prefix + currency(amount);
}

