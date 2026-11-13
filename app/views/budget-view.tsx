import type { ReactNode } from "react";
import type { Wallet } from "@/lib/ledger";
import type { Save } from "../components/primitives";
import { BudgetView as BudgetDetails } from "../components/budgets";
import { Heatmap } from "../components/history";
import type { View } from "./types";

interface BudgetViewProps {
  wallet: Wallet;
  month: string;
  monthControl: ReactNode;
  save: Save;
  onNavigate: (view: View) => void;
  onSetDay: (day: string) => void;
}

export function BudgetView({
  wallet,
  month,
  monthControl,
  save,
  onNavigate,
  onSetDay,
}: BudgetViewProps) {
  return (
    <>
      <div className="section-head">
        <span className="section-subtitle">Make it a good month</span>
        {monthControl}
      </div>

      <BudgetDetails key={month} wallet={wallet} month={month} save={save} />

      <Heatmap
        wallet={wallet}
        month={month}
        onDay={(d) => {
          onNavigate("Activity");
          onSetDay(d);
        }}
      />
    </>
  );
}

