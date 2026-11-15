"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Coins, Search, Tag } from "lucide-react";
import { labels } from "@/lib/display";
import { findInstitution } from "@/lib/institutions";
import type { Journal, Wallet } from "@/lib/ledger";
import { useInstitutionCatalog } from "../institution-brand";
import { amountLabel, transactionAccount } from "./utils";
import activityStyles from "./activity-transactions.module.css";
import styles from "./transaction-search-sheet.module.css";

function normalize(text: string) {
  return text.normalize("NFKC").trim().toLowerCase();
}

function numericAmount(text: string) {
  const clean = text.replace(/[₹,\s]/g, "").replace(/^[-+−]/, "");
  return /^\d+(?:\.\d{1,2})?$/.test(clean) ? Number(clean) : null;
}

export function TransactionSearchSheet({ wallet, events, account, renderResults, onClose }: {
  wallet: Wallet;
  events: Journal[];
  account: string;
  renderResults: (results: Journal[]) => ReactNode;
  onClose: () => void;
}) {
  const catalog = useInstitutionCatalog();
  const dialog = useRef<HTMLDialogElement>(null);
  const input = useRef<HTMLInputElement>(null);
  const drag = useRef<{ pointerId: number; startY: number } | null>(null);
  const dismissTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [dragOffset, setDragOffset] = useState(0);
  const [dragging, setDragging] = useState(false);
  const [dismissing, setDismissing] = useState(false);
  const [inputValue, setInputValue] = useState("");
  const [settled, setSettled] = useState("");
  const query = inputValue.trim();
  const pending = Boolean(query && query !== settled);
  const amount = numericAmount(settled);

  useEffect(() => {
    const sheet = dialog.current;
    const trigger = document.activeElement;
    sheet?.showModal();
    input.current?.focus({ preventScroll: true });
    return () => {
      if (dismissTimer.current !== null) clearTimeout(dismissTimer.current);
      sheet?.close();
      if (trigger instanceof HTMLElement && trigger.isConnected) trigger.focus({ preventScroll: true });
    };
  }, []);

  useEffect(() => {
    if (!query) return;
    const timer = setTimeout(() => setSettled(query), 300);
    return () => clearTimeout(timer);
  }, [query]);

  const results = useMemo(() => {
    if (!settled) return [];
    const term = normalize(settled);
    const categories = new Map(wallet.categories.map(({ id, name }) => [id, name]));
    return events.filter((event) => {
      if (amount !== null && numericAmount(amountLabel(event, account)) === amount) return true;
      const source = transactionAccount(wallet, event);
      const related = wallet.accounts.filter((item) =>
        item.id === source?.id || item.id === event.command?.target ||
        event.lines.some((line) => line.account === item.id),
      );
      const accountTerms = related.flatMap((item) => {
        const institution = findInstitution(catalog, item.institution, item.type);
        return [item.name, item.institution, institution?.id, institution?.name];
      });
      return normalize([
        event.description, event.notes, categories.get(event.category), labels[event.type],
        event.command?.counterparty, event.command?.purpose, ...accountTerms,
      ].filter(Boolean).join(" ")).includes(term);
    });
  }, [account, amount, catalog, events, settled, wallet]);

  return (
    <dialog ref={dialog} className={styles.sheet} aria-label="Search Your Transactions"
      data-dragging={dragging} data-dismissing={dismissing}
      style={{ translate: dismissing ? "0 100%" : `0 ${dragOffset}px` }}
      onCancel={(event) => { event.preventDefault(); onClose(); }}>
      <div className={styles.header}>
        <div className={styles.grip} aria-hidden="true"
          onPointerDown={(event) => {
            if (!event.isPrimary || event.button !== 0 || dismissing) return;
            event.preventDefault();
            event.currentTarget.setPointerCapture(event.pointerId);
            drag.current = { pointerId: event.pointerId, startY: event.clientY };
            setDragging(true);
          }}
          onPointerMove={(event) => {
            if (drag.current?.pointerId === event.pointerId) {
              setDragOffset(Math.max(0, event.clientY - drag.current.startY));
            }
          }}
          onPointerUp={(event) => {
            if (drag.current?.pointerId !== event.pointerId) return;
            const distance = event.clientY - drag.current.startY;
            drag.current = null;
            setDragging(false);
            if (distance < 80) {
              setDragOffset(0);
              return;
            }
            if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
              onClose();
              return;
            }
            setDismissing(true);
            dismissTimer.current = setTimeout(onClose, 220);
          }}
          onLostPointerCapture={(event) => {
            if (drag.current?.pointerId !== event.pointerId) return;
            drag.current = null;
            setDragging(false);
            setDragOffset(0);
          }}>
          <span className={styles.handle} />
        </div>
        <div className={styles.toolbar}>
          <div className={styles.search}>
          <Search size={19} aria-hidden />
          <input ref={input} type="search" aria-label="Search Your Transactions"
            placeholder="Search Your Transactions" value={inputValue}
            onChange={(event) => {
              setInputValue(event.target.value);
              if (!event.target.value.trim()) setSettled("");
            }} />
          </div>
          <button type="button" className={styles.close} onClick={onClose}>
            Cancel
          </button>
        </div>
      </div>
      {!query ? (
        <div className={styles.empty}>
          <div className={styles.illustration} aria-hidden="true">
            <span className={styles.paper}><i /><i /><i /><i /></span>
            <Search className={styles.magnifier} size={43} strokeWidth={2.4} />
          </div>
          <div className={styles.guidance}>
            <h2>Search Your Transactions</h2>
            <p>Find by description, category, amount, or account (e.g. “shopping”, “₹1,900”, “Canva”, “SBI”).</p>
          </div>
        </div>
      ) : pending ? (
        <p className={styles.status} role="status"><Search size={17} aria-hidden /> Searching…</p>
      ) : (
        <>
          <p className={styles.status} role="status">
            {amount === null ? <Tag size={17} aria-hidden /> : <Coins size={17} aria-hidden />}
            <span><strong>{results.length}</strong> {results.length === 1 ? "transaction" : "transactions"} found for “{settled}”</span>
          </p>
          {results.length > 0 && <div className={activityStyles.activity}>{renderResults(results)}</div>}
        </>
      )}
    </dialog>
  );
}
