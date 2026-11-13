import {
  House,
  WalletCards,
  Plus,
  History as HistoryIcon,
  ChartNoAxesCombined,
} from "lucide-react";
import type { View } from "@/app/views/types";

interface BottomNavProps {
  view: View;
  onNavigate: (view: View) => void;
  onRecord: () => void;
}

export function BottomNav({ view, onNavigate, onRecord }: BottomNavProps) {
  return (
    <nav className="bottom-nav" aria-label="Main navigation">
      <button
        aria-current={view === "Home" ? "page" : undefined}
        onClick={() => onNavigate("Home")}
      >
        <House size={21} />
        <span>Home</span>
      </button>
      <button
        aria-current={view === "Accounts" ? "page" : undefined}
        onClick={() => onNavigate("Accounts")}
      >
        <WalletCards size={21} />
        <span>Accounts</span>
      </button>
      <button
        className="nav-add"
        aria-label="Add transaction"
        onClick={onRecord}
      >
        <span>
          <Plus size={25} />
        </span>
      </button>
      <button
        aria-current={view === "Activity" ? "page" : undefined}
        onClick={() => onNavigate("Activity")}
      >
        <HistoryIcon size={21} />
        <span>Activity</span>
      </button>
      <button
        aria-current={view === "Budget" ? "page" : undefined}
        onClick={() => onNavigate("Budget")}
      >
        <ChartNoAxesCombined size={21} />
        <span>Budget</span>
      </button>
    </nav>
  );
}

