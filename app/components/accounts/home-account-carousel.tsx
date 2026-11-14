"use client";

import { useRef, useState } from "react";
import type { Account, Wallet } from "@/lib/ledger";
import { AccountCard } from "./account-card";
import styles from "./home-account-carousel.module.css";

interface HomeAccountCarouselProps {
  accounts: Account[];
  wallet: Wallet;
  hidden: boolean;
  onSelect: (id: string) => void;
}

export function HomeAccountCarousel({ accounts, wallet, hidden, onSelect }: HomeAccountCarouselProps) {
  const viewport = useRef<HTMLDivElement>(null);
  const [index, setIndex] = useState(0);
  const active = Math.min(index, accounts.length - 1);

  function goTo(next: number) {
    const strip = viewport.current;
    const slide = strip?.children[next];
    if (!strip || !slide) return;
    const distance = slide.getBoundingClientRect().left - strip.getBoundingClientRect().left
      + (slide.clientWidth - strip.clientWidth) / 2;
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    strip.scrollTo({ left: strip.scrollLeft + distance, behavior: reducedMotion ? "instant" : "smooth" });
  }

  return (
    <div role="group" aria-label="My Accounts carousel" className={styles.carousel}
      onKeyDown={(event) => {
        if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
        event.preventDefault();
        goTo(active + (event.key === "ArrowRight" ? 1 : -1));
      }}>
      <div ref={viewport}
        className={`${styles.viewport} flex snap-x snap-mandatory overflow-x-auto overscroll-x-contain`}
        onScroll={(event) => {
          const strip = event.currentTarget;
          const center = strip.getBoundingClientRect().left + strip.clientWidth / 2;
          let closest = 0;
          let nearest = Infinity;
          Array.from(strip.children).forEach((slide, position) => {
            const rect = slide.getBoundingClientRect();
            const distance = Math.abs(rect.left + rect.width / 2 - center);
            if (distance < nearest) {
              nearest = distance;
              closest = position;
            }
          });
          setIndex(closest);
        }}>
        {accounts.map((account, position) => (
          <div key={account.id} className={`${styles.slide} flex shrink-0 snap-center snap-always`}
            data-active={position === active}>
            <AccountCard account={account} wallet={wallet} hidden={hidden} compact
              onSelect={() => position === active ? onSelect(account.id) : goTo(position)} />
          </div>
        ))}
      </div>
      <div className="flex justify-center">
        {accounts.map((account, position) => (
          <button key={account.id} type="button" aria-label={`Show ${account.name}, ${position + 1} of ${accounts.length}`}
            aria-current={position === active ? "true" : undefined}
            onClick={() => goTo(position)} className="grid size-6 place-items-center rounded-full">
            <span className={`size-1.5 rounded-full ${position === active ? "bg-[var(--blue)]" : "bg-[#bfd0e8]"}`} />
          </button>
        ))}
      </div>
    </div>
  );
}
