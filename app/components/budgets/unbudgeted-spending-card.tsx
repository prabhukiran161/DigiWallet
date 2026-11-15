"use client";

import { useId, useRef, useState } from "react";
import { ChevronsLeft, ChevronsRight, Coins, Layers } from "lucide-react";
import { currency } from "@/lib/display";
import type { Wallet } from "@/lib/ledger";
import { CategoryIcon } from "../category-icon";
import styles from "./unbudgeted-spending-card.module.css";

const pageSize = 3;

export function UnbudgetedSpendingCard({ wallet, spending }: {
  wallet: Wallet;
  spending: [string, number][];
}) {
  const detailsId = useId();
  const [showDetails, setShowDetails] = useState(false);
  const [page, setPage] = useState(0);
  const slider = useRef<HTMLDivElement>(null);
  const total = spending.reduce((sum, [, amount]) => sum + amount, 0);
  const sorted = [...spending].sort((a, b) => b[1] - a[1]);
  const pageCount = Math.ceil(sorted.length / pageSize);

  return (
    <section className={styles.card} aria-label="Unbudgeted Spending" data-details={showDetails}>
      <button type="button" className={styles.arrow} aria-controls={detailsId}
        aria-expanded={showDetails} aria-label={showDetails ? "Back to spending summary" : "Show unbudgeted categories"}
        onClick={() => setShowDetails((visible) => !visible)}>
        {showDetails ? <ChevronsLeft size={19} aria-hidden /> : <ChevronsRight size={19} aria-hidden />}
      </button>

      <div className={styles.track}>
        <div className={styles.summary} inert={showDetails} aria-hidden={showDetails}>
          <span className={styles.summaryIcon}><Layers size={24} aria-hidden /></span>
          <div className={styles.copy}>
            <h3>Unbudgeted Spending</h3>
            <p><strong>{currency(total)}</strong> spent without an allocation.</p>
            <div className={styles.summaryPill}>
              <span><Coins size={14} aria-hidden /> {spending.length} {spending.length === 1 ? "category" : "categories"}</span>
              <strong>{currency(total)}</strong>
            </div>
          </div>
        </div>

        <div className={styles.details} id={detailsId} inert={!showDetails} aria-hidden={!showDetails}>
          <div className={styles.slider} ref={slider} role="region" aria-label="Unbudgeted category amounts"
            onScroll={(event) => {
              const strip = event.currentTarget;
              if (strip.clientWidth) setPage(Math.round(strip.scrollLeft / strip.clientWidth));
            }}>
            {Array.from({ length: pageCount }, (_, index) => (
              <ul className={styles.tilePage} key={index}>
                {sorted.slice(index * pageSize, (index + 1) * pageSize).map(([id, spent]) => {
                  const name = wallet.categories.find((category) => category.id === id)?.name ?? "Uncategorized";
                  return (
                    <li className={styles.tile} key={id} aria-label={`${name}: ${currency(spent)}`} title={name}>
                      <CategoryIcon category={id} wallet={wallet} size={20} />
                      <strong>{currency(spent)}</strong>
                    </li>
                  );
                })}
              </ul>
            ))}
          </div>
          {pageCount > 1 && (
            <div className={styles.dots}>
              {Array.from({ length: pageCount }, (_, index) => (
                <button key={index} type="button" aria-current={page === index ? "true" : undefined}
                  aria-label={`Show category page ${index + 1} of ${pageCount}`}
                  onClick={() => {
                    const strip = slider.current;
                    if (!strip) return;
                    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
                    strip.scrollTo({ left: index * strip.clientWidth, behavior: reduced ? "instant" : "smooth" });
                  }}>
                  <span />
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
