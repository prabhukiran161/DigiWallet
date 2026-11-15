"use client";

import { useId, useRef, useState, type ReactNode } from "react";
import { CalendarDays, ChevronDown, ChevronLeft, ChevronRight, X } from "lucide-react";
import styles from "./reporting-month-picker.module.css";

const monthNames = Array.from({ length: 12 }, (_, index) =>
  new Intl.DateTimeFormat("en-IN", { month: "long", timeZone: "UTC" })
    .format(new Date(Date.UTC(2024, index, 1))),
);

export function ReportingMonthPicker({ caption, month, onChangeMonth, onSetMonth, summary }: {
  caption?: string;
  month: string;
  onChangeMonth?: (delta: number) => void;
  onSetMonth: (month: string) => void;
  summary?: ReactNode;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const [selectedYear, selectedMonth] = month.split("-").map(Number);
  const [year, setYear] = useState(selectedYear);

  function openPicker() {
    setYear(selectedYear);
    dialog.current?.showModal();
  }

  return (
    <div className={summary ? styles.summaryBar : styles.toolbar}>
      {caption && <span className={styles.caption}>{caption}</span>}
      <div className={styles.controls}>
        {onChangeMonth && <button type="button" aria-label="Previous month" onClick={() => onChangeMonth(-1)}>
          <ChevronLeft size={16} />
        </button>}
        <button type="button" className={styles.trigger} aria-haspopup="dialog"
          aria-label={`Select month, ${monthNames[selectedMonth - 1]} ${selectedYear}`} onClick={openPicker}>
          {summary && <span className={styles.calendarIcon}><CalendarDays size={18} aria-hidden /></span>}
          <span className={styles.fullMonth}>{monthNames[selectedMonth - 1]}, {selectedYear}</span>
          <span className={styles.shortMonth}>{monthNames[selectedMonth - 1]?.slice(0, 3)} {selectedYear}</span>
          {summary ? <ChevronDown size={15} aria-hidden /> : <CalendarDays size={17} aria-hidden />}
        </button>
        {onChangeMonth && <button type="button" aria-label="Next month" onClick={() => onChangeMonth(1)}>
          <ChevronRight size={16} />
        </button>}
      </div>
      {summary}
      <dialog ref={dialog} className={styles.picker} aria-labelledby={titleId}>
        <div className={styles.heading}>
          <h2 id={titleId}>Select Month</h2>
          <button type="button" aria-label="Close month picker" onClick={() => dialog.current?.close()}>
            <X size={19} />
          </button>
        </div>
        <div className={styles.year}>
          <button type="button" aria-label="Previous year" disabled={year <= 1} onClick={() => setYear(year - 1)}>
            <ChevronLeft size={17} />
          </button>
          <strong aria-live="polite">{year}</strong>
          <button type="button" aria-label="Next year" disabled={year >= 9999} onClick={() => setYear(year + 1)}>
            <ChevronRight size={17} />
          </button>
        </div>
        <div className={styles.months}>
          {monthNames.map((name, index) => (
            <button type="button" key={name} aria-pressed={year === selectedYear && index + 1 === selectedMonth}
              onClick={() => {
                onSetMonth(`${String(year).padStart(4, "0")}-${String(index + 1).padStart(2, "0")}`);
                dialog.current?.close();
              }}>
              {name}
            </button>
          ))}
        </div>
      </dialog>
    </div>
  );
}
