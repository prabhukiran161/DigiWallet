import { Wallet as WalletIcon, ChevronLeft, Plus } from "lucide-react";
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
      <header className="app-header">
        <div className="greeting">
          <span className="brand-mark small">
            <WalletIcon size={21} />
          </span>
          <div>
            <span className="muted">Hello, {userName.split(" ")[0]}</span>
            <h1>
              Your DigiWallet<span>.</span>
            </h1>
          </div>
        </div>
        <button
          className="avatar"
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

