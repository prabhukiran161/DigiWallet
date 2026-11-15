import { useState } from "react";
import { findInstitution } from "@/lib/institutions";
import type { Account, Wallet } from "@/lib/ledger";
import { History } from "../history";
import { InstitutionMark, useInstitutionCatalog } from "../institution-brand";
import { Modal } from "../primitives";
import { ACCOUNT_ICONS } from "./types";
import styles from "./account-detail-modal.module.css";

interface AccountDetailModalProps {
  account: Account;
  wallet: Wallet;
  month: string;
  hidden?: boolean;
  onClose: () => void;
}

export function AccountDetailModal({
  account,
  wallet,
  month,
  hidden,
  onClose,
}: AccountDetailModalProps) {
  const [historyMonth, setHistoryMonth] = useState(month);
  const institution = findInstitution(useInstitutionCatalog(), account.institution, account.type);
  const Icon = ACCOUNT_ICONS[account.type];

  return (
    <Modal
      title={account.name}
      titleIcon={<InstitutionMark src={institution?.logoUrl} size={32}><Icon size={32} /></InstitutionMark>}
      className={styles.screen}
      onClose={onClose}
      pageHeader
    >
      <History
        wallet={wallet}
        month={historyMonth}
        onSetMonth={setHistoryMonth}
        account={account.id}
        hidden={hidden}
        activity
      />
    </Modal>
  );
}

