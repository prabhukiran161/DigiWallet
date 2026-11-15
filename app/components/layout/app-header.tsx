import { ChevronLeft, Plus } from "lucide-react";
import { BrandLogo } from "../brand-logo";
import styles from "./app-header.module.css";
import type { View } from "@/app/views/types";
import type { ReactNode } from "react";

interface AppHeaderProps {
  view: View;
  userName: string;
  onNavigate: (view: View) => void;
  onAddAccount: () => void;
}

export function AppHeader({
  view,
  userName,
  onNavigate,
  onAddAccount,
}: AppHeaderProps) {
  if (view === "Home") {
    return (
      <header
        className={`${styles.homeHeader} flex items-center justify-between gap-2.5 px-[clamp(16px,5vw,22px)] py-5`}
      >
        <div className="flex min-w-0 flex-1 items-center gap-2.5">
          <span className="grid size-[clamp(38px,11vw,52px)] shrink-0 place-items-center">
            <BrandLogo size={52} />
          </span>
          <span
            aria-hidden="true"
            className={`${styles.divider} h-10 w-0.5 shrink-0 rounded-full`}
          />
          <div className="min-w-0">
            <span className="mb-1 block truncate text-sm leading-tight font-semibold text-[#4d5871]">
              Hello, {userName.trim().split(/\s+/)[0]}
            </span>
            <h1 className={styles.headline}>
              Make Every Rupee Count<span className="text-[#0057ff]">.</span>
            </h1>
          </div>
        </div>
        <button
          type="button"
          className={`${styles.profile} grid size-[clamp(42px,13vw,56px)] shrink-0 place-items-center rounded-full text-[21px] font-bold text-[#0646e6]`}
          onClick={() => onNavigate("Settings")}
          aria-label="Open profile and settings"
        >
          {userName.slice(0, 1).toUpperCase()}
        </button>
      </header>
    );
  }

  const title =
    view === "Activity"
      ? "Activity"
      : view === "Settings"
        ? "Profile & settings"
        : view === "Budget"
          ? "Budget"
          : "Accounts";

  return (
    <PageHeader title={title} onBack={() => onNavigate("Home")} backLabel="Back to home">
      {view === "Accounts" && (
        <button type="button" className="icon-button" onClick={onAddAccount} aria-label="Add account">
          <Plus size={21} />
        </button>
      )}
    </PageHeader>
  );
}

export function PageHeader({ title, titleIcon, titleId, onBack, backLabel = "Go back", children }: {
  title: string;
  titleIcon?: ReactNode;
  titleId?: string;
  onBack: () => void;
  backLabel?: string;
  children?: ReactNode;
}) {
  return (
    <header className={`app-header ${styles.pageHeader}`}>
      <button
        type="button"
        className="icon-button"
        onClick={onBack}
        aria-label={backLabel}
      >
        <ChevronLeft size={22} />
      </button>
      <h1 id={titleId}>
        {titleIcon ? (
          <span className={styles.titleWithIcon}>
            <span className={styles.titleIcon} aria-hidden="true">{titleIcon}</span>
            <span>{title}</span>
          </span>
        ) : title}
      </h1>
      {children ?? <span className="header-spacer" />}
    </header>
  );
}
