import {categoryIcons, defaultCategoryIds} from './category-options';
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
  limitHistory?: {date:string; limit:number; recordedAt:string}[];
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

export type Line = { account: string; delta: number };

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
  revisions?: {editedAt:string; command:Command; requestKey?:string; replacement?:Command}[];
  availableBalances?: Record<string,number>;
};

export type Wallet = {
  accounts: Account[];
  events: Journal[];
  allocations: Allocation[];
  categories: { id: string; name: string; archived: boolean; icon?: string; system?: boolean }[];
  schemaVersion?: number;
  deletedAccounts?: {account:Account; opening?:Journal; deletedAt:string}[];
  managementHistory?: {action:string; id:string; at:string; before:unknown}[];
  budgets: Record<
    string,
    { total: number; categories: Record<string, number> }
  >;
  timezone: string;
};

export const liquid = (a: Account) => a.type === "bank" || a.type === "cash";

export const liability = (a: Account) => a.type === "loan" || a.type === "card";
function check(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}
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
export function emptyWallet(): Wallet {
  return {
    accounts: [],
    events: [],
    allocations: [],
    categories: ["Food", "Transport", "Shopping", "Bills", "Other"].map(
      (name) => ({ id: name.toLowerCase(), name, archived: false }),
    ),
    budgets: {},
    timezone: "Asia/Kolkata",
  };
}
export function balance(w: Wallet, id: string): number {
  const a = w.accounts.find((a) => a.id === id);
  check(a, "Account not found.");
  return (
    w.events.reduce(
      (sum, e) =>
        sum +
        e.lines
          .filter((l) => l.account === id)
          .reduce((n, l) => n + l.delta, 0),
      0,
    ) * (liability(a) ? -1 : 1) || 0
  );
}
export function localDate(date: string, timezone: string) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(date));
}
export function summary(w: Wallet, month: string) {
  const events = w.events.filter((e) =>
    localDate(e.date, w.timezone).startsWith(month),
  );
  const available = w.accounts
    .filter(liquid)
    .reduce((s, a) => s + balance(w, a.id), 0);
  const netWorth = w.accounts.reduce(
    (s, a) => s + balance(w, a.id) * (liability(a) ? -1 : 1),
    0,
  );
  const reserved = w.allocations.reduce((s, a) => s + a.remaining, 0);
  return {
    available,
    netWorth,
    reserved,
    unallocated: available - reserved,
    income: events.reduce((s, e) => s + e.income, 0),
    expenses: events.reduce((s, e) => s + e.expense, 0),
    inflow: events.reduce((s, e) => s + e.inflow, 0),
    outflow: events.reduce((s, e) => s + e.outflow, 0),
  };
}
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
export function createAccount(w: Wallet, input: AccountInput): Wallet {
  check(
    !input.id.startsWith("system:") && !input.id.startsWith("opening-"),
    "Reserved account identifier.",
  );
  check(!w.accounts.some((a) => a.id === input.id), "Account already exists.");
  check(
    input.name.trim().length > 0 && input.name.length <= 100,
    "Enter an account name (maximum 100 characters).",
  );
  check(
    ["bank", "cash", "card", "investment", "loan", "receivable"].includes(
      input.type,
    ),
    "Invalid account type.",
  );
  validDate(input.date);
  const a: Account = {
    ...input,
    name: input.name.trim(),
    date: new Date(input.date).toISOString(),
    opening: money(input.opening || "0"),
    limit: money(input.limit || "0"),
    institution: input.institution || "",
    counterparty: input.counterparty || "",
    purpose: input.purpose || "",
    loanType: input.loanType || "",
    terms: input.terms || "",
    dueDate: input.dueDate || "",
    archived: false,
    createdAt: new Date().toISOString(),
  };
  if (a.type === 'card' && input.availableCredit !== undefined) {
    const available = money(input.availableCredit);
    check(available <= a.limit, 'Available credit cannot exceed total credit limit.');
    a.opening = a.limit - available;
  }
  check(
    a.type !== "card" || a.opening <= a.limit,
    "Opening debt exceeds credit limit.",
  );
  return rebuild(
    { ...structuredClone(w), accounts: [...w.accounts, a] },
    w.events.flatMap((e) => (e.command ? [e.command] : [])),
  );
}
function validDate(date: string) {
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
function canonical(c: Command) {
  return JSON.stringify(
    Object.fromEntries(
      Object.entries(c)
        .filter(([, v]) => v !== undefined)
        .sort(([a], [b]) => a.localeCompare(b)),
    ),
  );
}
export function post(w: Wallet, c: Command): Wallet {
  if(c.type==='borrow')c={...c,reserve:true};
  const old = w.events.find((e) => e.command?.key === c.key);
  if (old) {
    check(
      canonical(old.command!) === canonical(c),
      "Idempotency conflict: this request key has different details.",
    );
    return structuredClone(w);
  }
  check(c.key.length > 0 && c.key.length <= 100, "Invalid request key.");
  check(
    c.description.trim().length > 0 && c.description.length <= 200,
    "Description is required (maximum 200 characters).",
  );
  check((c.notes || "").length <= 2000, "Notes are too long.");
  validDate(c.date);
  if (
    c.type === "expense" ||
    (c.type === "repay" && money(c.interest || "0") + money(c.fee || "0") > 0)
  )
    check(
      w.categories.some(
        (cat) => cat.id === (c.category || "other") && !cat.archived,
      ),
      "Choose an active expense category.",
    );
  for (const id of [c.account, c.target].filter(Boolean)) {
    const a = w.accounts.find((a) => a.id === id);
    check(
      a && !a.archived && !a.closedAt,
      "Choose an active account belonging to this wallet.",
    );
  }
  check(!c.allocation || w.accounts.find(a=>a.id===c.account)?.type === 'bank', 'Loan funds can only be selected from their holding bank.');
  check(!c.loanFunding || w.accounts.find(a=>a.id===c.account)?.type === 'bank', 'Loan funds can only be selected from their holding bank.');
  if((c.loanFunding||c.allocation)&&c.type==='transfer')check(w.accounts.find(a=>a.id===c.target)?.type==='bank','Loan funds must be moved to a bank account.');
  return rebuild(w, [
    ...w.events.flatMap((e) => (e.command ? [e.command] : [])),
    c,
  ]);
}
export function rebuild(source: Wallet, commands: Command[]): Wallet {
  const w = structuredClone(source);
  w.accounts = w.accounts.filter((a) => !a.generated);
  w.events = [];
  w.allocations = [];
  const items = [
    ...w.accounts.map((a, i) => ({ date: a.date, seq: i, account: a })),
    ...commands.map((command, i) => ({
      date: command.date,
      seq: w.accounts.length + i,
      command,
    })),
  ].sort((a, b) => Date.parse(a.date) - Date.parse(b.date) || a.seq - b.seq);
  for (const item of items) {
    if ("account" in item) {
      const a = item.account;
      const amount = a.opening * (liability(a) ? -1 : 1);
      w.events.push({
        id: `opening-${a.id}`,
        type: "opening",
        date: a.date,
        recordedAt: a.date,
        description: `Opening balance · ${a.name}`,
        notes: "",
        category: "",
        lines: amount
          ? [
              { account: a.id, delta: amount },
              { account: "system:equity", delta: -amount },
            ]
          : [],
        expense: 0,
        income: 0,
        inflow: 0,
        outflow: 0,
        balances: {},
      });
    } else {
      const card = w.accounts.find(a=>a.id===item.command.account && a.type==='card');
      if(card && item.command.type==='expense') check(balance(w,card.id)+money(item.command.amount)<=creditLimitAt(card,item.command.date,source.events.find(e=>e.id===item.command.key)?.recordedAt||new Date().toISOString()), `Credit limit exceeded for ${card.name}.`);
      apply(w, item.command);
    }
    const last = w.events.at(-1)!;
    last.balances = Object.fromEntries(
      w.accounts.map((a) => [a.id, balance(w, a.id)]),
    );
    last.availableBalances = Object.fromEntries(w.accounts.map(a=>[a.id, a.type==='card'?Math.max(0,creditLimitAt(a,last.date,source.events.find(e=>e.id===last.id)?.recordedAt||last.recordedAt)-last.balances[a.id]):last.balances[a.id]]));
    for (const a of w.accounts) {
      const n = balance(w, a.id);
      check(
        Number.isSafeInteger(n) && Math.abs(n) <= 100000000000000,
        "Balance exceeds supported range.",
      );
      check(n >= 0, `Insufficient funds or principal balance in ${a.name}.`);

      const reserved = w.allocations
        .filter((f) => f.holding === a.id)
        .reduce((s, f) => s + f.remaining, 0);
      check(
        !liquid(a) || reserved <= n,
        `Reserved money in ${a.name} must be released or moved before spending.`,
      );
    }
    for (const f of w.allocations)
      check(
        f.remaining >= 0 && f.committed >= 0 && f.committed <= f.remaining,
        "Insufficient remaining purpose funding.",
      );
    for (const card of w.accounts.filter((a) => a.type === "card"))
      check(
        w.allocations.reduce((s, f) => s + (f.commitments[card.id] || 0), 0) <=
          balance(w, card.id),
        "Select the funding commitment when settling this card.",
      );
    check(
      Number.isSafeInteger(
        w.accounts.reduce((s, a) => s + balance(w, a.id), 0),
      ),
      "Total balances exceed the exact integer range.",
    );
  }
  // Effective ordering changes projections, never the original server recording time.
  for (const e of w.events) {
    const previous=source.events.find(old=>old.id===e.id);
    e.recordedAt=previous?.recordedAt || e.recordedAt;
    e.revision=previous?.revision || 0;
    e.revisions=previous?.revisions || [];
  }
  for (const a of w.accounts.filter((a) => a.generated)) {
    const previous = source.accounts.find((old) => old.id === a.id);
    if (previous) {
      a.name = previous.name;
      a.archived = previous.archived;
      a.closedAt = previous.closedAt;
      a.createdAt = previous.createdAt;
      a.institution = previous.institution;
    }
  }
  for(const a of w.accounts.filter(a=>a.closedAt)) check(balance(w,a.id)===0 && !w.allocations.some(f=>(f.loan===a.id||f.holding===a.id)&&f.remaining>0), 'This edit would reopen a balance or funding obligation on a closed account.');
  return w;
}
function apply(w: Wallet, c: Command) {
  const amount = money(c.amount),
    interest = money(c.interest || "0"),
    fee = money(c.fee || "0");
  check(amount > 0, "Amount must be greater than zero.");
  const find = (id: string | undefined) => {
    const a = w.accounts.find((a) => a.id === id);
    check(a, "Account not found in this wallet.");
    check(
      Date.parse(c.date) >= Date.parse(a.date),
      "Transaction predates account opening.",
    );
    return a;
  };
  const a = find(c.account);
  const target = c.target ? find(c.target) : undefined;
  const is = (a: Account | undefined, types: AccountType[]) =>
    !!a && types.includes(a.type);
  const f = c.allocation
    ? w.allocations.find((f) => f.id === c.allocation)
    : undefined;
  check(!c.allocation || f, "Funding allocation not found.");
  check(!(c.allocation && c.loanFunding), 'Choose one funding method.');
  const funds=c.loanFunding?w.allocations.filter(f=>f.loan===c.loanFunding && f.holding===a.id && f.remaining>0):f?[f]:[];
  check(!c.loanFunding || (a.type==='bank' && funds.length>0), 'No loan funds are held in this bank.');
  const e: Journal = {
    id: c.key,
    type: c.type,
    date: new Date(c.date).toISOString(),
    recordedAt: new Date().toISOString(),
    description: c.description.trim(),
    notes: c.notes || "",
    category: c.category || "other",
    lines: [],
    expense: 0,
    income: 0,
    inflow: 0,
    outflow: 0,
    balances: {},
    command: structuredClone(c),
  };
  const line = (account: string, delta: number) => {
    if (delta) e.lines.push({ account, delta });
  };
  const pair = (debit: string, credit: string, n: number) => {
    line(debit, n);
    line(credit, -n);
  };
  const consume = (n: number, card = false) => {
    if (!funds.length) return;
    check(n<=funds.reduce((s,f)=>s+f.remaining-f.committed,0), 'Insufficient remaining purpose funding.');
    for(const f of funds){const used=Math.min(n,f.remaining-f.committed);if(!used)continue;
      if(card){f.committed+=used;f.commitments[a.id]=(f.commitments[a.id]||0)+used;}
      else {check(f.holding===a.id,'Funding must be held in the selected payment account.');f.remaining-=used;}
      f.used+=used;n-=used;
    }
  };
  const generated = (type: "loan" | "receivable") => {
    check(c.counterparty?.trim(), "Enter the lender or borrower.");
    const id = `${type}-${c.key}`;
    const account: Account = {
      id,
      type,
      name:
        type === "loan"
          ? `${c.loanType || "Loan"} · ${c.counterparty}`
          : `Lent · ${c.counterparty}`,
      counterparty: c.counterparty!,
      purpose: c.purpose || "",
      loanType: c.loanType || "Personal",
      terms: c.terms || "",
      dueDate: c.dueDate || "",
      date: e.date,
      opening: 0,
      limit: 0,
      institution: c.counterparty!,
      archived: false,
      generated: true,
      createdAt: e.recordedAt,
    };
    w.accounts.push(account);
    return account;
  };
  switch (c.type) {
    case "income":
      check(liquid(a), "Income requires a bank or cash account.");
      pair(a.id, "system:income", amount);
      e.income = amount;
      break;
    case "expense":
      check(
        is(a, ["bank", "cash", "card"]),
        "Choose bank, cash or card for an expense.",
      );
      pair("system:expense", a.id, amount);
      e.expense = amount;
      consume(amount, a.type === "card");
      break;
    case "borrow": {
      check(a.type === "bank", "Borrowed money must enter a bank account.");
      check(!target || target.type === "loan", "Choose an existing loan.");
      check(
        target || !w.accounts.some((a) => a.id === `loan-${c.key}`),
        "Generated loan account already exists.",
      );
      const loan = target || generated("loan");
      pair(a.id, loan.id, amount);
      if (c.reserve) {
        w.allocations.push({
          id: `fund-${c.key}`,
          loan: loan.id,
          purpose: c.purpose || loan.purpose || "Loan purpose",
          holding: a.id,
          assigned: amount,
          remaining: amount,
          committed: 0,
          used: 0,
          released: 0,
          returned: 0,
          commitments: {},
        });
      }
      break;
    }
    case "transfer":
      check(
        liquid(a) && target && liquid(target) && a.id !== target.id,
        "Choose two different bank or cash accounts.",
      );
      pair(target!.id, a.id, amount);
      if (funds.length) {
        check(funds.every(f=>f.holding===a.id) && funds.reduce((s,f)=>s+f.remaining,0)===amount, 'Move the complete reservation to another bank, or release a portion first.');
        for(const fund of funds) fund.holding=target!.id;
      }
      break;
    case "invest":
      check(
        a.type === "bank" && target?.type === "investment",
        "Investment contributions require a bank and investment account.",
      );
      pair(target!.id, a.id, amount);
      consume(amount);
      break;
    case "capitalReturn":
      check(
        a.type === "bank" && target?.type === "investment",
        "Choose receiving bank and investment.",
      );
      pair(a.id, target!.id, amount);
      break;
    case "cardPayment":
      check(
        a.type === "bank" && target?.type === "card",
        "Card payments require a bank and card.",
      );
      pair(target!.id, a.id, amount);
      if (funds.length) {
        check(funds.every(f=>f.holding===a.id), 'Funding must be held in the selected payment bank.');
        const committed=funds.reduce((s,f)=>s+(f.commitments[target!.id]||0),0);
        const free=funds.reduce((s,f)=>s+f.remaining-f.committed,0);
        check(amount<=committed+free, 'Insufficient loan funding for this card payment.');
        let left=amount;
        for(const fund of funds){const n=Math.min(left,fund.commitments[target!.id]||0);fund.remaining-=n;fund.committed-=n;fund.commitments[target!.id]=(fund.commitments[target!.id]||0)-n;left-=n;}
        consume(left);
      }
      break;
    case "lend": {
      check(liquid(a), "Lending requires bank or cash.");
      check(!target || target.type === "receivable", "Choose a receivable.");
      check(
        target || !w.accounts.some((a) => a.id === `receivable-${c.key}`),
        "Generated receivable already exists.",
      );
      const receivable = target || generated("receivable");
      pair(receivable.id, a.id, amount);
      consume(amount);
      break;
    }
    case "receive":
      check(
        liquid(a) && target?.type === "receivable",
        "Choose receiving bank or cash and a receivable.",
      );
      pair(a.id, target!.id, amount);
      pair(a.id, "system:income", interest);
      e.income = interest;
      break;
    case "repay":
      check(
        liquid(a) && target?.type === "loan",
        "Choose bank or cash and an existing loan.",
      );
      pair(target!.id, a.id, amount);
      pair("system:expense", a.id, interest + fee);
      e.expense = interest + fee;
      if (c.returnUnused) {
        check(funds.length && funds.every(f=>f.loan===target!.id && f.holding===a.id) && amount<=funds.reduce((s,f)=>s+f.remaining-f.committed,0), 'Choose sufficient uncommitted funding for this loan and bank.');
        let left=amount;
        for(const fund of funds){const n=Math.min(left,fund.remaining-fund.committed);fund.remaining-=n;fund.returned+=n;left-=n;}
      } else check(!funds.length, 'Only unused principal returns can consume a repayment allocation.');
      break;
    case "refund": {
      const original = w.events.find((o) => o.id === c.original);
      check(
        original?.type === "expense" && original.command?.account === a.id,
        "Select an original expense from this payment account.",
      );
      check(
        !original.command.allocation && !original.command.loanFunding,
        "Funded refunds need allocation restoration and are not supported yet.",
      );
      const already = w.events
        .filter((o) => o.command?.original === c.original)
        .reduce((s, o) => s - o.expense, 0);
      check(
        amount <= original.expense - already,
        "Refund exceeds the original expense.",
      );
      pair(a.id, "system:expense", amount);
      e.expense = -amount;
      e.category = original.category;
      break;
    }
    case "release": {
      check(funds.length && funds.every(f=>f.holding===a.id) && amount<=funds.reduce((s,f)=>s+f.remaining-f.committed,0), 'Choose uncommitted reserved funds in this bank.');
      let left=amount;
      for(const fund of funds){const n=Math.min(left,fund.remaining-fund.committed);fund.remaining-=n;fund.released+=n;left-=n;}
      break;
    }
    default:
      throw new Error("Unsupported transaction type.");
  }
  check(
    !interest || ["repay", "receive"].includes(c.type),
    "Interest is only supported on repayments.",
  );
  check(!fee || c.type === "repay", "Fees must be recorded as expenses.");
  check(
    !funds.length ||
      [
        "expense",
        "invest",
        "lend",
        "transfer",
        "cardPayment",
        "repay",
        "release",
      ].includes(c.type),
    "Funding is not supported for this event.",
  );
  if (e.expense > 0)
    check(
      w.categories.some((cat) => cat.id === e.category),
      "Select an expense category.",
    );
  const cash = e.lines
    .filter((l) => w.accounts.some((a) => a.id === l.account && liquid(a)))
    .reduce((s, l) => s + l.delta, 0);
  e.inflow = Math.max(cash, 0);
  e.outflow = Math.max(-cash, 0);
  check(
    e.lines.reduce((s, l) => s + l.delta, 0) === 0,
    "Journal does not balance.",
  );
  w.events.push(e);
}

export function upgradeWallet(input: Wallet): Wallet {
  const w=structuredClone(input);
  w.schemaVersion=2;
  w.deletedAccounts??=[];
  w.managementHistory??=[];
  for(const c of w.categories){c.icon??=categoryIcons.includes(c.id as never)?c.id:'other';c.system??=defaultCategoryIds.includes(c.id);}
  for(const e of w.events){e.revision??=0;e.revisions??=[];}
  // Do not manufacture creation timestamps for pre-migration accounts.
  return w;
}
export function creditLimitAt(a:Account,date=new Date().toISOString(),recordedAt?:string):number {
  if(!a.limitHistory?.length)return a.limit;
  const changes=a.limitHistory.filter(h=>Date.parse(h.date)<Date.parse(date)||Date.parse(h.date)===Date.parse(date)&&(!recordedAt||Date.parse(h.recordedAt)<=Date.parse(recordedAt))).sort((a,b)=>Date.parse(a.date)-Date.parse(b.date));
  return changes.at(-1)?.limit ?? a.limitHistory[0].limit;
}
export function availableBalance(w:Wallet,a:Account,date?:string,event?:Journal):number {
  const n=event?event.balances[a.id]||0:balance(w,a.id);
  return a.type==='card'?Math.max(0,creditLimitAt(a,date,event?.recordedAt)-n):n;
}
export function accountHasActivity(w:Wallet,id:string):boolean {
  return w.events.some(e=>e.type!=='opening' && (e.lines.some(l=>l.account===id) || e.command?.account===id || e.command?.target===id || e.command?.loanFunding===id || w.allocations.some(f=>f.loan===id&&f.id===e.command?.allocation) || e.revisions?.some(r=>r.command.account===id || r.command.target===id || r.command.loanFunding===id)));
}
export function categoryUsed(w:Wallet,id:string):boolean {
  return w.events.some(e=>e.category===id || e.revisions?.some(r=>r.command.category===id));
}
export function withinEditWindow(recordedAt:string|undefined,now=Date.now()):boolean {
  if(!recordedAt)return false;
  const elapsed=now-Date.parse(recordedAt);
  return Number.isFinite(elapsed) && elapsed>=0 && elapsed<24*60*60*1000;
}
function management(w:Wallet,action:string,id:string,before:unknown){
  (w.managementHistory??=[]).push({action,id,at:new Date().toISOString(),before:structuredClone(before)});
}
export function editAccount(source:Wallet,input:AccountInput):Wallet {
  const w=upgradeWallet(source),a=w.accounts.find(a=>a.id===input.id);
  check(a && !a.closedAt,'Choose an account that is not closed.');
  const used=accountHasActivity(w,a.id);
  validDate(input.date);check(input.name.trim().length>0 && input.name.length<=100,'Enter an account name (maximum 100 characters).');
  const candidate:Account=used?{...a,...input,name:input.name.trim(),opening:money(input.opening||'0'),limit:money(input.limit||'0'),date:new Date(input.date).toISOString(),institution:input.institution||'',counterparty:input.counterparty||'',purpose:input.purpose||'',loanType:input.loanType||'',terms:input.terms||'',dueDate:input.dueDate||''}:createAccount(emptyWallet(),input).accounts[0];
  if(used && input.availableCredit!==undefined)check(a.type==='card' && money(input.availableCredit)===a.limit-a.opening,'Opening details are locked after the first transaction.');
  if(candidate.institution!==a.institution)check(withinEditWindow(a.createdAt),'Institution can only be changed within 24 hours of account creation.');
  if(used){
    for(const key of ['type','opening','date','limit','counterparty','purpose','loanType','terms','dueDate'] as const)
      check(candidate[key]===a[key], 'After the first transaction only name, eligible institution edits and dated credit-limit changes are allowed.');
  }
  management(w,'editAccount',a.id,a);
  Object.assign(a,candidate,{createdAt:a.createdAt,archived:a.archived,generated:a.generated,limitHistory:a.limitHistory});
  if(!used && a.type==='card')a.limitHistory=[{date:a.date,limit:a.limit,recordedAt:new Date().toISOString()}];
  return rebuild(w,w.events.flatMap(e=>e.command?[e.command]:[]));
}
export function setCreditLimit(source:Wallet,id:string,value:string,date:string):Wallet {
  const w=upgradeWallet(source),a=w.accounts.find(a=>a.id===id);
  check(a?.type==='card' && !a.closedAt,'Choose an open credit card.');
  validDate(date);check(Date.parse(date)>=Date.parse(a.date),'Limit change predates account opening.');
  const limit=money(value);management(w,'creditLimit',id,a);
  a.limitHistory??=[{date:a.date,limit:a.limit,recordedAt:a.createdAt||new Date().toISOString()}];
  a.limitHistory.push({date:new Date(date).toISOString(),limit,recordedAt:new Date().toISOString()});
  a.limit=creditLimitAt(a);
  return rebuild(w,w.events.flatMap(e=>e.command?[e.command]:[]));
}
export function manageAccount(source:Wallet,id:string,action:'deleteAccount'|'closeAccount'|'archive'):Wallet {
  const w=upgradeWallet(source),a=w.accounts.find(a=>a.id===id);
  check(a,'Account not found.');check(!a.closedAt,'Closed accounts cannot be reopened or changed.');
  management(w,action,id,a);
  if(action==='deleteAccount'){
    check(!accountHasActivity(w,id),'Accounts with transactions cannot be deleted. Close or archive this account instead.');
    w.deletedAccounts!.push({account:structuredClone(a),opening:w.events.find(e=>e.id===`opening-${id}`),deletedAt:new Date().toISOString()});
    w.accounts=w.accounts.filter(a=>a.id!==id);
    return rebuild(w,w.events.flatMap(e=>e.command?[e.command]:[]));
  }
  check(!w.allocations.some(f=>(f.loan===id||f.holding===id||f.commitments[id]) && f.remaining>0),'Resolve loan funds and commitments before archiving or closing.');
  if(action==='closeAccount'){
    check(balance(w,id)===0,'Clear the balance or debt before closing this account.');
    a.closedAt=new Date().toISOString();a.archived=false;
  }else a.archived=!a.archived;
  return w;
}
export function editTransaction(source:Wallet,id:string,replacement:Command,expectedRevision:number,requestKey:string):Wallet {
  const w=upgradeWallet(source),old=w.events.find(e=>e.id===id);
  check(old?.command,'Opening entries are managed through account settings.');
  const command={...replacement,key:old.command.key};
  const retry=old.revisions?.find(r=>r.requestKey===requestKey);
  if(retry){check(canonical(retry.replacement!)===canonical(command),'Edit request conflict.');return w;}
  check(withinEditWindow(old.recordedAt),'The 24-hour editing window has ended.');
  check((old.revision||0)===expectedRevision,'Edit conflict: this transaction changed. Reload its details.');
  check(command.description.trim().length>0&&command.description.length<=200,'Description is required (maximum 200 characters).');
  check((command.notes||'').length<=2000,'Notes are too long.');validDate(command.date);
  for(const ref of [command.account,command.target].filter(Boolean)){
    const a=w.accounts.find(a=>a.id===ref);check(a,'Account not found.');
    check((!a.closedAt&&!a.archived)||ref===old.command.account||ref===old.command.target,'Choose an active account.');
  }
  if(command.type==='expense'||command.type==='repay'&&(money(command.interest||'0')+money(command.fee||'0')>0))
    check(w.categories.some(c=>c.id===command.category&&(!c.archived||c.id===old.category)),'Choose an active category.');
  check(!command.allocation || (command.allocation===old.command.allocation && command.account===old.command.account) || w.accounts.find(a=>a.id===command.account)?.type==='bank','Loan funds can only be selected from their holding bank.');
  const result=rebuild(w,w.events.flatMap(e=>e.id===id?[command]:e.command?[e.command]:[]));
  const edited=result.events.find(e=>e.id===id)!;
  edited.revision=(old.revision||0)+1;
  edited.revisions=[...(old.revisions||[]),{editedAt:new Date().toISOString(),command:structuredClone(old.command),requestKey,replacement:structuredClone(command)}];
  return result;
}
export function manageCategory(source:Wallet,input:{id:string;name?:string;icon?:string;archived?:boolean},remove=false):Wallet {
  const w=upgradeWallet(source),c=w.categories.find(c=>c.id===input.id);
  const used=categoryUsed(w,input.id);
  if(remove){
    check(c,'Category not found.');check(!c.system,'Predefined categories can be archived, not deleted.');
    check(!used,'Categories with transactions can only be archived.');
    check(!Object.values(w.budgets).some(b=>Object.hasOwn(b.categories,input.id)),'This category is referenced by a budget. Archive it to preserve history.');
    management(w,'deleteCategory',input.id,c);w.categories=w.categories.filter(c=>c.id!==input.id);return w;
  }
  const name=(input.name??c?.name??'').trim(),icon=input.icon??c?.icon??'other';
  check(name.length>0&&name.length<=50,'Enter a category name (maximum 50 characters).');
  check(categoryIcons.includes(icon as never),'Choose a predefined category icon.');
  check(!c||!used||(name===c.name&&icon===c.icon),'Categories with transactions cannot be renamed or have their icon changed.');
  if(c){management(w,'editCategory',c.id,c);Object.assign(c,{name,icon,archived:input.archived??c.archived});}
  else w.categories.push({id:input.id,name,icon,archived:false,system:false});
  return w;
}
export function saveBudget(source:Wallet,input:{month:string;total:string;categories:Record<string,string>}):Wallet {
  const w=upgradeWallet(source),previous=w.budgets[input.month];
  const categories=Object.fromEntries(Object.entries(input.categories).map(([id,value])=>{
    const c=w.categories.find(c=>c.id===id);check(c,'Unknown category.');const n=money(value);
    check(!c.archived || n<=(previous?.categories[id]||0),'Archived categories cannot receive new or increased allocations.');return [id,n];
  }));
  const total=money(input.total);check(Object.values(categories).reduce((s,n)=>s+n,0)===total,'Category allocations must equal the overall budget.');
  // An archived allocation must be explicitly retained or redistributed, never silently dropped.
  for(const c of w.categories.filter(c=>c.archived&&(previous?.categories[c.id]||0)>0))check(Object.hasOwn(categories,c.id),'Explicitly redistribute the archived category allocation.');
  w.budgets[input.month]={total,categories};return w;
}
