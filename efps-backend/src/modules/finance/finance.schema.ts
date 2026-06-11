import { z } from 'zod';

export const incomeSchema = z.object({
  source: z.string().min(1).max(100),
  amount: z.number().positive(),
  entry_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  description: z.string().optional(),
});

export const expenseSchema = z.object({
  category: z.string().min(1).max(100),
  amount: z.number().positive(),
  entry_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  description: z.string().optional(),
  bill_reference: z.string().optional(),
});

export const financeQuerySchema = z.object({
  month: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  start_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  end_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  page: z.coerce.number().optional().default(1),
  limit: z.coerce.number().optional().default(20),
});

export type IncomeInput = z.infer<typeof incomeSchema>;
export type ExpenseInput = z.infer<typeof expenseSchema>;
export type FinanceQueryInput = z.infer<typeof financeQuerySchema>;
