"use client";
import { useState } from "react";
import { Check, Plus, Archive, Trash2 } from "lucide-react";
import { categoryUsed, type Wallet } from "@/lib/ledger";
import { categoryIcons } from "@/lib/category-options";
import { CategoryIcon } from "./category-icon";
import { Field, Modal, type Save } from "./primitives";

interface CategoryManagerProps {
  wallet: Wallet;
  save: Save;
}

export function CategoryManager({ wallet, save }: CategoryManagerProps) {
  const [selected, setSelected] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [name, setName] = useState("");
  const [icon, setIcon] = useState("other");
  const [confirm, setConfirm] = useState(false);

  const category = wallet.categories.find((c) => c.id === selected);

  async function submit(action: string, data: unknown) {
    setError("");
    setBusy(true);
    try {
      await save(action, data);
      setSelected(null);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  function open(id: string) {
    const c = wallet.categories.find((c) => c.id === id);
    setSelected(id);
    setName(c?.name || "");
    setIcon(c?.icon || c?.id || "other");
    setConfirm(false);
    setError("");
  }

  return (
    <>
      <div className="category-management">
        {wallet.categories.map((c) => (
          <button
            key={c.id}
            className="category-manage-row"
            onClick={() => open(c.id)}
          >
            <span className={`transaction-icon category-${c.id}`}>
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
          onClose={() => setSelected(null)}
        >
          <form
            onSubmit={(e) => {
              e.preventDefault();
              void submit("category", {
                id: category?.id || crypto.randomUUID(),
                name,
                icon,
              });
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

            <button className="primary full" disabled={busy}>
              <Check size={17} />
              {category ? "Save changes" : "Create category"}
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
                    })
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
                      void submit("deleteCategory", { id: category.id })
                    }
                  >
                    Delete
                  </button>
                </div>
              )}
            </>
          )}

          {error && (
            <p className="error" role="alert">
              {error}
            </p>
          )}
        </Modal>
      )}
    </>
  );
}
