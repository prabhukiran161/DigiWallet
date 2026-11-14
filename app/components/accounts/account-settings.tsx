import { useState } from "react";
import { Archive } from "lucide-react";
import { accountHasActivity, type Account, type Wallet } from "@/lib/ledger";
import { nowLocal } from "@/lib/display";
import { Field, type Save } from "../primitives";
import { AmountInput } from "../amount-input";

interface AccountSettingsProps {
  account: Account;
  wallet: Wallet;
  save: Save;
  onEdit: () => void;
  onAccountClosedOrDeleted: () => void;
  onError: (err: string) => void;
}

export function AccountSettings({
  account,
  wallet,
  save,
  onEdit,
  onAccountClosedOrDeleted,
  onError,
}: AccountSettingsProps) {
  const [limitEditor, setLimitEditor] = useState(false);
  const [confirmation, setConfirmation] = useState("");
  const [busy, setBusy] = useState(false);

  const canDelete = !accountHasActivity(wallet, account.id);

  async function handleSaveLimit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const d = Object.fromEntries(new FormData(e.currentTarget));
    setBusy(true);
    onError("");
    try {
      await save("creditLimit", {
        id: account.id,
        limit: d.limit,
        date: new Date(String(d.date)).toISOString(),
      });
      setLimitEditor(false);
    } catch (err) {
      onError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function handleToggleArchive() {
    setBusy(true);
    onError("");
    try {
      await save("archive", { id: account.id });
    } catch (err) {
      onError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function handleConfirmAction() {
    setBusy(true);
    onError("");
    try {
      await save(confirmation, { id: account.id });
      onAccountClosedOrDeleted();
    } catch (err) {
      onError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <details className="disclosure">
      <summary>Account settings</summary>
      <button className="secondary full" onClick={onEdit}>
        Edit account
      </button>

      {account.type === "card" && (
        <>
          <button
            className="text-button"
            onClick={() => setLimitEditor(!limitEditor)}
          >
            Change credit limit
          </button>
          {limitEditor && (
            <form onSubmit={handleSaveLimit}>
              <Field label="New total limit (₹)">
                <AmountInput name="limit" required />
              </Field>
              <Field label="Effective date and time">
                <input
                  name="date"
                  type="datetime-local"
                  defaultValue={nowLocal()}
                  required
                />
              </Field>
              <button className="primary full" disabled={busy}>
                Save limit
              </button>
            </form>
          )}
        </>
      )}

      <button className="text-button" disabled={busy} onClick={handleToggleArchive}>
        <Archive size={16} />
        {account.archived ? "Restore account" : "Archive account"}
      </button>

      <div className="management-actions">
        <button
          className="text-button danger"
          onClick={() => setConfirmation("closeAccount")}
        >
          Close account
        </button>
        {canDelete && (
          <button
            className="text-button danger"
            onClick={() => setConfirmation("deleteAccount")}
          >
            Delete unused account
          </button>
        )}
      </div>

      {confirmation && (
        <div className="inset">
          <p>
            {confirmation === "closeAccount"
              ? "Close permanently? The balance and funding obligations must be cleared. History will remain under Profile → Closed accounts."
              : "Delete this unused account and its opening balance? A deletion record will be retained."}
          </p>
          <button
            className="secondary"
            disabled={busy}
            onClick={() => setConfirmation("")}
          >
            Cancel
          </button>
          <button
            className="primary"
            disabled={busy}
            onClick={handleConfirmAction}
          >
            Confirm
          </button>
        </div>
      )}
    </details>
  );
}

