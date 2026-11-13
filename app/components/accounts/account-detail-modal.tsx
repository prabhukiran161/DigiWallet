import { useState } from "react";
import {
  balance,
  localDate,
  availableBalance,
  creditLimitAt,
  type Wallet,
  type Account,
} from "@/lib/ledger";
import { currency, labels } from "@/lib/display";
import { AccountForm } from "../account-form";
import { History } from "../history";
import { Modal, InfoNote, type Save } from "../primitives";
import { AccountFunding } from "./account-funding";
import { AccountSettings } from "./account-settings";

interface AccountDetailModalProps {
  account: Account;
  wallet: Wallet;
  month: string;
  save: Save;
  hidden?: boolean;
  onClose: () => void;
}

export function AccountDetailModal({
  account: detail,
  wallet,
  month,
  save,
  hidden,
  onClose,
}: AccountDetailModalProps) {
  const [editing, setEditing] = useState(false);
  const [historyMonth, setHistoryMonth] = useState(month);
  const [mode, setMode] = useState<"all" | "usage" | "repayments">("all");
  const [error, setError] = useState("");

  const amount = (n: number) => (hidden ? "••••" : currency(n));
  const allocations = wallet.allocations.filter((f) => f.loan === detail.id);
  const isOverLimit =
    detail.type === "card" && balance(wallet, detail.id) > creditLimitAt(detail);

  return (
    <Modal
      title={editing ? "Edit account" : detail.name}
      onClose={onClose}
    >
      {editing ? (
        <AccountForm
          account={detail}
          wallet={wallet}
          save={save}
          onDone={() => setEditing(false)}
        />
      ) : (
        <>
          <div className="detail-summary">
            <span>
              {detail.type === "loan" ? "Loan outstanding" : labels[detail.type]}
            </span>
            <strong>{amount(balance(wallet, detail.id))}</strong>
            {detail.counterparty && (
              <span className="detail-counterparty">{detail.counterparty}</span>
            )}
            {detail.purpose && (
              <span className="purpose-pill">{detail.purpose}</span>
            )}
          </div>

          {detail.dueDate && (
            <div className="due-row">
              <span>Due {detail.dueDate}</span>
              {detail.dueDate < localDate(new Date().toISOString(), wallet.timezone) &&
                balance(wallet, detail.id) > 0 && (
                  <span className="overdue">Overdue</span>
                )}
            </div>
          )}

          {detail.type === "card" && (
            <div className="metric-pair">
              <div>
                <span>Credit limit</span>
                <strong>{amount(creditLimitAt(detail))}</strong>
              </div>
              <div>
                <span>Available</span>
                <strong>{amount(availableBalance(wallet, detail))}</strong>
              </div>
            </div>
          )}

          {allocations.map((f) => (
            <AccountFunding
              key={f.id}
              allocation={f}
              wallet={wallet}
              hidden={hidden}
            />
          ))}

          {detail.type === "loan" && (
            <>
              <InfoNote label="Funding vs. repayment">
                Spending loan funds reduces your payment account once. Only
                principal repayments reduce the loan outstanding.
              </InfoNote>
              <div className="chips history-tabs">
                {(["all", "usage", "repayments"] as const).map((m) => (
                  <button
                    key={m}
                    className={mode === m ? "selected" : ""}
                    aria-pressed={mode === m}
                    onClick={() => setMode(m)}
                  >
                    {m === "all"
                      ? "All activity"
                      : m === "usage"
                        ? "Funded use"
                        : "Repayments"}
                  </button>
                ))}
              </div>
            </>
          )}

          {detail.closedAt && (
            <p className="notice">
              Closed · {new Date(detail.closedAt).toLocaleDateString("en-IN")}
            </p>
          )}

          <label className="field">
            <span>History month</span>
            <input
              type="month"
              value={historyMonth}
              onChange={(e) => e.target.value && setHistoryMonth(e.target.value)}
            />
          </label>

          <History
            wallet={wallet}
            month={historyMonth}
            account={detail.id}
            mode={mode}
            hidden={hidden}
          />

          {isOverLimit && (
            <p className="error">
              Over limit by {amount(balance(wallet, detail.id) - creditLimitAt(detail))}.
              New spending is blocked.
            </p>
          )}

          {detail.type === "card" && (
            <details className="disclosure">
              <summary>Credit-limit history</summary>
              {(
                detail.limitHistory || [
                  {
                    date: detail.date,
                    limit: detail.limit,
                    recordedAt: detail.createdAt,
                  },
                ]
              ).map((h, i) => (
                <div className="review-meta" key={i}>
                  <span>{new Date(h.date).toLocaleString("en-IN")}</span>
                  <strong>{amount(h.limit)}</strong>
                </div>
              ))}
            </details>
          )}

          {!detail.closedAt && (
            <AccountSettings
              account={detail}
              wallet={wallet}
              save={save}
              onEdit={() => setEditing(true)}
              onAccountClosedOrDeleted={onClose}
              onError={setError}
            />
          )}

          {error && (
            <p className="error" role="alert">
              {error}
            </p>
          )}
        </>
      )}
    </Modal>
  );
}

