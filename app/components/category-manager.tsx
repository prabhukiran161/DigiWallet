"use client";
import { useEffect, useState } from "react";
import { Check, CircleAlert, Plus, Archive, Trash2, X } from "lucide-react";
import { categoryUsed, type Wallet } from "@/lib/ledger";
import { categoryIcons } from "@/lib/category-options";
import { categoryBadgeStyle, categoryColors, type CategoryColor } from "@/lib/category-colors";
import { CategoryIcon } from "./category-icon";
import { Field, Modal, type Save } from "./primitives";
import styles from "./category-manager.module.css";

interface CategoryManagerProps {
  wallet: Wallet;
  save: Save;
}

export function CategoryManager({ wallet, save }: CategoryManagerProps) {
  const [selected, setSelected] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<{ message: string; error?: boolean } | null>(null);
  const [name, setName] = useState("");
  const [icon, setIcon] = useState("other");
  const [color, setColor] = useState<string | null>(null);
  const [confirm, setConfirm] = useState(false);

  const category = wallet.categories.find((c) => c.id === selected);

  useEffect(() => {
    if (!notice) return;
    const timer = setTimeout(() => setNotice(null), 4500);
    return () => clearTimeout(timer);
  }, [notice]);

  async function submit(action: string, data: unknown, message: string) {
    if (busy) return;
    setNotice(null);
    setBusy(true);
    try {
      await save(action, data);
      setNotice({ message });
      setSelected(null);
    } catch (e) {
      setNotice({ message: e instanceof Error ? e.message : "Couldn't save the category.", error: true });
    } finally {
      setBusy(false);
    }
  }

  function open(id: string) {
    setNotice(null);
    const c = wallet.categories.find((c) => c.id === id);
    setSelected(id);
    setName(c?.name || "");
    setIcon(c?.icon || c?.id || "other");
    setColor(c?.color ?? null);
    setConfirm(false);
  }

  const toast = notice && (
    <div className={styles.toast}>
      {notice.error ? <CircleAlert size={18} aria-hidden /> : <Check size={18} aria-hidden />}
      <span role={notice.error ? "alert" : "status"}>{notice.message}</span>
      <button type="button" aria-label="Dismiss notification" onClick={() => setNotice(null)}>
        <X size={16} aria-hidden />
      </button>
    </div>
  );

  return (
    <>
      {selected === null && toast}
      <div className="category-management">
        {wallet.categories.map((c) => (
          <button
            key={c.id}
            className="category-manage-row"
            onClick={() => open(c.id)}
          >
            <span className={`transaction-icon category-${c.id}`} style={categoryBadgeStyle(c.color)}>
              <CategoryIcon category={c.id} wallet={wallet} />
            </span>
            <span>
              <strong>{c.name}</strong>
              <small>
                {c.archived
                  ? "Archived"
                  : categoryUsed(wallet, c.id)
                    ? "In use"
                    : "Unused"}
              </small>
            </span>
          </button>
        ))}
      </div>

      <button className="primary full" onClick={() => open("")}>
        <Plus size={17} />
        New category
      </button>

      {selected !== null && (
        <Modal
          title={category ? "Manage category" : "New category"}
          onClose={() => { setSelected(null); setNotice(null); }}
        >
          <form
            aria-busy={busy}
            onSubmit={(e) => {
              e.preventDefault();
              void submit("category", {
                id: category?.id || crypto.randomUUID(),
                name,
                icon,
                color,
              }, category ? "Category saved." : "Category created.");
            }}
          >
            <Field label="Category name">
              <input
                required
                maxLength={50}
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </Field>

            <fieldset className="category-picker">
              <legend>Icon</legend>
              <div className="icon-picker">
                {categoryIcons.map((i) => (
                  <button
                    key={i}
                    type="button"
                    aria-label={i}
                    title={i}
                    aria-pressed={icon === i}
                    className={icon === i ? "selected" : ""}
                    disabled={busy}
                    onClick={() => setIcon(i)}
                  >
                    <CategoryIcon category={i} size={22} />
                  </button>
                ))}
              </div>
            </fieldset>

            <fieldset className="mb-5">
              <legend className="mb-2 text-sm font-semibold">Category color</legend>
              <div className="grid grid-cols-[repeat(auto-fit,minmax(75px,1fr))] gap-2">
                <button type="button" aria-pressed={color === null} disabled={busy}
                  className="min-h-11 rounded-xl border border-[var(--line)] px-1 text-xs aria-pressed:border-[var(--blue)] aria-pressed:bg-[var(--soft)]"
                  onClick={() => setColor(null)}>Default</button>
                {(Object.entries(categoryColors) as [CategoryColor, { label: string; hex: string }][]).map(([key, option]) => (
                  <button key={key} type="button" aria-pressed={color === key} disabled={busy}
                    className="flex min-h-11 items-center justify-center gap-1 rounded-xl border border-[var(--line)] px-1 text-[11px] aria-pressed:border-[var(--blue)] aria-pressed:bg-[var(--soft)]"
                    onClick={() => setColor(key)}>
                    <span aria-hidden="true" className="size-3 shrink-0 rounded-full" style={{ backgroundColor: option.hex }} />
                    {option.label}
                  </button>
                ))}
              </div>
            </fieldset>

            <button className="primary full" disabled={busy}>
              <Check size={17} />
              {busy ? "Saving…" : category ? "Save changes" : "Create category"}
            </button>
          </form>

          {category && (
            <>
              {category.archived ? (
                <button
                  className="secondary full"
                  disabled={busy}
                  onClick={() =>
                    void submit("category", {
                      id: category.id,
                      archived: false,
                    }, "Category restored.")
                  }
                >
                  <Archive size={17} />
                  Restore category
                </button>
              ) : (
                <button
                  className="text-button danger"
                  disabled={busy}
                  onClick={() => setConfirm(true)}
                >
                  <Trash2 size={16} />
                  Delete category
                </button>
              )}

              {confirm && (
                <div className="inset">
                  <p>
                    Delete {category.name}? It will stay on past transactions
                    and be removed from the picker for new transactions.
                  </p>
                  <button
                    className="secondary"
                    onClick={() => setConfirm(false)}
                  >
                    Cancel
                  </button>
                  <button
                    className="primary"
                    disabled={busy}
                    onClick={() =>
                      void submit("deleteCategory", { id: category.id }, "Category archived.")
                    }
                  >
                    Delete
                  </button>
                </div>
              )}
            </>
          )}

          {toast}
        </Modal>
      )}
    </>
  );
}
