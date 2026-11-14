"use client";

import { useLayoutEffect, useRef, useState } from "react";
import {
  ArrowLeftRight, CalendarDays, ChartNoAxesColumn, Coins, CreditCard,
  Download, HandCoins, Package, RotateCcw, ShoppingCart,
} from "lucide-react";
import type { EventType } from "@/lib/ledger";

const PAGE_SIZE = 5;
const pickerLabels: Record<EventType, string> = {
  expense: "Expense",
  transfer: "Transfer",
  lend: "Lending",
  repay: "Loan Payment",
  invest: "Investment",
  cardPayment: "Card Payment",
  release: "Release Hold",
  income: "Income",
  borrow: "Borrowing",
  receive: "Repayment",
  refund: "Refund",
  capitalReturn: "Capital Return",
};

const icons = {
  income: Download,
  borrow: Coins,
  receive: ArrowLeftRight,
  refund: Package,
  capitalReturn: RotateCcw,
  expense: ShoppingCart,
  transfer: ArrowLeftRight,
  lend: HandCoins,
  repay: CalendarDays,
  invest: ChartNoAxesColumn,
  cardPayment: CreditCard,
  release: RotateCcw,
};

interface TransactionTypePickerProps {
  types: EventType[];
  selected: EventType;
  onSelect: (type: EventType) => void;
}

export function TransactionTypePicker({ types, selected, onSelect }: TransactionTypePickerProps) {
  const viewport = useRef<HTMLDivElement>(null);
  const initialPage = useRef(Math.floor(Math.max(0, types.indexOf(selected)) / PAGE_SIZE));
  const [page, setPage] = useState(initialPage.current);
  const pageCount = Math.ceil(types.length / PAGE_SIZE);

  useLayoutEffect(() => {
    const strip = viewport.current;
    if (strip) strip.scrollLeft = initialPage.current * strip.clientWidth;
  }, []);

  function showPage(index: number) {
    const strip = viewport.current;
    if (!strip || index < 0 || index >= pageCount) return;
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    strip.scrollTo({ left: index * strip.clientWidth, behavior: reducedMotion ? "instant" : "smooth" });
  }

  return (
    <div role="group" aria-label="Transaction type" className="min-w-0"
      onKeyDown={(event) => {
        if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
        event.preventDefault();
        showPage(page + (event.key === "ArrowRight" ? 1 : -1));
      }}>
      <div ref={viewport}
        className="flex snap-x snap-mandatory overflow-x-auto overscroll-x-contain [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        onScroll={(event) => {
          const strip = event.currentTarget;
          if (strip.clientWidth) setPage(Math.round(strip.scrollLeft / strip.clientWidth));
        }}>
        {Array.from({ length: pageCount }, (_, index) => (
          <div key={index} className="grid w-full shrink-0 snap-start snap-always grid-cols-5 items-start gap-1.5 px-1 py-1">
            {types.slice(index * PAGE_SIZE, (index + 1) * PAGE_SIZE).map((type) => {
              const Icon = icons[type];
              return (
                <button key={type} type="button" aria-pressed={selected === type}
                  onClick={() => onSelect(type)}
                  className="group flex min-w-0 flex-col items-center gap-2 rounded-xl aria-pressed:text-[var(--blue)]">
                  <span className="grid aspect-square w-full max-w-13 place-items-center rounded-xl border border-[var(--line)] group-aria-pressed:border-[var(--blue)] group-aria-pressed:bg-[var(--soft)]">
                    <Icon size={20} aria-hidden />
                  </span>
                  <span className="line-clamp-2 min-h-10 w-full text-center text-[14px] leading-5 font-normal [overflow-wrap:anywhere]">
                    {pickerLabels[type]}
                  </span>
                </button>
              );
            })}
          </div>
        ))}
      </div>
      {pageCount > 1 && (
        <div className="flex justify-center">
          {Array.from({ length: pageCount }, (_, index) => (
            <button key={index} type="button" onClick={() => showPage(index)}
              aria-label={`Show transaction types page ${index + 1} of ${pageCount}`}
              aria-current={page === index ? "true" : undefined}
              className="grid h-6 w-6 place-items-center rounded-full">
              <span className={`h-1.5 w-2.5 rounded-full ${page === index ? "bg-[var(--blue)]" : "bg-slate-200"}`} />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
