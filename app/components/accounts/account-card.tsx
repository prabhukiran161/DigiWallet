import { ChevronRight, ArrowUpRight } from "lucide-react";
import { balance, availableBalance, type Wallet, type Account } from "@/lib/ledger";
import { currency, labels } from "@/lib/display";
import { ACCOUNT_ICONS } from "./types";

interface AccountCardProps {
  account: Account;
  wallet: Wallet;
  hidden?: boolean;
  onSelect: () => void;
}

export function AccountCard({
  account,
  wallet,
  hidden,
  onSelect,
}: AccountCardProps) {
  const Icon = ACCOUNT_ICONS[account.type];
  const b = balance(wallet, account.id);
  const funding = wallet.allocations.filter((f) => f.loan === account.id);
  const amount = (n: number) => (hidden ? "••••" : currency(n));

  const typeLabel =
    account.type === "card" || account.type === "loan"
      ? "Outstanding"
      : account.type === "investment"
        ? "Recorded value"
        : account.type === "receivable"
          ? "Owed to you"
          : "Balance";

  return (
    <button
      className={`account-card account-${account.type}`}
      onClick={onSelect}
    >
      <div className="account-top">
        <span className="account-logo">
          <Icon size={21} />
        </span>
        <span>{account.institution || labels[account.type]}</span>
        <ArrowUpRight size={16} />
      </div>

      <h3>{account.name}</h3>
      <span className="account-label">
        {typeLabel}
        {account.archived ? " · archived" : ""}
      </span>
      <strong className="account-amount">{amount(b)}</strong>

      <div className="account-foot">
        {account.type === "card" ? (
          <>
            <span>Available credit</span>
            <strong>{amount(availableBalance(wallet, account))}</strong>
          </>
        ) : account.type === "loan" ? (
          <>
            <span>Purpose funding</span>
            <strong>
              {amount(
                funding.reduce((s, f) => s + f.remaining - f.committed, 0),
              )}
            </strong>
          </>
        ) : (
          <>
            <span>{labels[account.type]}</span>
            <ChevronRight size={14} />
          </>
        )}
      </div>
    </button>
  );
}

