import { ChevronLeft, Plus } from "lucide-react";
import { BrandLogo } from "../brand-logo";
import styles from "./app-header.module.css";
import type { View } from "@/app/views/types";

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
      <header className={`${styles.homeHeader} flex items-center justify-between gap-2.5 px-[clamp(16px,5vw,22px)] py-5`}>
        <div className="flex min-w-0 flex-1 items-center gap-2.5">
          <span className="grid size-[clamp(38px,11vw,52px)] shrink-0 place-items-center">
            <BrandLogo size={52} />
          </span>
          <span aria-hidden="true" className={`${styles.divider} h-10 w-0.5 shrink-0 rounded-full`} />
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
      ? "Your activity"
      : view === "Settings"
        ? "Profile & settings"
        : view === "Budget"
          ? "Your budget"
          : "Your accounts";

  return (
    <header className="app-header">
      <button
        className="icon-button"
        onClick={() => onNavigate("Home")}
        aria-label="Back to home"
      >
        <ChevronLeft size={22} />
      </button>
      <h1>{title}</h1>
      {view === "Accounts" ? (
        <button
          className="icon-button"
          onClick={onAddAccount}
          aria-label="Add account"
        >
          <Plus size={21} />
        </button>
      ) : (
        <span className="header-spacer" />
      )}
    </header>
  );
}

