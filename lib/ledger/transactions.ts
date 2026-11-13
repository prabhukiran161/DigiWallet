import type { Wallet, Command } from "./types";
import { canonical, check, money, validDate } from "./money";
import { withinEditWindow } from "./queries";
import { rebuild } from "./rebuild";
import { upgradeWallet } from "./wallet";

export function post(w: Wallet, c: Command): Wallet {
  if (c.type === "borrow") c = { ...c, reserve: true };
  const old = w.events.find((e) => e.command?.key === c.key);
  if (old) {
    check(
      canonical(old.command!) === canonical(c),
      "Idempotency conflict: this request key has different details.",
    );
    return structuredClone(w);
  }

  check(c.key.length > 0 && c.key.length <= 100, "Invalid request key.");
  check(
    c.description.trim().length > 0 && c.description.length <= 200,
    "Description is required (maximum 200 characters).",
  );
  check((c.notes || "").length <= 2000, "Notes are too long.");
  validDate(c.date);

  if (
    c.type === "expense" ||
    (c.type === "repay" && money(c.interest || "0") + money(c.fee || "0") > 0)
  ) {
    check(
      w.categories.some(
        (cat) => cat.id === (c.category || "other") && !cat.archived,
      ),
      "Choose an active expense category.",
    );
  }

  for (const id of [c.account, c.target].filter(Boolean)) {
    const a = w.accounts.find((a) => a.id === id);
    check(
      a && !a.archived && !a.closedAt,
      "Choose an active account belonging to this wallet.",
    );
  }

  check(
    !c.allocation ||
      w.accounts.find((a) => a.id === c.account)?.type === "bank",
    "Loan funds can only be selected from their holding bank.",
  );
  check(
    !c.loanFunding ||
      w.accounts.find((a) => a.id === c.account)?.type === "bank",
    "Loan funds can only be selected from their holding bank.",
  );
  if ((c.loanFunding || c.allocation) && c.type === "transfer") {
    check(
      w.accounts.find((a) => a.id === c.target)?.type === "bank",
      "Loan funds must be moved to a bank account.",
    );
  }

  return rebuild(w, [
    ...w.events.flatMap((e) => (e.command ? [e.command] : [])),
    c,
  ]);
}

export function editTransaction(
  source: Wallet,
  id: string,
  replacement: Command,
  expectedRevision: number,
  requestKey: string,
): Wallet {
  const w = upgradeWallet(source),
    old = w.events.find((e) => e.id === id);
  check(old?.command, "Opening entries are managed through account settings.");
  const command = { ...replacement, key: old.command.key };
  const retry = old.revisions?.find((r) => r.requestKey === requestKey);
  if (retry) {
    check(
      canonical(retry.replacement!) === canonical(command),
      "Edit request conflict.",
    );
    return w;
  }

  check(
    withinEditWindow(old.recordedAt),
    "The 24-hour editing window has ended.",
  );
  check(
    (old.revision || 0) === expectedRevision,
    "Edit conflict: this transaction changed. Reload its details.",
  );
  check(
    command.description.trim().length > 0 &&
      command.description.length <= 200,
    "Description is required (maximum 200 characters).",
  );
  check((command.notes || "").length <= 2000, "Notes are too long.");
  validDate(command.date);

  for (const ref of [command.account, command.target].filter(Boolean)) {
    const a = w.accounts.find((a) => a.id === ref);
    check(a, "Account not found.");
    check(
      (!a.closedAt && !a.archived) ||
        ref === old.command.account ||
        ref === old.command.target,
      "Choose an active account.",
    );
  }

  if (
    command.type === "expense" ||
    (command.type === "repay" &&
      money(command.interest || "0") + money(command.fee || "0") > 0)
  ) {
    check(
      w.categories.some(
        (c) =>
          c.id === command.category && (!c.archived || c.id === old.category),
      ),
      "Choose an active category.",
    );
  }

  check(
    !command.allocation ||
      (command.allocation === old.command.allocation &&
        command.account === old.command.account) ||
      w.accounts.find((a) => a.id === command.account)?.type === "bank",
    "Loan funds can only be selected from their holding bank.",
  );

  const result = rebuild(
    w,
    w.events.flatMap((e) =>
      e.id === id ? [command] : e.command ? [e.command] : [],
    ),
  );
  const edited = result.events.find((e) => e.id === id)!;
  edited.revision = (old.revision || 0) + 1;
  edited.revisions = [
    ...(old.revisions || []),
    {
      editedAt: new Date().toISOString(),
      command: structuredClone(old.command),
      requestKey,
      replacement: structuredClone(command),
    },
  ];
  return result;
}

