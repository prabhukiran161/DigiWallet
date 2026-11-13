import { z } from "zod";
import {
  createAccount,
  post,
  editAccount,
  manageAccount,
  setCreditLimit,
  editTransaction,
  manageCategory,
  saveBudget,
  type Wallet,
} from "@/lib/ledger";
import { accountSchema, commandSchema } from "@/lib/schema";

export function executeWalletAction(
  w: Wallet,
  action: string,
  data: unknown,
): Wallet {
  switch (action) {
    case "account":
      return createAccount(w, accountSchema.parse(data));

    case "transaction":
      return post(w, commandSchema.parse(data));

    case "editAccount":
      return editAccount(w, accountSchema.parse(data));

    case "editTransaction": {
      const d = z
        .object({
          id: z.string(),
          command: commandSchema,
          expectedRevision: z.number().int().nonnegative(),
          requestKey: z.string().min(1).max(100),
        })
        .strict()
        .parse(data);
      return editTransaction(w, d.id, d.command, d.expectedRevision, d.requestKey);
    }

    case "creditLimit": {
      const d = z
        .object({
          id: z.string(),
          limit: z.string(),
          date: z.string().datetime({ offset: true }),
        })
        .strict()
        .parse(data);
      return setCreditLimit(w, d.id, d.limit, d.date);
    }

    case "archive":
    case "deleteAccount":
    case "closeAccount": {
      const d = z.object({ id: z.string() }).strict().parse(data);
      return manageAccount(w, d.id, action);
    }

    case "rename": {
      const d = z
        .object({ id: z.string(), name: z.string().trim().min(1).max(100) })
        .strict()
        .parse(data);
      const a = w.accounts.find((a) => a.id === d.id);
      if (!a || a.closedAt) throw new Error("Choose an open account.");
      (w.managementHistory ??= []).push({
        action: "rename",
        id: a.id,
        at: new Date().toISOString(),
        before: { name: a.name },
      });
      a.name = d.name;
      return w;
    }

    case "category": {
      const d = z
        .object({
          id: z.string().min(1).max(100),
          name: z.string().max(50).optional(),
          icon: z.string().optional(),
          archived: z.boolean().optional(),
        })
        .strict()
        .parse(data);
      return manageCategory(w, d);
    }

    case "deleteCategory": {
      const d = z.object({ id: z.string() }).strict().parse(data);
      return manageCategory(w, d, true);
    }

    case "budget": {
      const d = z
        .object({
          month: z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/),
          total: z.string(),
          categories: z.record(z.string(), z.string()),
        })
        .strict()
        .parse(data);
      return saveBudget(w, d);
    }

    default:
      throw new Error(`Unsupported action: ${action}`);
  }
}

