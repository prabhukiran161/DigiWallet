import { useMemo, useRef, useState } from "react";
import {
  post,
  editTransaction,
  type Wallet,
  type Command,
  type EventType,
  type AccountType,
  type Journal,
} from "@/lib/ledger";
import { nowLocal } from "@/lib/display";
import type { Save } from "../primitives";
import { CREDIT_TYPES, DEBIT_TYPES, TARGET_TYPES } from "./types";

interface UseTransactionFormOptions {
  wallet: Wallet;
  save: Save;
  onDone: () => void;
  initialType?: EventType;
  editing?: Journal;
}

export function useTransactionForm({
  wallet,
  save,
  onDone,
  initialType = "expense",
  editing,
}: UseTransactionFormOptions) {
  const original = editing?.command;
  const effectiveType = original?.type || initialType;
  const originalDate = original
    ? new Date(
        new Date(original.date).getTime() -
          new Date(original.date).getTimezoneOffset() * 60000,
      )
        .toISOString()
        .slice(0, 16)
    : "";

  const [direction, setDirection] = useState(
    CREDIT_TYPES.includes(effectiveType) ? "credit" : "debit",
  );
  const [type, setType] = useState<EventType>(effectiveType);
  const [data, setData] = useState<Record<string, string>>({
    amount: "",
    description: "",
    date: nowLocal(),
    category:
      wallet.categories.find((c) => c.id === "other" && !c.archived)?.id ||
      wallet.categories.find((c) => !c.archived)?.id ||
      "",
    reserve: "yes",
    ...(original
      ? Object.fromEntries(
          Object.entries(original)
            .filter(([, v]) => v !== undefined)
            .map(([k, v]) => [
              k,
              typeof v === "boolean" ? (v ? "yes" : "no") : String(v),
            ]),
        )
      : {}),
    ...(original
      ? {
          date: originalDate,
          funding: original.loanFunding || original.allocation ? "loan" : "own",
        }
      : {}),
  });

  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [review, setReview] = useState(false);
  const keys = useRef(new Map<string, string>());

  const set = (key: string, value: string) =>
    setData((d) => ({ ...d, [key]: value }));

  const sourceTypes: AccountType[] =
    type === "expense"
      ? ["bank", "cash", "card"]
      : ["borrow", "invest", "capitalReturn", "cardPayment"].includes(type)
        ? ["bank"]
        : type === "refund"
          ? ["bank", "cash", "card"]
          : ["bank", "cash"];

  const accounts = wallet.accounts.filter(
    (a) =>
      ((!a.archived && !a.closedAt) || a.id === original?.account) &&
      sourceTypes.includes(a.type),
  );
  const account =
    data.account && accounts.some((a) => a.id === data.account)
      ? data.account
      : accounts[0]?.id || "";

  const targets = wallet.accounts.filter(
    (a) =>
      ((!a.archived && !a.closedAt) || a.id === original?.target) &&
      a.id !== account &&
      TARGET_TYPES[type]?.includes(a.type),
  );
  const optionalTarget = type === "borrow" || type === "lend";
  const target =
    data.target && targets.some((a) => a.id === data.target)
      ? data.target
      : optionalTarget
        ? ""
        : targets[0]?.id || "";

  const allowFunding =
    [
      "expense",
      "invest",
      "lend",
      "transfer",
      "cardPayment",
      "repay",
      "release",
    ].includes(type) &&
    wallet.accounts.find((a) => a.id === account)?.type === "bank" &&
    (type !== "repay" || data.returnUnused === "yes");

  const eligible = wallet.allocations.filter(
    (f) =>
      f.holding === account &&
      (type !== "repay" || f.loan === target) &&
      (f.remaining - f.committed > 0 ||
        (type === "cardPayment" && (f.commitments[target] || 0) > 0) ||
        original?.loanFunding === f.loan ||
        original?.allocation === f.id),
  );

  const initialLoan =
    original?.loanFunding ||
    wallet.allocations.find((f) => f.id === original?.allocation)?.loan;

  const loanIds = [
    ...new Set([
      ...eligible.map((f) => f.loan),
      ...(original && account === original.account && initialLoan
        ? [initialLoan]
        : []),
    ]),
  ];

  const loan = loanIds.includes(data.loanFunding || initialLoan || "")
    ? data.loanFunding || initialLoan!
    : loanIds.length === 1
      ? loanIds[0]
      : "";

  const usesLoan =
    allowFunding &&
    (data.funding === "loan" ||
      type === "release" ||
      (type === "repay" && data.returnUnused === "yes"));

  const command = useMemo(() => {
    const date =
      original && data.date === originalDate
        ? original.date
        : data.date && Number.isFinite(Date.parse(data.date))
          ? new Date(data.date).toISOString()
          : "";
    const c: Command = {
      key: original?.key || "preview",
      type,
      account,
      amount: data.amount,
      description: data.description,
      date,
      category: data.category,
      notes: data.notes || "",
    };
    if (target) c.target = target;
    if ((type === "borrow" || type === "lend") && !target) {
      c.counterparty = data.counterparty || "";
      c.loanType = data.loanType || "Personal loan";
      c.purpose = data.purpose || "";
      c.terms = data.terms || "";
      c.dueDate = data.dueDate || "";
    }
    if (type === "borrow") {
      c.reserve =
        original?.type === "borrow" ? original.reserve || false : true;
      c.purpose = data.purpose || "";
    }
    if (type === "receive" || type === "repay")
      c.interest = data.interest || "0";
    if (type === "repay") {
      c.fee = data.fee || "0";
      c.returnUnused = data.returnUnused === "yes";
    }
    if (usesLoan && loan) c.loanFunding = loan;
    if (
      original?.allocation &&
      wallet.accounts.find((a) => a.id === account)?.type === "card" &&
      account === original.account &&
      type === original.type
    )
      c.allocation = original.allocation;
    if (type === "refund") c.original = data.original;
    return c;
  }, [
    type,
    account,
    target,
    data,
    usesLoan,
    loan,
    original,
    originalDate,
    wallet.accounts,
  ]);

  let preview: Wallet | undefined;
  let previewError = "";
  try {
    if (data.amount && data.description)
      preview = editing
        ? editTransaction(
            wallet,
            editing.id,
            command,
            editing.revision || 0,
            "preview-edit",
          )
        : post(wallet, command);
    if (usesLoan && !loan) {
      preview = undefined;
      previewError = "Select a loan held in this bank.";
    }
  } catch (err) {
    previewError = (err as Error).message;
  }

  async function confirm() {
    if (!preview) return;
    setBusy(true);
    setError("");
    const payload = JSON.stringify(command);
    let key = keys.current.get(payload);
    if (!key) {
      key = crypto.randomUUID();
      keys.current.set(payload, key);
    }
    try {
      if (editing)
        await save("editTransaction", {
          id: editing.id,
          command,
          expectedRevision: editing.revision || 0,
          requestKey: key,
        });
      else await save("transaction", { ...command, key });
      onDone();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return {
    original,
    direction,
    setDirection,
    type,
    setType,
    data,
    set,
    error,
    setError,
    busy,
    review,
    setReview,
    accounts,
    account,
    targets,
    target,
    allowFunding,
    loanIds,
    loan,
    usesLoan,
    command,
    preview,
    previewError,
    confirm,
  };
}

