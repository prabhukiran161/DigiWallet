"use client";
import { ArrowRight, ArrowDownLeft, ArrowUpRight } from "lucide-react";
import { labels } from "@/lib/display";
import type { EventType } from "@/lib/ledger";
import { Field } from "../primitives";
import { CREDIT_TYPES, DEBIT_TYPES, type TransactionFormProps } from "./types";
import { ReviewScreen } from "./review-screen";
import { AccountFields } from "./account-fields";
import { LoanFunding } from "./loan-funding";
import { CategoryPicker } from "./category-picker";
import { useTransactionForm } from "./use-transaction-form";

export function TransactionForm(props: TransactionFormProps) {
  const { wallet, editing } = props;
  const form = useTransactionForm(props);

  const input = (
    key: string,
    label: string,
    inputProps: React.InputHTMLAttributes<HTMLInputElement> = {},
  ) => (
    <Field label={label}>
      <input
        value={form.data[key] || ""}
        onChange={(e) => form.set(key, e.target.value)}
        {...inputProps}
      />
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
      <div className="segmented">
        {["debit", "credit"].map((d) => (
          <button
            type="button"
            key={d}
            aria-pressed={form.direction === d}
            className={form.direction === d ? "selected" : ""}
            onClick={() => {
              form.setDirection(d);
              form.setType(d === "debit" ? "expense" : "income");
              form.set("target", "");
              form.set("allocation", "");
              form.set("loanFunding", "");
              form.set("funding", "own");
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

      <div className="amount-entry">
        {input(
          "amount",
          ["repay", "receive"].includes(form.type)
            ? "Principal amount (₹)"
            : "Amount (₹)",
          {
            required: true,
            inputMode: "decimal",
            placeholder: "0.00",
            pattern: "[0-9]+(\\.[0-9]{1,2})?",
          },
        )}
      </div>

      <Field label="Transaction type">
        <select
          value={form.type}
          onChange={(e) => {
            form.setType(e.target.value as EventType);
            form.set("target", "");
            form.set("allocation", "");
            form.set("loanFunding", "");
            form.set("funding", "own");
            form.set("original", "");
          }}
        >
          {(form.direction === "credit" ? CREDIT_TYPES : DEBIT_TYPES).map((t) => (
            <option key={t} value={t}>
              {labels[t]}
            </option>
          ))}
        </select>
      </Field>

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
        onSetReturnUnused={(checked) => form.set("returnUnused", checked ? "yes" : "no")}
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

      <details className="disclosure">
        <summary>Date, notes & more</summary>
        {input("date", "Date and time (device local)", {
          type: "datetime-local",
          required: true,
        })}
        {input("notes", "Notes", { maxLength: 2000, placeholder: "Optional" })}
        {(form.type === "borrow" || form.type === "lend") && !form.target && (
          <>
            {input("dueDate", "Due date", { type: "date" })}
            {input("terms", "Agreed interest / terms", {
              placeholder: "Optional; entered manually",
            })}
          </>
        )}
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

      <div className="form-footer">
        <button className="primary full" disabled={!form.preview}>
          Review transaction
          <ArrowRight size={18} />
        </button>
      </div>
    </form>
  );
}

