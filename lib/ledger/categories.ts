import type { Wallet } from "./types";
import { check } from "./money";
import { categoryUsed } from "./queries";
import { categoryIcons } from "../category-options";
import { management, upgradeWallet } from "./wallet";

export function manageCategory(
  source: Wallet,
  input: { id: string; name?: string; icon?: string; archived?: boolean },
  remove = false,
): Wallet {
  const w = upgradeWallet(source),
    c = w.categories.find((c) => c.id === input.id);
  const used = categoryUsed(w, input.id);

  if (remove) {
    check(c, "Category not found.");
    check(!c.system, "Predefined categories can be archived, not deleted.");
    check(!used, "Categories with transactions can only be archived.");
    check(
      !Object.values(w.budgets).some((b) =>
        Object.hasOwn(b.categories, input.id),
      ),
      "This category is referenced by a budget. Archive it to preserve history.",
    );
    management(w, "deleteCategory", input.id, c);
    w.categories = w.categories.filter((c) => c.id !== input.id);
    return w;
  }

  const name = (input.name ?? c?.name ?? "").trim(),
    icon = input.icon ?? c?.icon ?? "other";
  check(
    name.length > 0 && name.length <= 50,
    "Enter a category name (maximum 50 characters).",
  );
  check(
    categoryIcons.includes(icon as never),
    "Choose a predefined category icon.",
  );
  check(
    !c || !used || (name === c.name && icon === c.icon),
    "Categories with transactions cannot be renamed or have their icon changed.",
  );

  if (c) {
    management(w, "editCategory", c.id, c);
    Object.assign(c, {
      name,
      icon,
      archived: input.archived ?? c.archived,
    });
  } else {
    w.categories.push({ id: input.id, name, icon, archived: false, system: false });
  }
  return w;
}

