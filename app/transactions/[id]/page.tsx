"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { ArrowLeft, Pencil } from "lucide-react";
import { withinEditWindow, type Wallet } from "@/lib/ledger";
import { TransactionForm } from "../../components/transaction-form";
import { TransactionReceipt } from "./receipt";
import { BalancesAfter } from "./balances-after";
import { RevisionHistory } from "./revision-history";

export default function TransactionDetails() {
  const { id } = useParams<{ id: string }>();
  const [wallet, setWallet] = useState<Wallet | null>(null);
  const [error, setError] = useState("");
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [now, setNow] = useState(Date.now());
  const [back, setBack] = useState("/?view=Activity");

  useEffect(() => {
    const q = new URLSearchParams(window.location.search);
    setEditing(q.get("edit") === "1");
    setBack(
      q.get("account")
        ? `/?view=Accounts&account=${encodeURIComponent(q.get("account")!)}&month=${q.get("month") || ""}`
        : `/?view=Activity&month=${q.get("month") || ""}`,
    );

    const abort = new AbortController();
    fetch("/api/wallet", { signal: abort.signal })
      .then(async (r) => {
        const d = await r.json();
        if (!r.ok) throw new Error(d.error || "Could not load transaction.");
        setWallet(d.wallet);
        if (
          d.wallet.accounts.some(
            (a: { id: string; closedAt?: string }) =>
              a.id === q.get("account") && a.closedAt,
          )
        ) {
          setBack(
            `/?view=Settings&closed=${encodeURIComponent(q.get("account")!)}&month=${q.get("month") || ""}`,
          );
        }
      })
      .catch((e) => {
        if (!abort.signal.aborted) setError(e.message);
      })
      .finally(() => {
        if (!abort.signal.aborted) setLoading(false);
      });

    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => {
      abort.abort();
      clearInterval(timer);
    };
  }, [id]);

  const event = wallet?.events.find((e) => e.id === id);
  const canEdit = Boolean(event?.command && withinEditWindow(event.recordedAt, now));

  async function save(action: string, data: unknown) {
    const r = await fetch("/api/wallet", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, data }),
    });
    const d = await r.json();
    if (!r.ok) throw new Error(d.error || "Unable to save.");
    setWallet(d.wallet);
  }

  const format = (date: string) =>
    new Date(date).toLocaleString("en-IN", {
      timeZone: wallet?.timezone,
      dateStyle: "medium",
      timeStyle: "short",
    });

  return (
    <div className="phone-shell transaction-page">
      <header className="app-header">
        <a className="icon-button" href={back} aria-label="Back to transactions">
          <ArrowLeft size={21} />
        </a>
        <h1>{editing && canEdit ? "Edit transaction" : "Transaction details"}</h1>
        <span className="header-spacer" />
      </header>

      <main className="mobile-content">
        {loading ? (
          <p role="status">Loading transaction…</p>
        ) : error ? (
          <p className="error" role="alert">
            {error}
          </p>
        ) : !wallet || !event ? (
          <p>Transaction not found.</p>
        ) : editing && canEdit ? (
          <TransactionForm
            key={`${event.id}-${event.revision || 0}`}
            wallet={wallet}
            editing={event}
            save={save}
            onDone={() => setEditing(false)}
          />
        ) : (
          <>
            <TransactionReceipt wallet={wallet} event={event} format={format} />

            {canEdit ? (
              <button
                className="primary full"
                onClick={() => setEditing(true)}
              >
                <Pencil size={17} />
                Edit transaction
              </button>
            ) : (
              event.command && (
                <p className="notice">The 24-hour editing window has ended.</p>
              )
            )}

            <BalancesAfter wallet={wallet} event={event} />

            <RevisionHistory wallet={wallet} event={event} format={format} />

            <details className="disclosure">
              <summary>Record identifier</summary>
              <p className="record-id">{event.id}</p>
            </details>
          </>
        )}
      </main>
    </div>
  );
}
