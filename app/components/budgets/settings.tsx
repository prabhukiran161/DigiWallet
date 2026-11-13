"use client";
import { useState } from "react";
import {
  Landmark,
  Tag,
  ChevronRight,
  Download,
  Globe,
  Plus,
  Check,
} from "lucide-react";
import type { Wallet } from "@/lib/ledger";
import { Field, Modal, InfoNote, type Save } from "../primitives";
import { CategoryManager } from "../category-manager";
import { AccountCards } from "../accounts";

interface SettingsProps {
  wallet: Wallet;
  save: Save;
  month: string;
}

export function Settings({ wallet, save, month }: SettingsProps) {
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [panel, setPanel] = useState(
    typeof window !== "undefined" &&
      new URLSearchParams(window.location.search).has("closed")
      ? "closed"
      : "",
  );
  const [busy, setBusy] = useState(false);

  async function submit(action: string, data: unknown) {
    setBusy(true);
    try {
      await save(action, data);
      setMessage("Saved");
      setError("");
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  const initialClosed =
    typeof window !== "undefined"
      ? new URLSearchParams(window.location.search).get("closed") || ""
      : "";

  return (
    <>
      <div className="settings-list">
        <button onClick={() => setPanel("closed")}>
          <span className="settings-icon">
            <Landmark size={19} />
          </span>
          <span>
            Closed accounts
            <small>Account details and history</small>
          </span>
          <ChevronRight size={18} />
        </button>

        <button
          onClick={() => {
            setPanel("categories");
            setError("");
            setMessage("");
          }}
        >
          <span className="settings-icon">
            <Tag size={19} />
          </span>
          <span>
            Categories
            <small>
              {wallet.categories.filter((c) => !c.archived).length} active
            </small>
          </span>
          <ChevronRight size={18} />
        </button>

        <button
          onClick={() => {
            setPanel("institution");
            setError("");
            setMessage("");
          }}
        >
          <span className="settings-icon">
            <Landmark size={19} />
          </span>
          <span>
            Institution catalog
            <small>Add a bank or provider</small>
          </span>
          <ChevronRight size={18} />
        </button>

        <a href="/api/wallet?export=1">
          <span className="settings-icon">
            <Download size={19} />
          </span>
          <span>
            Export my data
            <small>Download as JSON</small>
          </span>
          <ChevronRight size={18} />
        </a>

        <div className="settings-static">
          <span className="settings-icon">
            <Globe size={19} />
          </span>
          <span>
            Currency & timezone
            <small>INR · Asia/Kolkata</small>
          </span>
        </div>
      </div>

      {panel && (
        <Modal
          title={
            panel === "closed"
              ? "Closed accounts"
              : panel === "categories"
                ? "Categories"
                : "Add institution"
          }
          onClose={() => setPanel("")}
        >
          {panel === "closed" ? (
            <AccountCards
              wallet={wallet}
              accounts={wallet.accounts.filter((a) => a.closedAt)}
              month={month}
              save={save}
              initialSelected={initialClosed}
            />
          ) : panel === "categories" ? (
            <CategoryManager wallet={wallet} save={save} />
          ) : (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                void submit("institution", {
                  ...Object.fromEntries(new FormData(e.currentTarget)),
                  country: "IN",
                });
              }}
            >
              <Field label="Institution name">
                <input
                  name="name"
                  required
                  minLength={2}
                  maxLength={100}
                  placeholder="Bank or provider name"
                />
              </Field>
              <Field label="Type">
                <select name="kind">
                  <option value="bank">Bank</option>
                  <option value="investment">Investment provider</option>
                  <option value="lender">Lender</option>
                </select>
              </Field>
              <InfoNote label="Shared catalog">
                Institution names are shared. Your accounts and balances remain
                private. Logos are not yet supported.
              </InfoNote>
              <button className="primary full" disabled={busy}>
                Add institution
                <Plus size={17} />
              </button>
            </form>
          )}

          {error && (
            <p className="error" role="alert">
              {error}
            </p>
          )}

          {message && (
            <p className="inline-success" role="status">
              <Check size={16} />
              {message}
            </p>
          )}
        </Modal>
      )}
    </>
  );
}

