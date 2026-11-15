"use client";
import type { Wallet } from "@/lib/ledger";
import { localDate } from "@/lib/ledger";
import { currency } from "@/lib/display";
import { CalendarDays } from "lucide-react";
import styles from "./heatmap.module.css";

type HeatmapProps = {
  wallet: Wallet;
  month: string;
  selectedDay?: string;
  onDay: (day: string) => void;
};

export function Heatmap({ wallet, month, selectedDay, onDay }: HeatmapProps) {
  const [year, m] = month.split("-").map(Number);
  const count = new Date(year, m, 0).getDate();
  const offset = new Date(year, m - 1, 1).getDay();
  const monthName = new Intl.DateTimeFormat("en-IN", { month: "long" })
    .format(new Date(year, m - 1, 1));
  const spending = new Map<string, number>();
  for (const event of wallet.events) {
    if (!event.expense) continue;
    const date = localDate(event.date, wallet.timezone);
    if (date.slice(0, 7) === month) {
      spending.set(date, (spending.get(date) ?? 0) + event.expense);
    }
  }

  const days = Array.from({ length: count }, (_, i) => {
    const date = `${month}-${String(i + 1).padStart(2, "0")}`;
    return {
      date,
      value: spending.get(date) ?? 0,
    };
  });

  const max = Math.max(...days.map((d) => d.value), 1);

  return (
    <section className={styles.card} aria-label="Spending calendar">
      <div className={styles.header}>
        <h2><span className={styles.icon}><CalendarDays size={22} aria-hidden /></span>Calendar</h2>
        <span className={styles.badge}>{monthName} · {days.filter((d) => d.value > 0).length} active</span>
      </div>
      <div className={styles.grid}>
        {["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"].map((day) => (
          <span className={styles.weekday} key={day} title={day}>
            {day[0]}
          </span>
        ))}
        {Array.from({ length: offset }, (_, i) => (
          <span key={`blank${i}`} />
        ))}
        {days.map((d, i) => (
          <button
            key={d.date}
            type="button"
            className={styles.day}
            data-level={
              d.value < 0 ? "refund" : d.value === 0 ? 0 : Math.ceil((d.value / max) * 4)
            }
            onClick={() => onDay(d.date)}
            aria-pressed={selectedDay === d.date}
            aria-label={`${d.date}: ${currency(d.value)} expenses. View transactions.`}
            title={`${d.date} · ${currency(d.value)}`}
          >
            <span>{i + 1}</span>
            {d.value < 0 && <small aria-hidden>↙</small>}
          </button>
        ))}
      </div>
      <div className={styles.legend} aria-label="Spending intensity, less to more">
        <span>Less</span>
        {[0, 1, 2, 3, 4].map((n) => (
          <i key={n} data-level={n} aria-hidden />
        ))}
        <span>More</span>
        {days.some(({ value }) => value < 0) && <span className={styles.refund}>↙ Refund</span>}
      </div>
    </section>
  );
}

