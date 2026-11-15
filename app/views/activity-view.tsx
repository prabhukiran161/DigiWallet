import type { Wallet } from "@/lib/ledger";
import { History, Heatmap } from "../components/history";
import { ReportingMonthPicker } from "../components/layout/reporting-month-picker";

interface ActivityViewProps {
  wallet: Wallet;
  month: string;
  day: string;
  onChangeMonth: (delta: number) => void;
  onSetMonth: (month: string) => void;
  onSetDay: (day: string) => void;
}

export function ActivityView({
  wallet,
  month,
  day,
  onChangeMonth,
  onSetMonth,
  onSetDay,
}: ActivityViewProps) {
  return (
    <>
      <ReportingMonthPicker caption="Where All Your Money Moves" month={month}
        onChangeMonth={onChangeMonth} onSetMonth={onSetMonth} />

      <Heatmap wallet={wallet} month={month} selectedDay={day}
        onDay={(date) => onSetDay(date === day ? "" : date)} />

      <History
        activity
        wallet={wallet}
        month={month}
        day={day}
        onClearDay={() => onSetDay("")}
      />

    </>
  );
}

