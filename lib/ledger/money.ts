import type { Command } from "./types";

export function check(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

/** Parses string amount to exact integer paise using BigInt arithmetic */
export function money(value: string): number {
  check(
    typeof value === "string" && /^\d+(\.\d{1,2})?$/.test(value),
    "Enter a positive amount with at most two decimal places.",
  );
  const [whole, fraction = ""] = value.split(".");
  const n = BigInt(whole) * 100n + BigInt(fraction.padEnd(2, "0"));
  check(n <= 100000000000000n, "Amount exceeds the supported limit.");
  return Number(n);
}

export function validDate(date: string) {
  check(
    typeof date === "string" &&
      /T.*(?:Z|[+-]\d\d:\d\d)$/.test(date) &&
      Number.isFinite(Date.parse(date)),
    "Enter a timestamp with timezone.",
  );
  check(
    Date.parse(date) <= Date.now(),
    "Future transactions cannot be posted.",
  );
}

export function canonical(c: Command): string {
  return JSON.stringify(
    Object.fromEntries(
      Object.entries(c)
        .filter(([, v]) => v !== undefined)
        .sort(([a], [b]) => a.localeCompare(b)),
    ),
  );
}

