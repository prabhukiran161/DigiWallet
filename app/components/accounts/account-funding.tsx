import type { Allocation, Wallet } from "@/lib/ledger";
import { currency } from "@/lib/display";

interface AccountFundingProps {
  allocation: Allocation;
  wallet: Wallet;
  hidden?: boolean;
}

export function AccountFunding({
  allocation: f,
  wallet,
  hidden,
}: AccountFundingProps) {
  const amount = (n: number) => (hidden ? "••••" : currency(n));
  const holdingAccount = wallet.accounts.find((a) => a.id === f.holding);

  return (
    <section className="allocation">
      <div className="section-head">
        <h3>{f.purpose}</h3>
        <span className="pill">Purpose funding</span>
      </div>

      <div className="allocation-hero">
        <span>Remaining to use</span>
        <strong>{amount(f.remaining - f.committed)}</strong>
      </div>

      <progress
        max={Math.max(f.assigned, 1)}
        value={Math.min(f.used, f.assigned)}
        aria-label="Assigned funding used"
      />

      <div className="metric-pair">
        <div>
          <span>Funded spending</span>
          <strong>{amount(f.used)}</strong>
        </div>
        <div>
          <span>Card commitments</span>
          <strong>{amount(f.committed)}</strong>
        </div>
      </div>

      <details className="record-meta">
        <summary>Funding details</summary>
        <dl>
          <div>
            <dt>Assigned</dt>
            <dd>{amount(f.assigned)}</dd>
          </div>
          <div>
            <dt>Released</dt>
            <dd>{amount(f.released)}</dd>
          </div>
          <div>
            <dt>Returned</dt>
            <dd>{amount(f.returned)}</dd>
          </div>
          <div>
            <dt>Held in</dt>
            <dd>{holdingAccount?.name}</dd>
          </div>
        </dl>
      </details>
    </section>
  );
}

