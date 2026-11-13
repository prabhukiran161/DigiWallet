import { LogOut } from "lucide-react";
import type { Wallet } from "@/lib/ledger";
import type { Save } from "../components/primitives";
import { Settings } from "../components/budgets";

interface SettingsViewProps {
  user: { name: string };
  wallet: Wallet;
  month: string;
  save: Save;
  onSignOut: () => void;
}

export function SettingsView({
  user,
  wallet,
  month,
  save,
  onSignOut,
}: SettingsViewProps) {
  return (
    <>
      <div className="profile-card">
        <span className="avatar large">
          {user.name.slice(0, 1).toUpperCase()}
        </span>
        <h2>{user.name}</h2>
        <span className="pill">Personal wallet · INR</span>
      </div>

      <Settings wallet={wallet} save={save} month={month} />

      <button className="logout-button" onClick={onSignOut}>
        <LogOut size={17} />
        Sign out
      </button>
    </>
  );
}

