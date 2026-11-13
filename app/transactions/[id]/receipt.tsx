import type { Wallet, Journal } from "@/lib/ledger";
import { labels } from "@/lib/display";
import { CategoryIcon } from "../../components/category-icon";
import { amountLabel } from "../../components/history";

const FIELD_LABELS: Record<string, string> = {
  counterparty: "Lender / borrower",
  purpose: "Purpose",
  loanType: "Loan type",
  terms: "Terms",
  dueDate: "Due date",
  interest: "Interest (₹)",
  fee: "Fee (₹)",
  returnUnused: "Unused funds returned",
};

interface TransactionReceiptProps {
  wallet: Wallet;
  event: Journal;
  format: (date: string) => string;
}

export function TransactionReceipt({
  wallet,
  event,
  format,
}: TransactionReceiptProps) {
  const isReceiving = [
    "income",
    "borrow",
    "receive",
    "refund",
    "capitalReturn",
  ].includes(event.type);

  const loanFundingId =
    event.command?.loanFunding ||
    wallet.allocations.find((f) => f.id === event.command?.allocation)?.loan;
  const loanFundingName = loanFundingId
    ? wallet.accounts.find((a) => a.id === loanFundingId)?.name
    : null;
  const categoryName =
    wallet.categories.find((c) => c.id === event.category)?.name ||
    "Not applicable";

  return (
    <>
      <div className="transaction-receipt">
        <span className="receipt-icon">
          <CategoryIcon wallet={wallet} category={event.category} size={29} />
        </span>
        <span className="pill">{labels[event.type]}</span>
        <strong className="receipt-amount">{amountLabel(event)}</strong>
        <h2>{event.description}</h2>
        <p>{format(event.date)}</p>
      </div>

      <dl className="receipt-fields">
        <div>
          <dt>Category</dt>
          <dd>{categoryName}</dd>
        </div>
        <div>
          <dt>Recorded</dt>
          <dd>{format(event.recordedAt)}</dd>
        </div>
        <div>
          <dt>Timezone</dt>
          <dd>{wallet.timezone}</dd>
        </div>
        {event.command && (
          <>
            <div>
              <dt>{isReceiving ? "Receiving account" : "Payment account"}</dt>
              <dd>
                {wallet.accounts.find((a) => a.id === event.command?.account)?.name}
              </dd>
            </div>
            {event.command.target && (
              <div>
                <dt>Linked account</dt>
                <dd>
                  {
                    wallet.accounts.find((a) => a.id === event.command?.target)
                      ?.name
                  }
                </dd>
              </div>
            )}
          </>
        )}
        {event.notes && (
          <div>
            <dt>Notes</dt>
            <dd>{event.notes}</dd>
          </div>
        )}
        {event.command &&
          Object.entries(event.command)
            .filter(
              ([key, value]) =>
                [
                  "counterparty",
                  "purpose",
                  "loanType",
                  "terms",
                  "dueDate",
                  "interest",
                  "fee",
                  "returnUnused",
                ].includes(key) &&
                value !== undefined &&
                value !== "" &&
                value !== false,
            )
            .map(([key, value]) => (
              <div key={key}>
                <dt>{FIELD_LABELS[key] || key}</dt>
                <dd>{String(value)}</dd>
              </div>
            ))}
        {loanFundingName && (
          <div>
            <dt>Loan funding</dt>
            <dd>{loanFundingName}</dd>
          </div>
        )}
      </dl>
    </>
  );
}

