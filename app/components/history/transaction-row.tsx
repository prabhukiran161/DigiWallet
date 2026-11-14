"use client";
import { useRef, useState } from "react";
import {
  ArrowDownLeft,
  ArrowUpRight,
  ArrowLeftRight,
  Pencil,
} from "lucide-react";
import {
  availableBalance,
  withinEditWindow,
  type Wallet,
  type Journal,
} from "@/lib/ledger";
import { currency, labels } from "@/lib/display";
import { CategoryIcon } from "../category-icon";
import { amountLabel } from "./utils";

type TransactionRowProps = {
  wallet: Wallet;
  event: Journal;
  account: string;
  hidden: boolean;
  compact: boolean;
  month: string;
};

export function TransactionRow({
  wallet,
  event: e,
  account,
  hidden,
  compact,
  month,
}: TransactionRowProps) {
  const [offset, setOffset] = useState(0);
  const gesture = useRef({ x: 0, y: 0, start: 0, moved: false });
  const editable = !compact && !!e.command && withinEditWindow(e.recordedAt);
  const a = wallet.accounts.find((a) => a.id === account);
  const href = `/transactions/${encodeURIComponent(e.id)}?account=${encodeURIComponent(account)}&month=${month}`;

  return (
    <div className="swipe-row">
      {editable && (
        <a
          className="swipe-edit"
          href={href + "&edit=1"}
          tabIndex={offset < -30 ? 0 : -1}
          aria-hidden={offset >= -30}
        >
          <Pencil size={19} />
          <span>Edit</span>
        </a>
      )}
      <a
        href={href}
        className="transaction-row"
        style={{ transform: `translateX(${offset}px)` }}
        onPointerDown={(ev) => {
          gesture.current = {
            x: ev.clientX,
            y: ev.clientY,
            start: offset,
            moved: false,
          };
        }}
        onPointerMove={(ev) => {
          if (!editable || (!ev.buttons && ev.pointerType === "mouse")) return;
          const dx = ev.clientX - gesture.current.x;
          const dy = ev.clientY - gesture.current.y;
          if (Math.abs(dx) > 12 && Math.abs(dx) > Math.abs(dy)) {
            gesture.current.moved = true;
            setOffset(Math.max(-76, Math.min(0, gesture.current.start + dx)));
          }
        }}
        onPointerUp={() => setOffset(offset < -35 ? -76 : 0)}
        onPointerCancel={() => setOffset(0)}
        onClick={(ev) => {
          if (gesture.current.moved) {
            ev.preventDefault();
            gesture.current.moved = false;
          }
        }}
      >
        <span
          className={`transaction-icon ${
            e.expense > 0
              ? "category-" + e.category
              : e.inflow > 0
                ? "income"
                : "transfer"
          }`}
        >
          {e.expense > 0 ? (
            <CategoryIcon category={e.category} wallet={wallet} />
          ) : e.inflow > 0 ? (
            <ArrowDownLeft size={19} />
          ) : e.outflow > 0 ? (
            <ArrowUpRight size={19} />
          ) : (
            <ArrowLeftRight size={19} />
          )}
        </span>
        <span className="transaction-description">
          <strong>{e.description}</strong>
          <small>
            {new Date(e.date).toLocaleDateString("en-IN", {
              day: "numeric",
              month: "short",
              timeZone: wallet.timezone,
            })}{" "}
            ·{" "}
            {new Date(e.date).toLocaleTimeString("en-IN", {
              hour: "2-digit",
              minute: "2-digit",
              timeZone: wallet.timezone,
            })}
          </small>
          <span className="category-tag">
            {wallet.categories.find((c) => c.id === e.category)?.name ||
              labels[e.type]}
          </span>
        </span>
        <span className={`transaction-value ${e.inflow > 0 ? "positive" : ""}`}>
          <strong>{hidden ? "••••" : amountLabel(e, account)}</strong>
          {!compact && a && (
            <small>
              {a.type === "card"
                ? "Credit left"
                : a.type === "loan"
                  ? "Debt"
                  : "Balance"}
              <br />
              {hidden
                ? "••••"
                : currency(availableBalance(wallet, a, e.date, e))}
            </small>
          )}
        </span>
      </a>
    </div>
  );
}
