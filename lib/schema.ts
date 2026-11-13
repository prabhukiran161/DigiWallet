import { z } from "zod";

const text = z.string().max(200);
const optional = text.optional();
const amount = z.string().regex(/^\d+(\.\d{1,2})?$/).max(18);

export const commandSchema = z
  .object({
    key: text.min(1),
    type: z.enum([
      "income",
      "expense",
      "borrow",
      "transfer",
      "invest",
      "capitalReturn",
      "cardPayment",
      "lend",
      "receive",
      "repay",
      "refund",
      "release",
    ]),
    amount,
    account: text.min(1),
    description: text.min(1),
    date: z.string().datetime({ offset: true }),
    notes: z.string().max(2000).optional(),
    target: optional,
    category: optional,
    counterparty: optional,
    purpose: optional,
    loanType: optional,
    terms: optional,
    dueDate: optional,
    interest: amount.optional(),
    fee: amount.optional(),
    reserve: z.boolean().optional(),
    allocation: optional,
    loanFunding: optional,
    returnUnused: z.boolean().optional(),
    original: optional,
  })
  .strict();

export const accountSchema = z
  .object({
    id: text.min(1),
    name: text.min(1),
    type: z.enum([
      "bank",
      "cash",
      "card",
      "investment",
      "loan",
      "receivable",
    ]),
    opening: amount.optional(),
    availableCredit: amount.optional(),
    date: z.string().datetime({ offset: true }),
    limit: amount.optional(),
    institution: optional,
    counterparty: optional,
    purpose: optional,
    loanType: optional,
    terms: optional,
    dueDate: optional,
  })
  .strict();

export const authSchema = z
  .object({
    mode: z.enum(["login", "register"]),
    email: z.string().email().max(254),
    password: z.string().min(10).max(128),
    name: z.string().min(1).max(80).optional(),
  })
  .strict();
