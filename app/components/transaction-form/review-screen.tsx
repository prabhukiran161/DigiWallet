import { Check, ChevronLeft } from "lucide-react";
import { balance, summary, type Wallet, type Command, type EventType } from "@/lib/ledger";
import { currency, labels } from "@/lib/display";
import { InfoNote } from "../primitives";

interface ReviewScreenProps {
  wallet: Wallet;
  preview?: Wallet;
  command: Command;
  editing: boolean;
  busy: boolean;
  type: EventType;
  description: string;
  error: string;
  previewError: string;
  onBack: () => void;
  onConfirm: () => void;
}

export function ReviewScreen({
  wallet,
  preview,
  command,
  editing,
  busy,
  type,
  description,
  error,
  previewError,
  onBack,
  onConfirm,
}: ReviewScreenProps) {
  const changed = preview?.accounts.filter(
    (a) =>
      !wallet.accounts.some((old) => old.id === a.id) ||
      balance(preview, a.id) !== balance(wallet, a.id),
  );

  return (
    <div className="review-screen">
      <button className="text-button" disabled={busy} onClick={onBack}>
        <ChevronLeft size={16} />
        Edit details
      </button>

      <div className="review-heading">
        <span className="review-icon">
          <Check size={26} />
        </span>
        <h3>{editing ? "Review changes" : "Ready to record"}</h3>
        <p>{description}</p>
      </div>

      <div className="review-meta">
        <span>{labels[type]}</span>
        <span>{new Date(command.date).toLocaleDateString("en-IN")}</span>
      </div>

      {preview && (
        <section className="preview" aria-label="Balance preview">
          <h3>Balances after</h3>
          {changed?.map((a) => (
            <div key={a.id}>
              <span>{a.name}</span>
              <strong>{currency(balance(preview, a.id))}</strong>
            </div>
          ))}
          <div className="preview-total">
            <span>Available balance</span>
            <strong>{currency(summary(preview, "").available)}</strong>
          </div>
          <div>
            <span>Net worth</span>
            <strong>{currency(summary(preview, "").netWorth)}</strong>
          </div>
          {command.allocation && (
            <div>
              <span>Remaining reservation</span>
              <strong>
                {currency(
                  preview.allocations.find((f) => f.id === command.allocation)
                    ?.remaining || 0,
                )}
              </strong>
            </div>
          )}
        </section>
      )}

      {type === "borrow" && (
        <InfoNote label="Your bank and loan update together">
          The selected bank receives the funds. A linked loan records what you
          owe. Borrowing does not increase your net worth.
        </InfoNote>
      )}

      {(error || previewError) && (
        <p role="alert" className="error">
          {error || previewError}
        </p>
      )}

      <div className="form-footer">
        <button
          className="primary full"
          disabled={busy || !preview}
          onClick={onConfirm}
        >
          {busy
            ? "Saving…"
            : editing
              ? "Save changes"
              : "Confirm transaction"}
          <Check size={18} />
        </button>
      </div>
    </div>
  );
}
