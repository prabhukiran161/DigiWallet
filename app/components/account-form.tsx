"use client";
import { useState } from "react";
import {
  Landmark,
  Coins,
  WalletCards,
  TrendingUp,
  HandCoins,
  ArrowUpRight,
  Check,
} from "lucide-react";
import {
  accountHasActivity,
  withinEditWindow,
  money,
  type AccountType,
  type Account,
  type Wallet,
} from "@/lib/ledger";
import { nowLocal, decimal, currency } from "@/lib/display";
import { Field, InfoNote, type Save } from "./primitives";
import { useInstitutionCatalog } from "./institution-brand";
import { InstitutionPicker } from "./institution-picker";
import { AmountInput } from "./amount-input";

const ACCOUNT_TYPES = [
  { id: "bank", label: "Bank", icon: Landmark },
  { id: "cash", label: "Cash", icon: Coins },
  { id: "card", label: "Credit card", icon: WalletCards },
  { id: "investment", label: "Investment", icon: TrendingUp },
  { id: "loan", label: "Existing loan", icon: HandCoins },
  { id: "receivable", label: "Money lent", icon: ArrowUpRight },
] as const;

function localInput(date: string) {
  const d = new Date(date);
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000)
    .toISOString()
    .slice(0, 16);
}

interface AccountFormProps {
  save: Save;
  onDone: () => void;
  account?: Account;
  wallet?: Wallet;
}

export function AccountForm({
  save,
  onDone,
  account,
  wallet,
}: AccountFormProps) {
  const catalog = useInstitutionCatalog();
  const [type, setType] = useState<AccountType>(account?.type || "bank");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [limit, setLimit] = useState(account?.limit ? decimal(account.limit) : "");
  const [available, setAvailable] = useState(
    account ? decimal(account.limit - account.opening) : "",
  );

  const locked = Boolean(account && wallet && accountHasActivity(wallet, account.id));
  const institutionLocked = Boolean(account && !withinEditWindow(account.createdAt));

  let debt = "—";
  try {
    const n = money(limit) - money(available);
    if (n >= 0) debt = currency(n);
  } catch {}

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const d = Object.fromEntries(new FormData(e.currentTarget));
    setBusy(true);
    setError("");

    const payload = {
      id: account?.id || crypto.randomUUID(),
      type,
      name: String(d.name || ""),
      institution: institutionLocked
        ? account!.institution
        : String(d.institution || ""),
      date: locked ? account!.date : new Date(String(d.date)).toISOString(),
      opening: locked ? decimal(account!.opening) : String(d.opening || "0"),
      limit: type === "card" ? (locked ? decimal(account!.limit) : limit) : "0",
      counterparty: String(d.counterparty ?? account?.counterparty ?? ""),
      purpose: String(d.purpose ?? account?.purpose ?? ""),
      loanType: String(d.loanType ?? account?.loanType ?? ""),
      terms: String(d.terms ?? account?.terms ?? ""),
      dueDate: String(d.dueDate ?? account?.dueDate ?? ""),
      ...(type === "card" && !locked ? { availableCredit: available } : {}),
    };

    try {
      await save(account ? "editAccount" : "account", payload);
      onDone();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <div className="type-grid" aria-label="Account type">
        {ACCOUNT_TYPES.map((t) => (
          <button
            type="button"
            key={t.id}
            disabled={locked}
            aria-pressed={type === t.id}
            className={type === t.id ? "selected" : ""}
            onClick={() => setType(t.id)}
          >
            <t.icon size={21} />
            <span>{t.label}</span>
          </button>
        ))}
      </div>

      <Field label="Account name">
        <input name="name" defaultValue={account?.name} required maxLength={100} />
      </Field>

      {type !== "cash" && (
        <InstitutionPicker key={type} type={type} catalog={catalog}
          initial={account?.institution} disabled={institutionLocked} />
      )}

      {type === "card" && !locked ? (
        <>
          <Field label="Total credit limit (₹)">
            <AmountInput
              required
              value={limit}
              onValueChange={setLimit}
            />
          </Field>
          <Field label="Currently available credit (₹)">
            <AmountInput
              required
              value={available}
              onValueChange={setAvailable}
            />
          </Field>
          <div className="metric-pair">
            <span>Opening outstanding</span>
            <strong>{debt}</strong>
          </div>
        </>
      ) : (
        <Field
          label={
            ["card", "loan"].includes(type)
              ? "Opening debt (₹)"
              : "Opening balance (₹)"
          }
        >
          <AmountInput
            name="opening"
            defaultValue={account ? decimal(account.opening) : ""}
            readOnly={locked}
          />
        </Field>
      )}

      {locked && (
        <p className="notice">
          Opening details are locked because this account has transactions.
        </p>
      )}

      {["loan", "receivable"].includes(type) && (
        <>
          <Field label={type === "loan" ? "Lender" : "Borrower"}>
            <input
              name="counterparty"
              defaultValue={account?.counterparty}
              required
              readOnly={locked}
            />
          </Field>
          <Field label="Purpose">
            <input
              name="purpose"
              defaultValue={account?.purpose}
              readOnly={locked}
            />
          </Field>
          {type === "loan" && (
            <Field label="Loan type">
              <input
                name="loanType"
                defaultValue={account?.loanType}
                readOnly={locked}
              />
            </Field>
          )}
          <InfoNote label="Existing debt or a new loan?">
            This records debt you already owe. To receive new loan money into a
            bank account, use Credit → Borrowed money.
          </InfoNote>
        </>
      )}

      <details className="disclosure">
        <summary>Opening date & other details</summary>
        <Field label="Opening date and time">
          <input
            name="date"
            type="datetime-local"
            defaultValue={account ? localInput(account.date) : nowLocal()}
            required
            readOnly={locked}
          />
        </Field>
        <Field
          label={
            type === "investment"
              ? "Investment type / terms"
              : "Terms / details"
          }
        >
          <input
            name="terms"
            defaultValue={account?.terms}
            readOnly={locked}
          />
        </Field>
        {["loan", "receivable"].includes(type) && (
          <Field label="Due date">
            <input
              name="dueDate"
              type="date"
              defaultValue={account?.dueDate}
              readOnly={locked}
            />
          </Field>
        )}
      </details>

      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}

      <div className="form-footer">
        <button className="primary full" disabled={busy}>
          {busy ? "Saving…" : account ? "Save account" : "Add account"}
          <Check size={17} />
        </button>
      </div>
    </form>
  );
}
