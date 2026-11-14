import type { Wallet } from "./types";
import { check } from "./money";
import { categoryIcons } from "../category-options";
import { management, upgradeWallet } from "./wallet";

export function manageCategory(
  source: Wallet,
  input: { id: string; name?: string; icon?: string; archived?: boolean },
  remove = false,
): Wallet {
  const w = upgradeWallet(source),
    c = w.categories.find((c) => c.id === input.id);

  if (remove) {
    check(c, "Category not found.");
    if (c.archived) return w;
    management(w, "deleteCategory", input.id, c);
    c.archived = true;
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

