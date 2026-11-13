"use client";
import type { Wallet } from "@/lib/ledger";
import { localDate } from "@/lib/ledger";
import { currency } from "@/lib/display";
import { InfoNote } from "../primitives";

type HeatmapProps = {
  wallet: Wallet;
  month: string;
  onDay: (day: string) => void;
};

export function Heatmap({ wallet, month, onDay }: HeatmapProps) {
  const [year, m] = month.split("-").map(Number);
  const count = new Date(year, m, 0).getDate();
  const offset = new Date(year, m - 1, 1).getDay();

  const days = Array.from({ length: count }, (_, i) => {
    const date = `${month}-${String(i + 1).padStart(2, "0")}`;
    return {
      date,
      value: wallet.events
        .filter((e) => localDate(e.date, wallet.timezone) === date)
        .reduce((s, e) => s + e.expense, 0),
    };
  });

  const max = Math.max(...days.map((d) => d.value), 1);

  return (
    <section className="panel heatmap-panel">
      <div className="section-head">
        <h2>Spending days</h2>
        <span className="pill">{days.filter((d) => d.value > 0).length} active</span>
      </div>
      <div className="heatmap">
        {["S", "M", "T", "W", "T", "F", "S"].map((d, i) => (
          <span className="weekday" key={i}>
            {d}
          </span>
        ))}
        {Array.from({ length: offset }, (_, i) => (
          <span key={`blank${i}`} />
        ))}
        {days.map((d, i) => (
          <button
            key={d.date}
            className={`heat heat-${
              d.value < 0 ? "refund" : d.value === 0 ? 0 : Math.ceil((d.value / max) * 4)
            }`}
            onClick={() => onDay(d.date)}
            aria-label={`${d.date}: ${currency(d.value)} expenses. View transactions.`}
            title={`${d.date} · ${currency(d.value)}`}
          >
            <span>{i + 1}</span>
            {d.value < 0 && <small>↙</small>}
          </button>
        ))}
      </div>
      <div className="heat-legend">
        <span>Less</span>
        {[0, 1, 2, 3, 4].map((n) => (
          <i key={n} className={`heat-${n}`} />
        ))}
        <span>More</span>
        <span className="refund-key">↙ Refund</span>
      </div>
      <InfoNote label="About this view">
        Tap a day for its transactions. Shading is relative to this month’s highest
        spending day; refunds reduce spending on their receipt date.
      </InfoNote>
    </section>
  );
}

