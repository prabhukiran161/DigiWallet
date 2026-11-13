import type { Wallet, Command, EventType, AccountType, Journal } from "@/lib/ledger";
import type { Save } from "../primitives";

export interface TransactionFormProps {
  wallet: Wallet;
  save: Save;
  onDone: () => void;
  initialType?: EventType;
  editing?: Journal;
}

export const CREDIT_TYPES: EventType[] = [
  "income",
  "borrow",
  "receive",
  "refund",
  "capitalReturn",
];

export const DEBIT_TYPES: EventType[] = [
  "expense",
  "transfer",
  "lend",
  "repay",
  "invest",
  "cardPayment",
  "release",
];

export const TARGET_TYPES: Partial<Record<EventType, AccountType[]>> = {
  borrow: ["loan"],
  lend: ["receivable"],
  repay: ["loan"],
  receive: ["receivable"],
  invest: ["investment"],
  capitalReturn: ["investment"],
  cardPayment: ["card"],
  transfer: ["bank", "cash"],
};

