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
  ArrowDown,
  ArrowUp,
  Lock,
} from "lucide-react";
import balanceStyles from "./balance-card.module.css";
import accountsPanel from "./home-accounts-panel.module.css";
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
      <section
        aria-label="Wallet balance"
        className={`${balanceStyles.card} relative isolate flex flex-col justify-center overflow-hidden rounded-[25px] px-5 py-5 text-white`}
      >
        <div
          aria-hidden="true"
          className={`${balanceStyles.sheen} pointer-events-none absolute inset-0 -z-10`}
        />
        <div
          aria-hidden="true"
          className={`${balanceStyles.waves} pointer-events-none absolute inset-0 -z-10`}
        />
        <div className="flex items-center gap-2 text-sm font-semibold">
          <span
            className={`${balanceStyles.highlightText} text-[15px] font-semibold`}
          >
            Available balance
          </span>
          <button
            type="button"
            className="grid size-8 place-items-center rounded-full bg-white/15"
            onClick={onToggleHidden}
            aria-label={hidden ? "Show balances" : "Hide balances"}
            aria-pressed={hidden}
          >
            {hidden ? <EyeOff size={17} /> : <Eye size={17} />}
          </button>
        </div>
        <strong
          className={`${balanceStyles.highlightText} mt-1 block text-[clamp(27px,8vw,40px)] leading-tight font-extrabold tracking-tight [overflow-wrap:anywhere]`}
        >
          {amount(s.available)}
        </strong>
        <div
          className="mt-3 grid grid-cols-2 gap-2"
          role="group"
          aria-label="Selected month cash flow"
        >
          {[
            { label: "Inflow", value: s.inflow, Icon: ArrowDown },
            { label: "Outflow", value: s.outflow, Icon: ArrowUp },
          ].map(({ label, value, Icon }) => (
            <div
              key={label}
              className={`${balanceStyles.flow} flex min-w-0 items-center gap-2.5 rounded-2xl px-2 py-1.5`}
            >
              <span
                className={`${balanceStyles.flowIcon} grid size-7 shrink-0 place-items-center rounded-full`}
              >
                <Icon size={18} aria-hidden />
              </span>
              <span className="min-w-0 text-[clamp(12px,3.3vw,14px)] leading-tight font-semibold [overflow-wrap:anywhere]">
                {label}{" "}
                <strong className="inline-block max-w-full font-bold">
                  {amount(value)}
                </strong>
              </span>
            </div>
          ))}
        </div>
        <div className="mt-3 grid grid-cols-2 divide-x divide-white/35 border-t border-white/35 pt-3">
          {[
            {
              label: "Net worth",
              value: s.netWorth,
              Icon: ChartNoAxesCombined,
            },
            { label: "Reserved", value: s.reserved, Icon: Lock },
          ].map(({ label, value, Icon }) => (
            <div key={label} className="flex min-w-0 items-center gap-2 px-2">
              <Icon size={22} aria-hidden />
              <span className="min-w-0 text-[11px] leading-tight">
                {label}
                <strong className="mt-1 block text-base leading-tight font-bold [overflow-wrap:anywhere]">
                  {amount(value)}
                </strong>
              </span>
            </div>
          ))}
        </div>
      </section>

      <div
        role="group"
        aria-label="Wallet actions"
        className={`${accountsPanel.actions} mx-auto mt-5 grid min-h-24 w-[98%] grid-cols-4 overflow-hidden rounded-[14px] border bg-white`}
      >
        {[
          {
            label: "Credit",
            Icon: ArrowDownLeft,
            run: () => onRecord("income"),
          },
          {
            label: "Debit",
            Icon: ArrowUpRight,
            run: () => onRecord("expense"),
          },
          {
            label: "Transfer",
            Icon: ArrowLeftRight,
            run: () => onRecord("transfer"),
          },
          {
            label: "Loans",
            Icon: WalletCards,
            run: () => {
              onFilterAccounts("Borrowed");
              onNavigate("Accounts");
            },
          },
        ].map(({ label, Icon, run }) => (
          <button
            key={label}
            type="button"
            onClick={run}
            className={`${accountsPanel.action} flex min-w-0 flex-col items-center justify-center gap-2.5 py-3`}
          >
            <Icon size={24} strokeWidth={2.5} aria-hidden />
            {label}
          </button>
        ))}
      </div>
      <div
        className={`${accountsPanel.heading} mt-5 mb-2 flex flex-wrap items-center justify-between gap-x-2 gap-y-1`}
      >
        <h2 className="flex items-center gap-2 text-[clamp(17px,5.4vw,28px)] leading-[1.3] font-black tracking-[-0.3px]">
          My Accounts
          <span
            className={`${accountsPanel.count} grid min-h-6 min-w-6 place-items-center rounded-lg border px-1.5 text-[clamp(12px,3.4vw,16px)] font-semibold`}
          >
            {active.length}
          </span>
        </h2>
        <button
          type="button"
          className={`${accountsPanel.seeAll} inline-flex min-h-8 shrink-0 items-center gap-1.5`}
          onClick={() => {
            onFilterAccounts("All");
            onNavigate("Accounts");
          }}
        >
          See All <ArrowRight size={18} strokeWidth={2.5} aria-hidden />
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
