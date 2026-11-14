export const currency = (n: number) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 2,
  }).format(n / 100);

export const decimal = (n: number) =>
  `${Math.floor(n / 100)}.${String(n % 100).padStart(2, "0")}`;

export const nowLocal = () => {
  const d = new Date();
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000)
    .toISOString()
    .slice(0, 16);
};

export const labels: Record<string, string> = {
  bank: "Bank account",
  cash: "Physical cash",
  card: "Credit card",
  investment: "Investment",
  loan: "Borrowed money",
  receivable: "Money lent",
  income: "Inflow",
  expense: "Expense",
  borrow: "Borrowed money",
  transfer: "Transfer",
  invest: "Investment contribution",
  capitalReturn: "Return of capital",
  cardPayment: "Card payment",
  lend: "Lend money",
  receive: "Repayment received",
  repay: "Loan repayment",
  refund: "Expense refund",
  release: "Release reservation",
  opening: "Opening balance",
};
