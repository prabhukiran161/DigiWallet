import primitives from "../components/primitives.module.css";
import layout from "../components/layout/layout.module.css";
import home from "../views/home-view.module.css";
import accountCards from "../components/accounts/account-card.module.css";
import accounts from "../components/accounts/account-management.module.css";
import history from "../components/history/history.module.css";
import budgets from "../components/budgets/budget-view.module.css";
import forms from "../components/forms.module.css";
import settings from "../components/budgets/settings.module.css";
import categories from "../components/category-manager.module.css";
import auth from "../components/auth.module.css";
import transaction from "../transactions/[id]/transaction.module.css";

const scopeClasses = (...modules: Array<Record<string, string>>) =>
  modules.map((styles) => styles.scope).join(" ");

export const appStyleScopes = scopeClasses(
  primitives,
  layout,
  home,
  accountCards,
  accounts,
  history,
  budgets,
  forms,
  settings,
  categories,
);

export const authStyleScopes = scopeClasses(primitives, layout, forms, auth);

export const transactionStyleScopes = scopeClasses(
  primitives,
  layout,
  history,
  forms,
  transaction,
);
