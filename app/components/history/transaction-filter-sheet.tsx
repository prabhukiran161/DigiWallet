"use client";

import { useEffect, useId, useRef, useState, type FormEvent, type ReactNode } from "react";
import { ArrowLeftRight, CalendarDays, Check, ChevronDown, Coins, Layers, LayoutGrid, Repeat2, X } from "lucide-react";
import { findInstitution } from "@/lib/institutions";
import { localDate, money, type Wallet, type EventType } from "@/lib/ledger";
import { categoryBadgeStyle } from "@/lib/category-colors";
import { ACCOUNT_ICONS } from "../accounts/types";
import { AmountInput } from "../amount-input";
import { CategoryIcon } from "../category-icon";
import { InstitutionMark, useInstitutionCatalog } from "../institution-brand";
import { transactionTypeIcons, transactionTypeLabels } from "../transaction-form/transaction-type-picker";
import sheet from "./transaction-search-sheet.module.css";
import styles from "./transaction-filter-sheet.module.css";
import { DatePicker } from "../layout/date-picker";

export interface TransactionFilters {
  account: string[];
  category: string[];
  type: string[];
  from: string;
  to: string;
  min: string;
  max: string;
  transfers: boolean;
}

const emptyFilters: TransactionFilters = {
  account: [], category: [], type: [], from: "", to: "", min: "", max: "", transfers: true,
};

type Option = { value: string; label: string; icon?: ReactNode };
type SelectField = "account" | "category" | "type";

