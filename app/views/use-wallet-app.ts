import { useCallback, useEffect, useState } from "react";
import { localDate, upgradeWallet, type Wallet, type EventType } from "@/lib/ledger";
import type { Institution } from "../components/account-form";
import type { View, AccountFilter } from "./types";

export function useWalletApp() {
  const [user, setUser] = useState<{ name: string } | null>(null);
  const [wallet, setWallet] = useState<Wallet | null>(null);
  const [institutions, setInstitutions] = useState<Institution[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [view, setView] = useState<View>("Home");
  const [modal, setModal] = useState("");
  const [entry, setEntry] = useState<EventType>("expense");
  const [day, setDay] = useState("");
  const [month, setMonth] = useState(() =>
    localDate(new Date().toISOString(), "Asia/Kolkata").slice(0, 7),
  );
  const [notice, setNotice] = useState("");
  const [hidden, setHidden] = useState(false);
  const [filter, setFilter] = useState<AccountFilter>("All");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const rAuth = await fetch("/api/auth");
      const textAuth = await rAuth.text().catch(() => "");
      let authData: { user?: { name: string } | null; error?: string } = {};
      try {
        authData = JSON.parse(textAuth);
      } catch {}
      if (!rAuth.ok) {
        throw new Error(
          authData.error || `Authentication service error (${rAuth.status})`,
        );
      }
      setUser(authData.user || null);
      if (authData.user) {
        const res = await fetch("/api/wallet");
        const textWallet = await res.text().catch(() => "");
        let data: {
          wallet?: Wallet;
          institutions?: Institution[];
          error?: string;
        } = {};
        try {
          data = JSON.parse(textWallet);
        } catch {}
        if (!res.ok) {
          throw new Error(data.error || `Wallet service error (${res.status})`);
        }
        if (data.wallet) setWallet(upgradeWallet(data.wallet));
        if (data.institutions) setInstitutions(data.institutions);
      }
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const q = new URLSearchParams(window.location.search);
    const target = q.get("view");
    if (["Home", "Accounts", "Activity", "Budget", "Settings"].includes(target || "")) {
      setView(target as View);
    }
    if (/^\d{4}-(0[1-9]|1[0-2])$/.test(q.get("month") || "")) {
      setMonth(q.get("month")!);
    }
    void load();
  }, [load]);

  useEffect(() => {
    if (!notice) return;
    const timer = setTimeout(() => setNotice(""), 3500);
    return () => clearTimeout(timer);
  }, [notice]);

  async function save(action: string, data: unknown) {
    const res = await fetch("/api/wallet", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, data }),
    });
    const text = await res.text().catch(() => "");
    let result: {
      wallet?: Wallet;
      institutions?: Institution[];
      error?: string;
    } = {};
    try {
      result = JSON.parse(text);
    } catch {}
    if (!res.ok) {
      throw new Error(
        result.error ||
          (text ? text.slice(0, 100) : `Unable to save (${res.status}).`),
      );
    }
    if (result.wallet) setWallet(upgradeWallet(result.wallet));
    if (result.institutions) setInstitutions(result.institutions);
    setNotice("Saved");
  }

  function navigate(next: View) {
    setView(next);
    setDay("");
    window.scrollTo({ top: 0, behavior: "instant" });
  }

  function record(type: EventType = "expense") {
    setEntry(type);
    setModal("transaction");
  }

  function changeMonth(n: number) {
    const [y, m] = month.split("-").map(Number);
    const date = new Date(y, m - 1 + n, 1);
    setMonth(
      `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`,
    );
    setDay("");
  }

  async function signOut() {
    try {
      const r = await fetch("/api/auth", { method: "DELETE" });
      if (!r.ok) throw new Error("Could not sign out. Try again.");
      setUser(null);
      setWallet(null);
    } catch (e) {
      setNotice((e as Error).message);
    }
  }

  return {
    user,
    wallet,
    institutions,
    loading,
    error,
    view,
    modal,
    setModal,
    entry,
    day,
    setDay,
    month,
    setMonth,
    changeMonth,
    notice,
    hidden,
    setHidden,
    filter,
    setFilter,
    load,
    save,
    navigate,
    record,
    signOut,
  };
}

