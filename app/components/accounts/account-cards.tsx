"use client";
import { useState } from "react";
import type { AccountCardsProps } from "./types";
import { AccountCard } from "./account-card";
import { AccountDetailModal } from "./account-detail-modal";

export function AccountCards({
  wallet,
  accounts,
  month,
  save,
  compact = false,
  hidden = false,
  initialSelected = "",
}: AccountCardsProps) {
  const [selected, setSelected] = useState(initialSelected);
  const detail = accounts.find((a) => a.id === selected);

  return (
    <>
      <div className={compact ? "account-strip" : "account-stack"}>
        {accounts.map((a) => (
          <AccountCard
            key={a.id}
            account={a}
            wallet={wallet}
            hidden={hidden}
            onSelect={() => setSelected(a.id)}
          />
        ))}
      </div>

      {detail && (
        <AccountDetailModal
          account={detail}
          wallet={wallet}
          month={month}
          save={save}
          hidden={hidden}
          onClose={() => setSelected("")}
        />
      )}
    </>
  );
}

