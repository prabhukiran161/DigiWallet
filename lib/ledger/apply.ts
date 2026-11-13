import type { Wallet, Command, Journal, Account, AccountType } from "./types";
import { check, money } from "./money";
import { liquid } from "./queries";

export function apply(w: Wallet, c: Command) {
  const amount = money(c.amount),
    interest = money(c.interest || "0"),
    fee = money(c.fee || "0");
  check(amount > 0, "Amount must be greater than zero.");

  const find = (id: string | undefined) => {
    const a = w.accounts.find((a) => a.id === id);
    check(a, "Account not found in this wallet.");
    check(
      Date.parse(c.date) >= Date.parse(a.date),
      "Transaction predates account opening.",
    );
    return a;
  };

  const a = find(c.account);
  const target = c.target ? find(c.target) : undefined;
  const is = (a: Account | undefined, types: AccountType[]) =>
    !!a && types.includes(a.type);
  const f = c.allocation
    ? w.allocations.find((f) => f.id === c.allocation)
    : undefined;

  check(!c.allocation || f, "Funding allocation not found.");
  check(!(c.allocation && c.loanFunding), "Choose one funding method.");

  const funds = c.loanFunding
    ? w.allocations.filter(
        (f) => f.loan === c.loanFunding && f.holding === a.id && f.remaining > 0,
      )
    : f
      ? [f]
      : [];

  check(
    !c.loanFunding || (a.type === "bank" && funds.length > 0),
    "No loan funds are held in this bank.",
  );

  const e: Journal = {
    id: c.key,
    type: c.type,
    date: new Date(c.date).toISOString(),
    recordedAt: new Date().toISOString(),
    description: c.description.trim(),
    notes: c.notes || "",
    category: c.category || "other",
    lines: [],
    expense: 0,
    income: 0,
    inflow: 0,
    outflow: 0,
    balances: {},
    command: structuredClone(c),
  };

  const line = (account: string, delta: number) => {
    if (delta) e.lines.push({ account, delta });
  };
  const pair = (debit: string, credit: string, n: number) => {
    line(debit, n);
    line(credit, -n);
  };

  const consume = (n: number, card = false) => {
    if (!funds.length) return;
    check(
      n <= funds.reduce((s, f) => s + f.remaining - f.committed, 0),
      "Insufficient remaining purpose funding.",
    );
    for (const f of funds) {
      const used = Math.min(n, f.remaining - f.committed);
      if (!used) continue;
      if (card) {
        f.committed += used;
        f.commitments[a.id] = (f.commitments[a.id] || 0) + used;
      } else {
        check(
          f.holding === a.id,
          "Funding must be held in the selected payment account.",
        );
        f.remaining -= used;
      }
      f.used += used;
      n -= used;
    }
  };

  const generated = (type: "loan" | "receivable") => {
    check(c.counterparty?.trim(), "Enter the lender or borrower.");
    const id = `${type}-${c.key}`;
    const account: Account = {
      id,
      type,
      name:
        type === "loan"
          ? `${c.loanType || "Loan"} · ${c.counterparty}`
          : `Lent · ${c.counterparty}`,
      counterparty: c.counterparty!,
      purpose: c.purpose || "",
      loanType: c.loanType || "Personal",
      terms: c.terms || "",
      dueDate: c.dueDate || "",
      date: e.date,
      opening: 0,
      limit: 0,
      institution: c.counterparty!,
      archived: false,
      generated: true,
      createdAt: e.recordedAt,
    };
    w.accounts.push(account);
    return account;
  };

  switch (c.type) {
    case "income":
      check(liquid(a), "Income requires a bank or cash account.");
      pair(a.id, "system:income", amount);
      e.income = amount;
      break;

    case "expense":
      check(
        is(a, ["bank", "cash", "card"]),
        "Choose bank, cash or card for an expense.",
      );
      pair("system:expense", a.id, amount);
      e.expense = amount;
      consume(amount, a.type === "card");
      break;

    case "borrow": {
      check(a.type === "bank", "Borrowed money must enter a bank account.");
      check(!target || target.type === "loan", "Choose an existing loan.");
      check(
        target || !w.accounts.some((a) => a.id === `loan-${c.key}`),
        "Generated loan account already exists.",
      );
      const loan = target || generated("loan");
      pair(a.id, loan.id, amount);
      if (c.reserve) {
        w.allocations.push({
          id: `fund-${c.key}`,
          loan: loan.id,
          purpose: c.purpose || loan.purpose || "Loan purpose",
          holding: a.id,
          assigned: amount,
          remaining: amount,
          committed: 0,
          used: 0,
          released: 0,
          returned: 0,
          commitments: {},
        });
      }
      break;
    }

    case "transfer":
      check(
        liquid(a) && target && liquid(target) && a.id !== target.id,
        "Choose two different bank or cash accounts.",
      );
      pair(target!.id, a.id, amount);
      if (funds.length) {
        check(
          funds.every((f) => f.holding === a.id) &&
            funds.reduce((s, f) => s + f.remaining, 0) === amount,
          "Move the complete reservation to another bank, or release a portion first.",
        );
        for (const fund of funds) fund.holding = target!.id;
      }
      break;

    case "invest":
      check(
        a.type === "bank" && target?.type === "investment",
        "Investment contributions require a bank and investment account.",
      );
      pair(target!.id, a.id, amount);
      consume(amount);
      break;

    case "capitalReturn":
      check(
        a.type === "bank" && target?.type === "investment",
        "Choose receiving bank and investment.",
      );
      pair(a.id, target!.id, amount);
      break;

    case "cardPayment":
      check(
        a.type === "bank" && target?.type === "card",
        "Card payments require a bank and card.",
      );
      pair(target!.id, a.id, amount);
      if (funds.length) {
        check(
          funds.every((f) => f.holding === a.id),
          "Funding must be held in the selected payment bank.",
        );
        const committed = funds.reduce(
          (s, f) => s + (f.commitments[target!.id] || 0),
          0,
        );
        const free = funds.reduce((s, f) => s + f.remaining - f.committed, 0);
        check(
          amount <= committed + free,
          "Insufficient loan funding for this card payment.",
        );
        let left = amount;
        for (const fund of funds) {
          const n = Math.min(left, fund.commitments[target!.id] || 0);
          fund.remaining -= n;
          fund.committed -= n;
          fund.commitments[target!.id] =
            (fund.commitments[target!.id] || 0) - n;
          left -= n;
        }
        consume(left);
      }
      break;

    case "lend": {
      check(liquid(a), "Lending requires bank or cash.");
      check(!target || target.type === "receivable", "Choose a receivable.");
      check(
        target || !w.accounts.some((a) => a.id === `receivable-${c.key}`),
        "Generated receivable already exists.",
      );
      const receivable = target || generated("receivable");
      pair(receivable.id, a.id, amount);
      consume(amount);
      break;
    }

    case "receive":
      check(
        liquid(a) && target?.type === "receivable",
        "Choose receiving bank or cash and a receivable.",
      );
      pair(a.id, target!.id, amount);
      pair(a.id, "system:income", interest);
      e.income = interest;
      break;

    case "repay":
      check(
        liquid(a) && target?.type === "loan",
        "Choose bank or cash and an existing loan.",
      );
      pair(target!.id, a.id, amount);
      pair("system:expense", a.id, interest + fee);
      e.expense = interest + fee;
      if (c.returnUnused) {
        check(
          funds.length &&
            funds.every((f) => f.loan === target!.id && f.holding === a.id) &&
            amount <=
              funds.reduce((s, f) => s + f.remaining - f.committed, 0),
          "Choose sufficient uncommitted funding for this loan and bank.",
        );
        let left = amount;
        for (const fund of funds) {
          const n = Math.min(left, fund.remaining - fund.committed);
          fund.remaining -= n;
          fund.returned += n;
          left -= n;
        }
      } else
        check(
          !funds.length,
          "Only unused principal returns can consume a repayment allocation.",
        );
      break;

    case "refund": {
      const original = w.events.find((o) => o.id === c.original);
      check(
        original?.type === "expense" && original.command?.account === a.id,
        "Select an original expense from this payment account.",
      );
      check(
        !original.command.allocation && !original.command.loanFunding,
        "Funded refunds need allocation restoration and are not supported yet.",
      );
      const already = w.events
        .filter((o) => o.command?.original === c.original)
        .reduce((s, o) => s - o.expense, 0);
      check(
        amount <= original.expense - already,
        "Refund exceeds the original expense.",
      );
      pair(a.id, "system:expense", amount);
      e.expense = -amount;
      e.category = original.category;
      break;
    }

    case "release": {
      check(
        funds.length &&
          funds.every((f) => f.holding === a.id) &&
          amount <=
            funds.reduce((s, f) => s + f.remaining - f.committed, 0),
        "Choose uncommitted reserved funds in this bank.",
      );
      let left = amount;
      for (const fund of funds) {
        const n = Math.min(left, fund.remaining - fund.committed);
        fund.remaining -= n;
        fund.released += n;
        left -= n;
      }
      break;
    }

    default:
      throw new Error("Unsupported transaction type.");
  }

  check(
    !interest || ["repay", "receive"].includes(c.type),
    "Interest is only supported on repayments.",
  );
  check(!fee || c.type === "repay", "Fees must be recorded as expenses.");
  check(
    !funds.length ||
      [
        "expense",
        "invest",
        "lend",
        "transfer",
        "cardPayment",
        "repay",
        "release",
      ].includes(c.type),
    "Funding is not supported for this event.",
  );
  if (e.expense > 0)
    check(
      w.categories.some((cat) => cat.id === e.category),
      "Select an expense category.",
    );

  const cash = e.lines
    .filter((l) => w.accounts.some((a) => a.id === l.account && liquid(a)))
    .reduce((s, l) => s + l.delta, 0);
  e.inflow = Math.max(cash, 0);
  e.outflow = Math.max(-cash, 0);

  check(
    e.lines.reduce((s, l) => s + l.delta, 0) === 0,
    "Journal does not balance.",
  );
  w.events.push(e);
}

