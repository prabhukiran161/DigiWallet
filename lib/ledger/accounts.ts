import type { Wallet, Account, AccountInput } from "./types";
import { check, money, validDate } from "./money";
import {
  accountHasActivity,
  balance,
  creditLimitAt,
  withinEditWindow,
} from "./queries";
import { emptyWallet, management, upgradeWallet } from "./wallet";
import { rebuild } from "./rebuild";

export function createAccount(w: Wallet, input: AccountInput): Wallet {
  check(
    !input.id.startsWith("system:") && !input.id.startsWith("opening-"),
    "Reserved account identifier.",
  );
  check(!w.accounts.some((a) => a.id === input.id), "Account already exists.");
  check(
    input.name.trim().length > 0 && input.name.length <= 100,
    "Enter an account name (maximum 100 characters).",
  );
  check(
    ["bank", "cash", "card", "investment", "loan", "receivable"].includes(
      input.type,
    ),
    "Invalid account type.",
  );
  validDate(input.date);

  const a: Account = {
    ...input,
    name: input.name.trim(),
    date: new Date(input.date).toISOString(),
    opening: money(input.opening || "0"),
    limit: money(input.limit || "0"),
    institution: input.institution || "",
    counterparty: input.counterparty || "",
    purpose: input.purpose || "",
    loanType: input.loanType || "",
    terms: input.terms || "",
    dueDate: input.dueDate || "",
    archived: false,
    createdAt: new Date().toISOString(),
  };

  if (a.type === "card" && input.availableCredit !== undefined) {
    const available = money(input.availableCredit);
    check(
      available <= a.limit,
      "Available credit cannot exceed total credit limit.",
    );
    a.opening = a.limit - available;
  }
  check(
    a.type !== "card" || a.opening <= a.limit,
    "Opening debt exceeds credit limit.",
  );

  return rebuild(
    { ...structuredClone(w), accounts: [...w.accounts, a] },
    w.events.flatMap((e) => (e.command ? [e.command] : [])),
  );
}

export function editAccount(source: Wallet, input: AccountInput): Wallet {
  const w = upgradeWallet(source),
    a = w.accounts.find((a) => a.id === input.id);
  check(a && !a.closedAt, "Choose an account that is not closed.");
  const used = accountHasActivity(w, a.id);
  validDate(input.date);
  check(
    input.name.trim().length > 0 && input.name.length <= 100,
    "Enter an account name (maximum 100 characters).",
  );

  const candidate: Account = used
    ? {
        ...a,
        ...input,
        name: input.name.trim(),
        opening: money(input.opening || "0"),
        limit: money(input.limit || "0"),
        date: new Date(input.date).toISOString(),
        institution: input.institution || "",
        counterparty: input.counterparty || "",
        purpose: input.purpose || "",
        loanType: input.loanType || "",
        terms: input.terms || "",
        dueDate: input.dueDate || "",
      }
    : createAccount(emptyWallet(), input).accounts[0];

  if (used && input.availableCredit !== undefined) {
    check(
      a.type === "card" && money(input.availableCredit) === a.limit - a.opening,
      "Opening details are locked after the first transaction.",
    );
  }
  if (candidate.institution !== a.institution) {
    check(
      withinEditWindow(a.createdAt),
      "Institution can only be changed within 24 hours of account creation.",
    );
  }
  if (used) {
    for (const key of [
      "type",
      "opening",
      "date",
      "limit",
      "counterparty",
      "purpose",
      "loanType",
      "terms",
      "dueDate",
    ] as const) {
      check(
        candidate[key] === a[key],
        "After the first transaction only name, eligible institution edits and dated credit-limit changes are allowed.",
      );
    }
  }

  management(w, "editAccount", a.id, a);
  Object.assign(a, candidate, {
    createdAt: a.createdAt,
    archived: a.archived,
    generated: a.generated,
    limitHistory: a.limitHistory,
  });

  if (!used && a.type === "card") {
    a.limitHistory = [
      { date: a.date, limit: a.limit, recordedAt: new Date().toISOString() },
    ];
  }
  return rebuild(
    w,
    w.events.flatMap((e) => (e.command ? [e.command] : [])),
  );
}

export function setCreditLimit(
  source: Wallet,
  id: string,
  value: string,
  date: string,
): Wallet {
  const w = upgradeWallet(source),
    a = w.accounts.find((a) => a.id === id);
  check(a?.type === "card" && !a.closedAt, "Choose an open credit card.");
  validDate(date);
  check(
    Date.parse(date) >= Date.parse(a.date),
    "Limit change predates account opening.",
  );

  const limit = money(value);
  management(w, "creditLimit", id, a);
  a.limitHistory ??= [
    {
      date: a.date,
      limit: a.limit,
      recordedAt: a.createdAt || new Date().toISOString(),
    },
  ];
  a.limitHistory.push({
    date: new Date(date).toISOString(),
    limit,
    recordedAt: new Date().toISOString(),
  });
  a.limit = creditLimitAt(a);
  return rebuild(
    w,
    w.events.flatMap((e) => (e.command ? [e.command] : [])),
  );
}

export function manageAccount(
  source: Wallet,
  id: string,
  action: "deleteAccount" | "closeAccount" | "archive",
): Wallet {
  const w = upgradeWallet(source),
    a = w.accounts.find((a) => a.id === id);
  check(a, "Account not found.");
  check(!a.closedAt, "Closed accounts cannot be reopened or changed.");
  management(w, action, id, a);

  if (action === "deleteAccount") {
    check(
      !accountHasActivity(w, id),
      "Accounts with transactions cannot be deleted. Close or archive this account instead.",
    );
    w.deletedAccounts!.push({
      account: structuredClone(a),
      opening: w.events.find((e) => e.id === `opening-${id}`),
      deletedAt: new Date().toISOString(),
    });
    w.accounts = w.accounts.filter((a) => a.id !== id);
    return rebuild(
      w,
      w.events.flatMap((e) => (e.command ? [e.command] : [])),
    );
  }

  check(
    !w.allocations.some(
      (f) =>
        (f.loan === id || f.holding === id || f.commitments[id]) &&
        f.remaining > 0,
    ),
    "Resolve loan funds and commitments before archiving or closing.",
  );

  if (action === "closeAccount") {
    check(
      balance(w, id) === 0,
      "Clear the balance or debt before closing this account.",
    );
    a.closedAt = new Date().toISOString();
    a.archived = false;
  } else {
    a.archived = !a.archived;
  }
  return w;
}
