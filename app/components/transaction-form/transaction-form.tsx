"use client";
import {
  ArrowRight,
  ArrowDownLeft,
  ArrowUpRight,
  CalendarDays,
  ChevronDown,
} from "lucide-react";
import type { EventType } from "@/lib/ledger";
import { Field } from "../primitives";
import { AmountInput } from "../amount-input";
import styles from "./transaction-form.module.css";
import { CREDIT_TYPES, DEBIT_TYPES, type TransactionFormProps } from "./types";
import { ReviewScreen } from "./review-screen";
import { AccountFields } from "./account-fields";
import { LoanFunding } from "./loan-funding";
import { CategoryPicker } from "./category-picker";
import { useTransactionForm } from "./use-transaction-form";
import { TransactionTypePicker } from "./transaction-type-picker";

export function TransactionForm(props: TransactionFormProps) {
  const { wallet, editing } = props;
  const form = useTransactionForm(props);
  const transactionTypes =
    form.direction === "credit" ? CREDIT_TYPES : DEBIT_TYPES;

  function selectType(type: EventType) {
    form.setType(type);
    form.set("target", "");
    form.set("allocation", "");
    form.set("loanFunding", "");
    form.set("funding", "own");
    form.set("original", "");
  }

  const input = (
    key: string,
    label: string,
    inputProps: React.InputHTMLAttributes<HTMLInputElement> = {},
  ) => (
    <Field label={label}>
      {inputProps.inputMode === "decimal" ? (
        <AmountInput
          required={inputProps.required}
          value={form.data[key] || ""}
          onValueChange={(value) => form.set(key, value)}
        />
      ) : (
        <input
          value={form.data[key] || ""}
          onChange={(e) => form.set(key, e.target.value)}
          {...inputProps}
        />
      )}
    </Field>
  );

  if (form.review) {
    return (
      <ReviewScreen
        wallet={wallet}
        preview={form.preview}
        command={form.command}
        editing={Boolean(editing)}
        busy={form.busy}
        type={form.type}
        description={form.data.description}
        error={form.error}
        previewError={form.previewError}
        onBack={() => form.setReview(false)}
        onConfirm={() => void form.confirm()}
      />
    );
  }

  return (
    <form
      className={`${styles.form} flex flex-1 flex-col`}
      onSubmit={(e) => {
        e.preventDefault();
        if (!form.preview) {
          form.setError(form.previewError || "Complete the required fields.");
          return;
        }
        form.setError("");
        form.setReview(true);
      }}
    >
      <div className="mb-4 flex gap-1 rounded-2xl bg-[var(--soft)] p-1">
        {["debit", "credit"].map((d) => (
          <button
            type="button"
            key={d}
            aria-pressed={form.direction === d}
            className={`flex min-h-9 flex-1 items-center justify-center gap-2 rounded-xl font-semibold aria-pressed:bg-white aria-pressed:text-[var(--blue)] aria-pressed:shadow-sm ${form.direction === d ? "" : "text-[var(--muted)]"}`}
            onClick={() => {
              form.setDirection(d);
              selectType(d === "debit" ? "expense" : "income");
            }}
          >
            {d === "debit" ? (
              <>
                <ArrowUpRight size={17} />
                Debit
              </>
            ) : (
              <>
                <ArrowDownLeft size={17} />
                Credit
              </>
            )}
          </button>
        ))}
      </div>

      <TransactionTypePicker
        key={form.direction}
        types={transactionTypes}
        selected={form.type}
        onSelect={selectType}
      />

      <div
        className={`${styles.amount} mb-3 mt-5 border-b border-[var(--line)] pb-3 text-center`}
      >
        {input(
          "amount",
          ["repay", "receive"].includes(form.type)
            ? "Principal amount (₹)"
            : "Amount (₹)",
          {
            required: true,
            inputMode: "decimal",
            placeholder: "0.00",
          },
        )}
      </div>

      <AccountFields
        type={form.type}
        wallet={wallet}
        accounts={form.accounts}
        targets={form.targets}
        account={form.account}
        target={form.target}
        onSelectAccount={(account) => {
          form.set("account", account);
          form.set("loanFunding", "");
          form.set("allocation", "");
          form.set("funding", "own");
        }}
        onSelectTarget={(target) => form.set("target", target)}
        renderInput={input}
      />

      <LoanFunding
        type={form.type}
        wallet={wallet}
        returnUnused={form.data.returnUnused === "yes"}
        allowFunding={form.allowFunding}
        usesLoan={form.usesLoan}
        loanIds={form.loanIds}
        loan={form.loan}
        onSetReturnUnused={(checked) =>
          form.set("returnUnused", checked ? "yes" : "no")
        }
        onSetFunding={(funding) => form.set("funding", funding)}
        onSetLoan={(loanId) => form.set("loanFunding", loanId)}
        renderInput={input}
      />

      <CategoryPicker
        type={form.type}
        wallet={wallet}
        account={form.account}
        category={form.data.category}
        originalExpense={form.data.original}
        editingCategory={editing?.category}
        onSelectCategory={(categoryId) => form.set("category", categoryId)}
        onSelectOriginalExpense={(expenseId) => form.set("original", expenseId)}
      />

      {input("description", "Description", {
        required: true,
        maxLength: 200,
        placeholder: "What was this for?",
      })}

      <details className="group mb-4 rounded-2xl border border-[var(--line)] open:border-blue-200">
        <summary className="flex cursor-pointer list-none items-center gap-3 rounded-2xl bg-[var(--soft)] p-2.5 [&::-webkit-details-marker]:hidden">
          <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-blue-100 text-[var(--blue)]">
            <CalendarDays size={19} aria-hidden />
          </span>
          <span className="flex-1">
            <strong className="block">Date, notes &amp; more</strong>
            <small className="text-[var(--muted)]">
              Add date, time and additional notes
            </small>
          </span>
          <ChevronDown
            size={17}
            className="group-open:rotate-180"
            aria-hidden
          />
        </summary>
        <div className="px-3 pt-3">
          {input("date", "Date and time (device local)", {
            type: "datetime-local",
            required: true,
          })}
          {input("notes", "Notes", {
            maxLength: 2000,
            placeholder: "Optional",
          })}
          {(form.type === "borrow" || form.type === "lend") && !form.target && (
            <>
              {input("dueDate", "Due date", { type: "date" })}
              {input("terms", "Agreed interest / terms", {
                placeholder: "Optional; entered manually",
              })}
            </>
          )}
        </div>
      </details>

      {(form.error || form.previewError) && (
        <p role="alert" className="error">
          {form.error || form.previewError}
        </p>
      )}

      {!form.accounts.length && (
        <p className="notice">
          Add a suitable account before recording this transaction.
        </p>
      )}

      <div className={styles.footer}>
        <button className="primary full" disabled={!form.preview}>
          Review transaction
          <ArrowRight size={18} />
        </button>
      </div>
    </form>
  );
}
