import type { Wallet, Command } from "./types";
import { check, money } from "./money";
import { balance, creditLimitAt, liability, liquid } from "./queries";
import { apply } from "./apply";

export function rebuild(source: Wallet, commands: Command[]): Wallet {
  const w = structuredClone(source);
  w.accounts = w.accounts.filter((a) => !a.generated);
  w.events = [];
  w.allocations = [];

  const items = [
    ...w.accounts.map((a, i) => ({ date: a.date, seq: i, account: a })),
    ...commands.map((command, i) => ({
      date: command.date,
      seq: w.accounts.length + i,
      command,
    })),
  ].sort((a, b) => Date.parse(a.date) - Date.parse(b.date) || a.seq - b.seq);

  for (const item of items) {
    if ("account" in item) {
      const a = item.account;
      const amount = a.opening * (liability(a) ? -1 : 1);
      w.events.push({
        id: `opening-${a.id}`,
        type: "opening",
        date: a.date,
        recordedAt: a.date,
        description: `Opening balance · ${a.name}`,
        notes: "",
        category: "",
        lines: amount
          ? [
              { account: a.id, delta: amount },
              { account: "system:equity", delta: -amount },
            ]
          : [],
        expense: 0,
        income: 0,
        inflow: 0,
        outflow: 0,
        balances: {},
      });
    } else {
      const card = w.accounts.find(
        (a) => a.id === item.command.account && a.type === "card",
      );
      if (card && item.command.type === "expense") {
        check(
          balance(w, card.id) + money(item.command.amount) <=
            creditLimitAt(
              card,
              item.command.date,
              source.events.find((e) => e.id === item.command.key)?.recordedAt ||
                new Date().toISOString(),
            ),
          `Credit limit exceeded for ${card.name}.`,
        );
      }
      apply(w, item.command);
    }

    const last = w.events.at(-1)!;
    last.balances = Object.fromEntries(
      w.accounts.map((a) => [a.id, balance(w, a.id)]),
    );
    last.availableBalances = Object.fromEntries(
      w.accounts.map((a) => [
        a.id,
        a.type === "card"
          ? Math.max(
              0,
              creditLimitAt(
                a,
                last.date,
                source.events.find((e) => e.id === last.id)?.recordedAt ||
                  last.recordedAt,
              ) - last.balances[a.id],
            )
          : last.balances[a.id],
      ]),
    );

    for (const a of w.accounts) {
      const n = balance(w, a.id);
      check(
        Number.isSafeInteger(n) && Math.abs(n) <= 100000000000000,
        "Balance exceeds supported range.",
      );
      check(n >= 0, `Insufficient funds or principal balance in ${a.name}.`);

      const reserved = w.allocations
        .filter((f) => f.holding === a.id)
        .reduce((s, f) => s + f.remaining, 0);
      check(
        !liquid(a) || reserved <= n,
        `Reserved money in ${a.name} must be released or moved before spending.`,
      );
    }

    for (const f of w.allocations) {
      check(
        f.remaining >= 0 && f.committed >= 0 && f.committed <= f.remaining,
        "Insufficient remaining purpose funding.",
      );
    }

    for (const card of w.accounts.filter((a) => a.type === "card")) {
      check(
        w.allocations.reduce((s, f) => s + (f.commitments[card.id] || 0), 0) <=
          balance(w, card.id),
        "Select the funding commitment when settling this card.",
      );
    }

    check(
      Number.isSafeInteger(
        w.accounts.reduce((s, a) => s + balance(w, a.id), 0),
      ),
      "Total balances exceed the exact integer range.",
    );
  }

  // Preserve historical recording times and revisions across replays
  for (const e of w.events) {
    const previous = source.events.find((old) => old.id === e.id);
    e.recordedAt = previous?.recordedAt || e.recordedAt;
    e.revision = previous?.revision || 0;
    e.revisions = previous?.revisions || [];
  }

  for (const a of w.accounts.filter((a) => a.generated)) {
    const previous = source.accounts.find((old) => old.id === a.id);
    if (previous) {
      a.name = previous.name;
      a.archived = previous.archived;
      a.closedAt = previous.closedAt;
      a.createdAt = previous.createdAt;
      a.institution = previous.institution;
    }
  }

  for (const a of w.accounts.filter((a) => a.closedAt)) {
    check(
      balance(w, a.id) === 0 &&
        !w.allocations.some(
          (f) =>
            (f.loan === a.id || f.holding === a.id) && f.remaining > 0,
        ),
      "This edit would reopen a balance or funding obligation on a closed account.",
    );
  }

  return w;
}

