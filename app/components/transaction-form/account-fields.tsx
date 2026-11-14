import type { ReactNode } from "react";
import type { Account, EventType, Wallet } from "@/lib/ledger";
import { availableBalance } from "@/lib/ledger";
import { currency } from "@/lib/display";
import { Field, InfoNote } from "../primitives";
import { TARGET_TYPES } from "./types";
import { findInstitution } from "@/lib/institutions";
import { InstitutionMark, useInstitutionCatalog } from "../institution-brand";
import { Landmark } from "lucide-react";
import styles from "./transaction-form.module.css";

interface AccountFieldsProps {
  type: EventType;
  wallet: Wallet;
  accounts: Account[];
  targets: Account[];
  account: string;
  target: string;
  onSelectAccount: (id: string) => void;
  onSelectTarget: (id: string) => void;
  renderInput: (key: string, label: string, props?: React.InputHTMLAttributes<HTMLInputElement>) => ReactNode;
}

export function AccountFields({
  type,
  wallet,
  accounts,
  targets,
  account,
  target,
  onSelectAccount,
  onSelectTarget,
  renderInput,
}: AccountFieldsProps) {
  const isReceiving = ["borrow", "income", "receive", "refund", "capitalReturn"].includes(type);
  const optionalTarget = type === "borrow" || type === "lend";
  const catalog = useInstitutionCatalog();
  const selected = accounts.find((entry) => entry.id === account);
  const institution = selected && findInstitution(catalog, selected.institution, selected.type);

  return (
    <>
      <Field label={isReceiving ? "Receiving account" : "Payment account"}>
        <span className={styles.account}>
          <span aria-hidden="true" className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-[var(--blue)]">
            <InstitutionMark src={institution?.logoUrl}><Landmark size={19} /></InstitutionMark>
          </span>
        <select
          value={account}
          required
          onChange={(e) => onSelectAccount(e.target.value)}
        >
          <option value="" disabled>
            Choose account
          </option>
          {accounts.map((a) => (
            <option key={a.id} value={a.id}>
              {a.name} · {currency(availableBalance(wallet, a))}
            </option>
          ))}
        </select>
        </span>
      </Field>

      {TARGET_TYPES[type] && (
        <Field
          label={
            type === "borrow"
              ? "Loan account"
              : type === "lend"
                ? "Lending record"
                : "Linked account"
          }
        >
          <select
            value={target}
            required={!optionalTarget}
            onChange={(e) => onSelectTarget(e.target.value)}
          >
            {optionalTarget ? (
              <option value="">
                Create a new {type === "borrow" ? "loan" : "lending record"}
              </option>
            ) : (
              <option value="" disabled>
                Choose account
              </option>
            )}
            {targets.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </select>
        </Field>
      )}

      {(type === "borrow" || type === "lend") && !target && (
        <div className="inset">
          <h3>{type === "borrow" ? "Loan details" : "Lending details"}</h3>
          {renderInput(
            "counterparty",
            type === "borrow" ? "Lender / institution" : "Borrower",
            {
              required: true,
              placeholder:
                type === "borrow"
                  ? "Who are you borrowing from?"
                  : "Who are you lending to?",
            },
          )}
          {type === "borrow" &&
            renderInput("loanType", "Loan type", {
              placeholder: "Personal loan, gold loan…",
            })}
          {renderInput("purpose", "Purpose", { placeholder: "e.g. Startup" })}
        </div>
      )}

      {type === "borrow" && (
        <InfoNote label="Loan funds are tracked in this bank">
          Choose Own or Loan when spending from this bank. Loan principal
          remains separate from unused funds.
        </InfoNote>
      )}
    </>
  );
}

