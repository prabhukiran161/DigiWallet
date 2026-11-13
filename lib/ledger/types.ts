export type AccountType =
  | "bank"
  | "cash"
  | "card"
  | "investment"
  | "loan"
  | "receivable";

export type Account = {
  id: string;
  name: string;
  type: AccountType;
  opening: number;
  date: string;
  limit: number;
  institution: string;
  counterparty: string;
  purpose: string;
  loanType: string;
  terms: string;
  dueDate: string;
  archived: boolean;
  generated?: boolean;
  createdAt?: string;
  closedAt?: string;
  limitHistory?: { date: string; limit: number; recordedAt: string }[];
};

export type Allocation = {
  id: string;
  loan: string;
  purpose: string;
  holding: string;
  assigned: number;
  remaining: number;
  committed: number;
  used: number;
  released: number;
  returned: number;
  commitments: Record<string, number>;
};

export type EventType =
  | "income"
  | "expense"
  | "borrow"
  | "transfer"
  | "invest"
  | "capitalReturn"
  | "cardPayment"
  | "lend"
  | "receive"
  | "repay"
  | "refund"
  | "release";

export type Command = {
  key: string;
  type: EventType;
  amount: string;
  account: string;
  description: string;
  date: string;
  notes?: string;
  target?: string;
  category?: string;
  counterparty?: string;
  purpose?: string;
  loanType?: string;
  terms?: string;
  dueDate?: string;
  interest?: string;
  fee?: string;
  reserve?: boolean;
  allocation?: string;
  loanFunding?: string;
  returnUnused?: boolean;
  original?: string;
};

export type Line = {
  account: string;
  delta: number;
};

export type Journal = {
  id: string;
  type: EventType | "opening";
  date: string;
  recordedAt: string;
  description: string;
  notes: string;
  category: string;
  lines: Line[];
  expense: number;
  income: number;
  inflow: number;
  outflow: number;
  balances: Record<string, number>;
  command?: Command;
  revision?: number;
  revisions?: {
    editedAt: string;
    command: Command;
    requestKey?: string;
    replacement?: Command;
  }[];
  availableBalances?: Record<string, number>;
};

export type Wallet = {
  accounts: Account[];
  events: Journal[];
  allocations: Allocation[];
  categories: {
    id: string;
    name: string;
    archived: boolean;
    icon?: string;
    system?: boolean;
  }[];
  schemaVersion?: number;
  deletedAccounts?: { account: Account; opening?: Journal; deletedAt: string }[];
  managementHistory?: { action: string; id: string; at: string; before: unknown }[];
  budgets: Record<
    string,
    { total: number; categories: Record<string, number> }
  >;
  timezone: string;
};

export type AccountInput = {
  id: string;
  name: string;
  type: AccountType;
  opening?: string;
  availableCredit?: string;
  date: string;
  limit?: string;
  institution?: string;
  counterparty?: string;
  purpose?: string;
  loanType?: string;
  terms?: string;
  dueDate?: string;
};

