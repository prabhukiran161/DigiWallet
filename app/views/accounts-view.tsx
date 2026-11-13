import { Plus } from "lucide-react";
import { balance, type Wallet, type EventType } from "@/lib/ledger";
import { currency } from "@/lib/display";
import { Empty, type Save } from "../components/primitives";
import { AccountCards } from "../components/accounts";
import { ACCOUNT_FILTERS, type AccountFilter } from "./types";

interface AccountsViewProps {
  wallet: Wallet;
  month: string;
  filter: AccountFilter;
  onSelectFilter: (filter: AccountFilter) => void;
  save: Save;
  onRecord: (type: EventType) => void;
  onOpenAddAccount: () => void;
}

export function AccountsView({
  wallet,
  month,
  filter,
  onSelectFilter,
  save,
  onRecord,
  onOpenAddAccount,
}: AccountsViewProps) {
  const active = wallet.accounts.filter((a) => !a.archived && !a.closedAt);
  const accounts = active.filter(
    (a) =>
      filter === "All" ||
      (filter === "Bank & cash" && ["bank", "cash"].includes(a.type)) ||
      (filter === "Cards" && a.type === "card") ||
      (filter === "Investments" && a.type === "investment") ||
      (filter === "Borrowed" && a.type === "loan") ||
      (filter === "Lent" && a.type === "receivable"),
  );

  const initialAccount =
    typeof window !== "undefined"
      ? new URLSearchParams(window.location.search).get("account") || ""
      : "";

  return (
    <>
      <div className="chips" aria-label="Account types">
        {ACCOUNT_FILTERS.map((f) => (
          <button
            key={f}
            aria-pressed={filter === f}
            className={filter === f ? "selected" : ""}
            onClick={() => onSelectFilter(f)}
          >
            {f}
          </button>
        ))}
      </div>

      {["Borrowed", "Lent", "Investments"].includes(filter) && (
        <div className="section-total">
          <span>
            {filter === "Borrowed"
              ? "Total outstanding"
              : filter === "Lent"
                ? "Owed to you"
                : "Recorded value"}
          </span>
          <strong>
            {currency(
              accounts.reduce((n, a) => n + balance(wallet, a.id), 0),
            )}
          </strong>
          <button
            className="primary soft"
            onClick={() =>
              onRecord(
                filter === "Borrowed"
                  ? "borrow"
                  : filter === "Lent"
                    ? "lend"
                    : "invest",
              )
            }
          >
            <Plus size={16} />
            {filter === "Borrowed"
              ? "Borrow money"
              : filter === "Lent"
                ? "Lend money"
                : "Contribute"}
          </button>
        </div>
      )}

      {accounts.length ? (
        <AccountCards
          wallet={wallet}
          accounts={accounts}
          month={month}
          save={save}
          initialSelected={initialAccount}
        />
      ) : (
        <Empty title="No accounts here yet">
          <button className="primary" onClick={onOpenAddAccount}>
            <Plus size={16} />
            Add account
          </button>
        </Empty>
      )}

      {wallet.accounts.some((a) => a.archived && !a.closedAt) && (
        <details className="disclosure">
          <summary>Archived accounts</summary>
          <AccountCards
            wallet={wallet}
            accounts={wallet.accounts.filter((a) => a.archived && !a.closedAt)}
            month={month}
            save={save}
          />
        </details>
      )}
    </>
  );
}