export function TransactionFilterSheet({ wallet, initial, onApply, onClose, fixedAccount }: {
  wallet: Wallet;
  initial: TransactionFilters;
  onApply: (filters: TransactionFilters) => void;
  onClose: () => void;
  fixedAccount?: string;
}) {
  const [draft, setDraft] = useState(initial);
  const [expanded, setExpanded] = useState<SelectField>();
  const [error, setError] = useState("");
  const dialog = useRef<HTMLDialogElement>(null);
  const id = useId();
  const catalog = useInstitutionCatalog();
  const today = localDate(new Date().toISOString(), wallet.timezone);

  useEffect(() => {
    const element = dialog.current;
    const trigger = document.activeElement;
    element?.showModal();
    return () => {
      element?.close();
      if (trigger instanceof HTMLElement && trigger.isConnected) trigger.focus({ preventScroll: true });
    };
  }, []);

  function set<K extends keyof TransactionFilters>(field: K, value: TransactionFilters[K]) {
    setDraft((current) => ({ ...current, [field]: value }));
    setError("");
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (draft.from && draft.to && draft.from > draft.to) {
      setError("The end date must be on or after the start date.");
      return;
    }
    try {
      const min = draft.min ? money(draft.min) : 0;
      const max = draft.max ? money(draft.max) : Infinity;
      if (min > max) {
        setError("The maximum amount must be at least the minimum amount.");
        return;
      }
    } catch {
      setError("Enter a valid amount range.");
      return;
    }
    onApply(draft);
  }

  const accounts: Option[] = [
    { value: "", label: "All accounts" },
    ...wallet.accounts.map((account) => {
      const institution = findInstitution(catalog, account.institution, account.type);
      const Icon = ACCOUNT_ICONS[account.type];
      return { value: account.id, label: account.name, icon: (
        <InstitutionMark src={institution?.logoUrl}><Icon size={17} aria-hidden /></InstitutionMark>
      ) };
    }),
  ];
  const categories: Option[] = [
    { value: "", label: "All categories" },
    ...wallet.categories.map((category) => ({
      value: category.id,
      label: category.name,
      icon: <span className={styles.categoryIcon} style={categoryBadgeStyle(category.color)}>
        <CategoryIcon category={category.id} wallet={wallet} size={16} />
      </span>,
    })),
  ];
  const types: Option[] = [
    { value: "", label: "All types" },
    { value: "opening", label: "Opening Balance", icon: <ArrowLeftRight size={17} aria-hidden /> },
    ...Object.entries(transactionTypeIcons).map(([value, Icon]) => ({
      value, label: transactionTypeLabels[value as EventType], icon: <Icon size={17} aria-hidden />,
    })),
  ];

  function picker(field: SelectField, label: string, options: Option[], icon: ReactNode) {
    const values = draft[field];
    const selected = options.find((option) => option.value === values[0]) ?? options[0];
    const summary = values.length > 1 ? `${values.length} selected` : selected.label;
    const open = expanded === field;
    const optionsId = `${id}-${field}`;
    return (
      <div className={styles.group} data-filter-picker={field} data-expanded={open}>
        <span className={styles.label}>{icon}{label}</span>
        <button type="button" className={styles.select} aria-expanded={open}
          aria-controls={open ? optionsId : undefined}
          aria-label={`${label}: ${summary}`}
          onClick={() => setExpanded(open ? undefined : field)}>
          {values.length === 1 && selected.icon}<span>{summary}</span><ChevronDown size={16} aria-hidden />
        </button>
        {open && (
          <div className={`${styles.options} ${field === "type" ? styles.typeOptions : ""}`} id={optionsId}>
            {options.map((option) => {
              const checked = option.value ? values.includes(option.value) : values.length === 0;
              return (
                <button type="button" key={option.value} aria-pressed={checked}
                  title={option.label}
                  onClick={() => set(field, !option.value ? [] : checked
                    ? values.filter((value) => value !== option.value)
                    : [...values, option.value])}>
                  {option.icon}<span>{option.label}</span>{checked && <Check size={13} aria-hidden />}
                </button>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  return (
    <dialog ref={dialog} className={`${sheet.sheet} ${styles.dialog}`} aria-labelledby={`${id}-title`}
      onPointerDown={(event) => {
        if (expanded && event.target instanceof Element &&
          !event.target.closest(`[data-filter-picker="${expanded}"]`)) setExpanded(undefined);
      }}
      onCancel={(event) => {
        event.preventDefault();
        if (!expanded) {
          onClose();
          return;
        }
        dialog.current?.querySelector<HTMLButtonElement>(`[data-filter-picker="${expanded}"] [aria-expanded]`)
          ?.focus({ preventScroll: true });
        setExpanded(undefined);
      }}>
      <header className={styles.header}>
        <span className={styles.handle} aria-hidden />
        <h2 id={`${id}-title`}>Filter Transactions</h2>
        <button type="button" aria-label="Close filters" onClick={onClose}><X size={20} /></button>
      </header>
      <form className={styles.form} onSubmit={submit}>
        <fieldset className={styles.group}>
          <div className={styles.label}><CalendarDays size={17} aria-hidden /> Date Range</div>
          <div className={styles.pair}>
            <DatePicker label="From" value={draft.from} today={today} max={draft.to || undefined} onChange={(value) => set("from", value)} />
            <DatePicker label="To" value={draft.to} today={today} min={draft.from || undefined} onChange={(value) => set("to", value)} />
          </div>
        </fieldset>
        <div className={fixedAccount ? undefined : styles.pair}>
          {!fixedAccount && picker("account", "Account", accounts, <Layers size={17} aria-hidden />)}
          {picker("category", "Category", categories, <LayoutGrid size={17} aria-hidden />)}
        </div>
        {picker("type", "Type", types, <ArrowLeftRight size={17} aria-hidden />)}
        <fieldset className={styles.group}>
          <div className={styles.label}><Coins size={17} aria-hidden /> Amount Range</div>
          <div className={styles.pair}>
            <AmountInput aria-label="Minimum amount" placeholder="Min amount" value={draft.min} onValueChange={(value) => set("min", value)} />
            <AmountInput aria-label="Maximum amount" placeholder="Max amount" value={draft.max} onValueChange={(value) => set("max", value)} />
          </div>
        </fieldset>
        <label className={`${styles.group} ${styles.toggle}`}>
          <span className={styles.label}><Repeat2 size={17} aria-hidden /> Include transfers</span>
          <input type="checkbox" role="switch" checked={draft.transfers} onChange={(event) => set("transfers", event.target.checked)} />
        </label>
        <footer className={styles.footer}>
          {error && <p role="alert">{error}</p>}
          <div className={styles.pair}>
            <button type="button" onClick={() => { setDraft(emptyFilters); setExpanded(undefined); setError(""); }}>Clear All</button>
            <button type="submit">Apply Filters</button>
          </div>
        </footer>
      </form>
    </dialog>
  );
}
