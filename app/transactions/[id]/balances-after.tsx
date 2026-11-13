import type { Wallet, Journal } from "@/lib/ledger";
import { availableBalance } from "@/lib/ledger";
import { currency } from "@/lib/display";

interface BalancesAfterProps {
  wallet: Wallet;
  event: Journal;
}

export function BalancesAfter({ wallet, event }: BalancesAfterProps) {
  const relevantAccounts = wallet.accounts.filter(
    (a) =>
      event.lines.some((l) => l.account === a.id) ||
      event.id === `opening-${a.id}` ||
      event.command?.account === a.id ||
      event.command?.loanFunding === a.id,
  );

  return (
    <>
      <h2 className="form-section-title">Balances after this transaction</h2>
      <div className="receipt-balances">
        {relevantAccounts.map((a) => {
          const typeLabel =
            a.type === "card"
              ? "Available credit"
              : a.type === "loan"
                ? "Loan outstanding"
                : "Balance";

          return (
            <div key={a.id}>
              <span>
                {a.name}
                <small>{typeLabel}</small>
              </span>
              <strong>
                {currency(availableBalance(wallet, a, event.date, event))}
              </strong>
            </div>
          );
        })}
      </div>
    </>
  );
}

