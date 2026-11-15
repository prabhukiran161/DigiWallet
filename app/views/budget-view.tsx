import { ReportingMonthPicker } from "../components/layout/reporting-month-picker";
import type { Wallet } from "@/lib/ledger";
import type { Save } from "../components/primitives";
import { BudgetView as BudgetDetails } from "../components/budgets";

interface BudgetViewProps {
  wallet: Wallet;
  month: string;
  onChangeMonth: (delta: number) => void;
  onSetMonth: (month: string) => void;
  save: Save;
}

export function BudgetView({
  wallet,
  month,
  onChangeMonth,
  onSetMonth,
  save,
}: BudgetViewProps) {
  return (
    <>
      <ReportingMonthPicker caption="Make It a Good Month" month={month} onChangeMonth={onChangeMonth} onSetMonth={onSetMonth} />

      <BudgetDetails key={month} wallet={wallet} month={month} save={save} />

    </>
  );
}

