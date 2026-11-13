import type { Wallet, Journal } from "@/lib/ledger";

interface RevisionHistoryProps {
  wallet: Wallet;
  event: Journal;
  format: (date: string) => string;
}

export function RevisionHistory({
  wallet,
  event,
  format,
}: RevisionHistoryProps) {
  if (!event.revisions?.length) return null;

  return (
    <details className="disclosure">
      <summary>Edit history · {event.revisions.length}</summary>
      {event.revisions.map((r, i) => (
        <div className="revision-record" key={i}>
          <strong>
            Before edit {i + 1} · {format(r.editedAt)}
          </strong>
          <dl className="receipt-fields">
            {Object.entries(r.command)
              .filter(([key]) => key !== "key")
              .map(([key, value]) => {
                const displayValue = ["account", "target", "loanFunding"].includes(
                  key,
                )
                  ? wallet.accounts.find((a) => a.id === value)?.name ||
                    String(value)
                  : String(value);

                return (
                  <div key={key}>
                    <dt>{key}</dt>
                    <dd>{displayValue}</dd>
                  </div>
                );
              })}
          </dl>
        </div>
      ))}
    </details>
  );
}

