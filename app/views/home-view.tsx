import type { ReactNode } from "react";
import {
  WalletCards,
  ArrowDownLeft,
  ArrowUpRight,
  ArrowLeftRight,
  Eye,
  EyeOff,
  ArrowRight,
  Plus,
  ChartNoAxesCombined,
  ChevronRight,
} from "lucide-react";
import { summary, type Wallet, type EventType } from "@/lib/ledger";
import { currency } from "@/lib/display";
import { Empty, InfoNote, type Save } from "../components/primitives";
import { AccountCards } from "../components/accounts";
import { History } from "../components/history";
import type { View, AccountFilter } from "./types";

interface HomeViewProps {
  wallet: Wallet;
  month: string;
  hidden: boolean;
  onToggleHidden: () => void;
  monthControl: ReactNode;
  save: Save;
  onNavigate: (view: View) => void;
  onRecord: (type: EventType) => void;
  onOpenAddAccount: () => void;
  onFilterAccounts: (filter: AccountFilter) => void;
}

export function HomeView({
  wallet,
  month,
  hidden,
  onToggleHidden,
  monthControl,
  save,
  onNavigate,
  onRecord,
  onOpenAddAccount,
  onFilterAccounts,
}: HomeViewProps) {
  const s = summary(wallet, month);
  const budget = wallet.budgets[month];
  const active = wallet.accounts.filter((a) => !a.archived && !a.closedAt);
  const amount = (n: number) => (hidden ? "••••••" : currency(n));

  return (
    <>
      <section className="balance-card">
        <div className="balance-label">
          <span>Available balance</span>
          <button
            className="balance-eye"
            onClick={onToggleHidden}
            aria-label={hidden ? "Show balances" : "Hide balances"}
            aria-pressed={hidden}
          >
            {hidden ? <EyeOff size={17} /> : <Eye size={17} />}
          </button>
        </div>
        <strong className="hero-amount">{amount(s.available)}</strong>
        <span className="balance-caption">Bank + cash</span>
        <div className="balance-rule" />
        <div className="balance-secondary">
          <div>
            <span>Net worth</span>
            <strong>{amount(s.netWorth)}</strong>
          </div>
          <div>
            <span>Reserved</span>
            <strong>{amount(s.reserved)}</strong>
          </div>
          <span className="card-symbol" aria-hidden="true">
            <WalletCards size={29} />
          </span>
        </div>
      </section>

      <div className="quick-actions">
        <button onClick={() => onRecord("income")}>
          <span>
            <ArrowDownLeft />
          </span>
          Credit
        </button>
        <button onClick={() => onRecord("expense")}>
          <span>
            <ArrowUpRight />
          </span>
          Debit
        </button>
        <button onClick={() => onRecord("transfer")}>
          <span>
            <ArrowLeftRight />
          </span>
          Transfer
        </button>
        <button
          onClick={() => {
            onFilterAccounts("Borrowed");
            onNavigate("Accounts");
          }}
        >
          <span>
            <WalletCards />
          </span>
          Loans
        </button>
      </div>

      <div className="section-head">
        <h2>
          My accounts <span className="count">{active.length}</span>
        </h2>
        <button
          className="text-button"
          onClick={() => {
            onFilterAccounts("All");
            onNavigate("Accounts");
          }}
        >
          See all
          <ArrowRight size={14} />
        </button>
      </div>

      {active.length ? (
        <AccountCards
          wallet={wallet}
          accounts={active}
          month={month}
          save={save}
          compact
          hidden={hidden}
        />
      ) : (
        <Empty title="Your wallet starts here">
          <p>Add a bank account or cash balance.</p>
          <button className="primary" onClick={onOpenAddAccount}>
            <Plus size={16} />
            Add account
          </button>
        </Empty>
      )}

      <div className="section-head month-heading">
        <h2>This month</h2>
        {monthControl}
      </div>

      <div className="flow-grid">
        <div>
          <span className="flow-icon in">
            <ArrowDownLeft size={17} />
          </span>
          <span>
            Liquid inflow<strong>{amount(s.inflow)}</strong>
          </span>
        </div>
        <div>
          <span className="flow-icon out">
            <ArrowUpRight size={17} />
          </span>
          <span>
            Liquid outflow<strong>{amount(s.outflow)}</strong>
          </span>
        </div>
      </div>

      <button className="budget-peek" onClick={() => onNavigate("Budget")}>
        <span className="budget-peek-icon">
          <ChartNoAxesCombined size={22} />
        </span>
        <span>
          <strong>
            {budget
              ? `${amount(budget.total - s.expenses)} left`
              : "Set your monthly budget"}
          </strong>
          <small>
            {budget ? "Monthly budget" : "A little plan. A clearer month."}
          </small>
        </span>
        <ChevronRight size={18} />
        {budget && (
          <progress
            max={Math.max(budget.total, s.expenses, 1)}
            value={Math.max(s.expenses, 0)}
            aria-label="Monthly budget used"
          />
        )}
      </button>

      <History
        wallet={wallet}
        month={month}
        compact
        onSeeAll={() => onNavigate("Activity")}
        hidden={hidden}
      />

      <InfoNote label="What’s included?">
        Available is bank and cash, including borrowed funds. Net worth includes
        investments and money lent, less debts. Unallocated cash:{" "}
        {amount(s.unallocated)}.
      </InfoNote>
    </>
  );
}

