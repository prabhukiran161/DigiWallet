import { ChevronRight, ArrowUpRight } from "lucide-react";
import { balance, availableBalance, type Wallet, type Account } from "@/lib/ledger";
import { currency, labels } from "@/lib/display";
import { ACCOUNT_ICONS } from "./types";
import { findInstitution } from "@/lib/institutions";
import { InstitutionMark, useInstitutionCatalog } from "../institution-brand";
import styles from "./home-account-carousel.module.css";

interface AccountCardProps {
  account: Account;
  wallet: Wallet;
  hidden?: boolean;
  compact?: boolean;
  onSelect: () => void;
}

export function AccountCard({
  account,
  wallet,
  hidden,
  compact = false,
  onSelect,
}: AccountCardProps) {
  const Icon = ACCOUNT_ICONS[account.type];
  const institution = findInstitution(useInstitutionCatalog(), account.institution, account.type);
  const b = balance(wallet, account.id);
  const title = institution?.name || account.institution || labels[account.type];
  const mark = <InstitutionMark src={institution?.logoUrl}><Icon size={21} /></InstitutionMark>;
  const amount = (n: number) => (hidden ? "••••" : currency(n));

  if (compact) {
    const isCreditCard = account.type === "card";
    const displayedAmount = isCreditCard ? availableBalance(wallet, account) : b;
    return (
      <button type="button" onClick={onSelect}
        className={`${styles.card} relative isolate flex w-full flex-col overflow-hidden rounded-[25px] border p-4 text-left`}>
        <span className="flex w-full items-center gap-2.5">
          <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-[var(--soft)] text-[var(--blue)]">
            {mark}
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-[10px] text-[var(--muted)]">{title}</span>
            <strong className="block truncate text-[13px]">{account.name}</strong>
          </span>
          <ChevronRight size={17} className="text-[var(--muted)]" aria-hidden />
        </span>
        <strong className="my-2.5 block w-full text-[24px] leading-tight tracking-tight [overflow-wrap:anywhere]">
          {isCreditCard && <span className="sr-only">Available credit: </span>}
          {amount(displayedAmount)}
        </strong>
        <span className="mt-auto self-start rounded-full bg-[var(--soft)] px-2 py-0.5 text-[10px] font-semibold text-[var(--blue)]">
          {labels[account.type]}
        </span>
      </button>
    );
  }

  const funding = wallet.allocations.filter((f) => f.loan === account.id);

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
          {mark}
        </span>
        <span>{title}</span>
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

