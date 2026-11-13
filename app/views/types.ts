export type View = "Home" | "Accounts" | "Activity" | "Budget" | "Settings";

export const ACCOUNT_FILTERS = [
  "All",
  "Bank & cash",
  "Cards",
  "Investments",
  "Borrowed",
  "Lent",
] as const;

export type AccountFilter = (typeof ACCOUNT_FILTERS)[number];

