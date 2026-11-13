import type { ReactNode } from "react";
import type { Wallet } from "@/lib/ledger";
import { History, Heatmap } from "../components/history";

interface ActivityViewProps {
  wallet: Wallet;
  month: string;
  day: string;
  monthControl: ReactNode;
  onSetDay: (day: string) => void;
}

export function ActivityView({
  wallet,
  month,
  day,
  monthControl,
  onSetDay,
}: ActivityViewProps) {
  return (
    <>
      <div className="section-head">
        <span className="section-subtitle">All your money moves</span>
        {monthControl}
      </div>

      <History
        wallet={wallet}
        month={month}
        day={day}
        onClearDay={() => onSetDay("")}
      />

      <Heatmap
        wallet={wallet}
        month={month}
        onDay={(d) => {
          onSetDay(d);
          window.scrollTo({ top: 0, behavior: "smooth" });
        }}
      />
    </>
  );
}

