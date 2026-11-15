"use client";

import { useId, useRef, useState, type PointerEvent } from "react";
import { categoryColorHex } from "@/lib/category-colors";
import { currency } from "@/lib/display";
import styles from "./category-spending-chart.module.css";
import budgetStyles from "./monthly-budget-card.module.css";

interface Allocation {
  id: string;
  name: string;
  color?: string;
  spent: number;
  allocated: number;
}

const fallbackColors = ["#1459e8", "#7545ce", "#d54188", "#c16916", "#a87908", "#168052", "#087e83", "#9472cf"];
const center = 150;
const radius = 144;

function point(angle: number, distance: number) {
  return [center + Math.cos(angle) * distance, center + Math.sin(angle) * distance];
}

export function CategorySpendingChart({ categories }: { categories: Allocation[] }) {
  const gradientId = useId();
  const [selectedId, setSelectedId] = useState<string>();
  const [remainingIds, setRemainingIds] = useState<Set<string>>(() => new Set());
  const press = useRef<{ pointerId: number; x: number; y: number } | null>(null);
  const suppressClick = useRef(false);
  const entries = categories.map((category, index) => ({
    ...category,
    hex: categoryColorHex(category.color) ?? fallbackColors[index % fallbackColors.length],
  }));
  const total = entries.reduce((sum, entry) => sum + Math.max(0, entry.spent), 0);
  let angle = -Math.PI / 2;
  const slices = entries.filter(({ spent }) => spent > 0).map((entry) => {
    const share = entry.spent / total;
    const start = angle;
    angle += share * Math.PI * 2;
    return { ...entry, share, start, end: angle };
  });
  function select(id: string) {
    setSelectedId((current) => current === id ? undefined : id);
  }

  function showRemaining(id: string, remaining: boolean) {
    setRemainingIds((current) => {
      const next = new Set(current);
      if (remaining) next.add(id);
      else next.delete(id);
      return next;
    });
  }

  function startSwipe(event: PointerEvent<HTMLButtonElement>) {
    if (!event.isPrimary || event.button !== 0) return;
    suppressClick.current = false;
    press.current = { pointerId: event.pointerId, x: event.clientX, y: event.clientY };
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function endSwipe(event: PointerEvent<HTMLButtonElement>, id: string, cancelled = false) {
    const start = press.current;
    if (!start || start.pointerId !== event.pointerId) return;
    press.current = null;
    const dx = event.clientX - start.x;
    const dy = event.clientY - start.y;
    suppressClick.current = cancelled || Math.hypot(dx, dy) > 10;
    if (!cancelled && Math.abs(dx) >= 30 && Math.abs(dx) > Math.abs(dy)) {
      showRemaining(id, dx < 0);
    }
  }

  return (
    <section className={`${styles.card} ${budgetStyles.surface}`} aria-label="Spending Breakdown" onClick={() => setSelectedId(undefined)}>
      <h2 className={styles.heading}>Spending Breakdown</h2>
      {total > 0 ? (
        <svg viewBox="0 0 300 300" className={styles.pie} role="group" aria-label="Share of spending in allocated categories">
          <defs>
            {slices.map(({ id, hex }, index) => (
              <linearGradient key={id} id={`${gradientId}-${index}`} x2="1" y2="1">
                <stop stopColor={hex} stopOpacity=".79" />
                <stop offset="1" stopColor={hex} />
              </linearGradient>
            ))}
          </defs>
          {slices.map(({ id, name, spent, share, start, end }, index) => {
            const [x, y] = point((start + end) / 2, share === 1 ? 0 : 96);
            const percent = `${(share * 100).toFixed(1)}%`;
            const label = `${name}: ${currency(spent)}, ${percent} of spending in allocated categories`;
            const shape = slices.length === 1 ? (
              <circle cx={center} cy={center} r={radius} />
            ) : (
              <path d={`M ${center} ${center} L ${point(start, radius).join(" ")} A ${radius} ${radius} 0 ${share > .5 ? 1 : 0} 1 ${point(end, radius).join(" ")} Z`} />
            );
            return (
              <g key={id} role="button" tabIndex={0} aria-label={label}
                aria-pressed={selectedId === id} className={styles.slice}
                fill={`url(#${gradientId}-${index})`} onClick={(event) => {
                  event.stopPropagation();
                  select(id);
                }}
                onKeyDown={(event) => {
                  if (event.key !== "Enter" && event.key !== " ") return;
                  event.preventDefault();
                  select(id);
                }}>
                <title>{label}</title>
                {shape}
                {(share >= .055 || selectedId === id) && (
                  <text x={x} y={y} textAnchor="middle" dominantBaseline="central" aria-hidden="true">{percent}</text>
                )}
              </g>
            );
          })}
        </svg>
      ) : (
        <p className={styles.empty}>No spending in allocated categories yet.</p>
      )}
      <ul className={styles.allocations}>
        {entries.map(({ id, name, spent, allocated, hex }) => {
          const remaining = allocated - spent;
          const showLeft = remainingIds.has(id);
          const spentRatio = Math.min(1, Math.max(0, spent / allocated));
          const remainingRatio = Math.min(1, Math.max(0, remaining / allocated));
          const remainingLabel = `${currency(Math.abs(remaining))} ${remaining < 0 ? "over" : "left"}`;
          return (
          <li key={id}>
            <button type="button" className={styles.pill} aria-pressed={selectedId === id}
              data-remaining={showLeft}
              onPointerDown={startSwipe}
              onPointerUp={(event) => endSwipe(event, id)}
              onPointerCancel={(event) => endSwipe(event, id, true)}
              onLostPointerCapture={(event) => endSwipe(event, id, true)}
              onKeyDown={(event) => {
                if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
                event.preventDefault();
                showRemaining(id, event.key === "ArrowLeft");
              }}
              onClick={(event) => {
                event.stopPropagation();
                if (event.detail !== 0 && suppressClick.current) return;
                select(id);
              }}
              aria-label={`${name}: ${showLeft ? remainingLabel : `${currency(spent)} spent of ${currency(allocated)} allocated`}`}>
              <span className={`${styles.fill} ${styles.spentFill}`} aria-hidden="true" style={{
                transform: `scaleX(${showLeft ? 0 : spentRatio})`,
                backgroundColor: `${hex}38`,
              }} />
              <span className={`${styles.fill} ${styles.remainingFill}`} aria-hidden="true" style={{
                transform: `scaleX(${showLeft ? remainingRatio : 0})`,
                backgroundColor: `${hex}38`,
              }} />
              <span className={styles.name}>
                <span className={styles.swatch} style={{ backgroundColor: hex }} aria-hidden="true" />
                {name}
              </span>
              <span className={styles.amount} aria-hidden="true">
                <span className={styles.spentAmount}>{currency(spent)} / {currency(allocated)}</span>
                <span className={styles.remainingAmount}>{remainingLabel}</span>
              </span>
            </button>
          </li>
          );
        })}
      </ul>
    </section>
  );
}
