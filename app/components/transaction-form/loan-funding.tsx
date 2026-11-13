import type { ReactNode } from "react";
import type { EventType, Wallet } from "@/lib/ledger";
import { Field } from "../primitives";

interface LoanFundingProps {
  type: EventType;
  wallet: Wallet;
  returnUnused: boolean;
  allowFunding: boolean;
  usesLoan: boolean;
  loanIds: string[];
  loan: string;
  onSetReturnUnused: (checked: boolean) => void;
  onSetFunding: (funding: string) => void;
  onSetLoan: (loanId: string) => void;
  renderInput: (key: string, label: string, props?: React.InputHTMLAttributes<HTMLInputElement>) => ReactNode;
}

export function LoanFunding({
  type,
  wallet,
  returnUnused,
  allowFunding,
  usesLoan,
  loanIds,
  loan,
  onSetReturnUnused,
  onSetFunding,
  onSetLoan,
  renderInput,
}: LoanFundingProps) {
  return (
    <>
      {["repay", "receive"].includes(type) && (
        <div className="form-grid">
          {renderInput("interest", "Interest (₹)", {
            inputMode: "decimal",
            placeholder: "0.00",
          })}
          {type === "repay" &&
            renderInput("fee", "Fee (₹)", {
              inputMode: "decimal",
              placeholder: "0.00",
            })}
        </div>
      )}

      {type === "repay" && (
        <label className="check">
          <input
            type="checkbox"
            checked={returnUnused}
            onChange={(e) => onSetReturnUnused(e.target.checked)}
          />
          <span>Return unused reserved principal</span>
        </label>
      )}

      {allowFunding && loanIds.length > 0 && (
        <fieldset className="funding-choice">
          <legend>Funding source</legend>
          <div className="segmented">
            {["own", "loan"].map((choice) => (
              <label key={choice}>
                <input
                  type="radio"
                  name="funding"
                  value={choice}
                  checked={(usesLoan ? "loan" : "own") === choice}
                  disabled={type === "release" || (type === "repay" && returnUnused)}
                  onChange={() => onSetFunding(choice)}
                />
                {choice === "own" ? "Own" : "Loan"}
              </label>
            ))}
          </div>

          {usesLoan && loanIds.length > 1 && (
            <Field label="Which loan?">
              <select
                value={loan}
                required
                onChange={(e) => onSetLoan(e.target.value)}
              >
                <option value="" disabled>
                  Choose loan
                </option>
                {loanIds.map((id) => (
                  <option key={id} value={id}>
                    {wallet.accounts.find((a) => a.id === id)?.name}
                  </option>
                ))}
              </select>
            </Field>
          )}
        </fieldset>
      )}
    </>
  );
}

