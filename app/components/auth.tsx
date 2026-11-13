"use client";
import { useState } from "react";
import { Wallet, ArrowRight, ShieldCheck, WalletCards } from "lucide-react";
import { Field } from "./primitives";

interface AuthProps {
  onDone: () => void;
}

export function Auth({ onDone }: AuthProps) {
  const [mode, setMode] = useState<"login" | "register">("register");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError("");
    const d = Object.fromEntries(new FormData(e.currentTarget));

    try {
      const res = await fetch("/api/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...d, mode }),
      });
      const text = await res.text().catch(() => "");
      let result: { error?: string } = {};
      try {
        result = JSON.parse(text);
      } catch {}

      if (!res.ok) {
        throw new Error(
          result.error || `Authentication failed (${res.status}).`,
        );
      }
      onDone();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="phone-shell auth-shell">
      <div className="auth-brand">
        <span className="brand-mark small">
          <Wallet size={22} />
        </span>
        DigiWallet<span>.</span>
      </div>

      <div className="auth-art" aria-hidden="true">
        <div className="art-card back" />
        <div className="art-card front">
          <WalletCards size={28} />
          <span>DigiWallet</span>
          <i />
          <strong>
            Your money.
            <br />
            Your world.
          </strong>
          <div className="art-circles">
            <i />
            <i />
          </div>
        </div>
        <span className="art-orb" />
      </div>

      <section className="auth-form">
        <h1>{mode === "register" ? "A little more clarity." : "Welcome back."}</h1>
        <p>
          {mode === "register"
            ? "Your accounts. Your spending. All together."
            : "Your wallet is right where you left it."}
        </p>

        <form onSubmit={handleSubmit}>
          {mode === "register" && (
            <Field label="Your name">
              <input
                name="name"
                autoComplete="name"
                placeholder="What should we call you?"
                required
                maxLength={80}
              />
            </Field>
          )}

          <Field label="Email">
            <input
              name="email"
              type="email"
              autoComplete="email"
              placeholder="you@example.com"
              required
            />
          </Field>

          <Field
            label="Password"
            hint={mode === "register" ? "At least 10 characters" : undefined}
          >
            <input
              name="password"
              type="password"
              autoComplete={
                mode === "register" ? "new-password" : "current-password"
              }
              minLength={10}
              maxLength={128}
              placeholder="Enter your password"
              required
            />
          </Field>

          {error && (
            <p role="alert" className="error">
              {error}
            </p>
          )}

          <button className="primary full" disabled={busy}>
            {busy
              ? "Please wait…"
              : mode === "register"
                ? "Create wallet"
                : "Sign in"}
            <ArrowRight size={18} />
          </button>
        </form>

        <button
          className="auth-switch"
          onClick={() => {
            setMode(mode === "register" ? "login" : "register");
            setError("");
          }}
        >
          {mode === "register" ? (
            <>
              Already have a wallet? <strong>Sign in</strong>
            </>
          ) : (
            <>
              New to DigiWallet? <strong>Create wallet</strong>
            </>
          )}
        </button>

        <div className="auth-trust">
          <ShieldCheck size={14} />
          Private records. No real payments.
        </div>
      </section>
    </main>
  );
}
