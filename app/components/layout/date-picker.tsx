"use client";

import { useId, useRef, useState } from "react";
import { CalendarDays, ChevronLeft, ChevronRight, X } from "lucide-react";
import calendar from "./reporting-month-picker.module.css";
import styles from "./date-picker.module.css";

const monthFormat = new Intl.DateTimeFormat("en-IN", { month: "long", year: "numeric", timeZone: "UTC" });
const dateFormat = new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });
const weekdays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const utcDate = (date: string) => new Date(`${date}T00:00:00Z`);

export function DatePicker({ label, value, today, min, max, disabled, required, onChange }: {
  label: string;
  value: string;
  today: string;
  min?: string;
  max?: string;
  disabled?: boolean;
  required?: boolean;
  onChange: (date: string) => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const title = useId();
  const [month, setMonth] = useState(today.slice(0, 7));
  const first = utcDate(`${month}-01`);
  const last = utcDate(`${month}-01`);
  last.setUTCMonth(last.getUTCMonth() + 1, 0);

  function open() {
    const start = value || today;
    const date = min && start < min ? min : max && start > max ? max : start;
    setMonth(date.slice(0, 7));
    dialog.current?.showModal();
  }

  function moveMonth(delta: number) {
    const next = utcDate(`${month}-01`);
    next.setUTCMonth(next.getUTCMonth() + delta);
    setMonth(next.toISOString().slice(0, 7));
  }

  function choose(date: string) {
    onChange(date);
    dialog.current?.close();
  }

  return (
    <div className={styles.dateField}>
      <span>{label}</span>
      <button ref={trigger} type="button" className={styles.dateTrigger} disabled={disabled}
        aria-haspopup="dialog" aria-label={`${label}: ${value ? dateFormat.format(utcDate(value)) : "Select date"}`} onClick={open}>
        <span>{value ? dateFormat.format(utcDate(value)) : "Select date"}</span>
        <CalendarDays size={16} aria-hidden />
      </button>
      <dialog ref={dialog} className={calendar.picker} aria-labelledby={title}
        onClose={() => trigger.current?.focus({ preventScroll: true })}
        onCancel={(event) => event.stopPropagation()}>
        <div className={calendar.heading}>
          <h2 id={title}>Select Date</h2>
          <button type="button" aria-label="Close calendar" onClick={() => dialog.current?.close()}><X size={19} /></button>
        </div>
        <div className={calendar.year}>
          <button type="button" aria-label="Previous month" disabled={month <= (min?.slice(0, 7) ?? "0001-01")} onClick={() => moveMonth(-1)}>
            <ChevronLeft size={17} />
          </button>
          <strong aria-live="polite">{monthFormat.format(first)}</strong>
          <button type="button" aria-label="Next month" disabled={month >= (max?.slice(0, 7) ?? "9999-12")} onClick={() => moveMonth(1)}>
            <ChevronRight size={17} />
          </button>
        </div>
        <div className={styles.days}>
          {weekdays.map((day) => <span key={day} aria-label={day}>{day.slice(0, 1)}</span>)}
          {Array.from({ length: first.getUTCDay() }, (_, index) => <span key={index} aria-hidden />)}
          {Array.from({ length: last.getUTCDate() }, (_, index) => {
            const day = index + 1;
            const date = `${month}-${String(day).padStart(2, "0")}`;
            return <button key={date} type="button" aria-label={dateFormat.format(utcDate(date))}
              aria-pressed={date === value} aria-current={date === today ? "date" : undefined}
              disabled={Boolean((min && date < min) || (max && date > max))}
              onClick={() => choose(date)}>{day}</button>;
          })}
        </div>
        {value && !required && <button className={styles.clearDate} type="button" onClick={() => choose("")}>Clear Date</button>}
      </dialog>
    </div>
  );
}
