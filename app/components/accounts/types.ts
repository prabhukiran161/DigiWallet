import {
  Landmark,
  WalletCards,
  Coins,
  TrendingUp,
  HandCoins,
  ArrowUpRight,
} from "lucide-react";
import type { Wallet, Account } from "@/lib/ledger";

export const ACCOUNT_ICONS = {
  bank: Landmark,
  cash: Coins,
  card: WalletCards,
  investment: TrendingUp,
  loan: HandCoins,
  receivable: ArrowUpRight,
} as const;

export interface AccountCardsProps {
  wallet: Wallet;
  accounts: Account[];
  month: string;
  compact?: boolean;
  hidden?: boolean;
  initialSelected?: string;
}

