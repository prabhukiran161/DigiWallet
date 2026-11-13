import type { EventType, Wallet } from "@/lib/ledger";
import { currency } from "@/lib/display";
import { Field } from "../primitives";
import { CategoryIcon } from "../category-icon";

interface CategoryPickerProps {
  type: EventType;
  wallet: Wallet;
  account: string;
  category: string;
  originalExpense?: string;
  editingCategory?: string;
  onSelectCategory: (categoryId: string) => void;
  onSelectOriginalExpense: (expenseId: string) => void;
}

export function CategoryPicker({
  type,
  wallet,
  account,
  category,
  originalExpense,
  editingCategory,
  onSelectCategory,
  onSelectOriginalExpense,
}: CategoryPickerProps) {
  return (
    <>
      {type === "refund" && (
        <Field label="Original expense">
          <select
            required
            value={originalExpense || ""}
            onChange={(e) => onSelectOriginalExpense(e.target.value)}
          >
            <option value="">Choose expense</option>
            {wallet.events
              .filter(
                (e) =>
                  e.type === "expense" &&
                  e.command?.account === account &&
                  !e.command.allocation &&
                  !e.command.loanFunding,
              )
              .map((e) => (
                <option key={e.id} value={e.id}>
                  {e.description} · {currency(e.expense)}
                </option>
              ))}
          </select>
        </Field>
      )}

      {["expense", "repay"].includes(type) && (
        <fieldset className="category-picker">
          <legend>Category</legend>
          <div>
            {wallet.categories
              .filter((c) => !c.archived || c.id === editingCategory)
              .map((c) => (
                <button
                  key={c.id}
                  type="button"
                  className={category === c.id ? "selected" : ""}
                  aria-pressed={category === c.id}
                  onClick={() => onSelectCategory(c.id)}
                >
                  <CategoryIcon category={c.id} size={17} wallet={wallet} />
                  {c.name}
                </button>
              ))}
          </div>
        </fieldset>
      )}
    </>
  );
}

