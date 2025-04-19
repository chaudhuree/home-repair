import { z } from 'zod';

export const supplyValidationSchema = z.object({
  name: z.string().min(1),
  category: z.string().min(1),
  measureUnit: z.string().min(1),
  quantity: z.number().int().nonnegative(),
  status: z.boolean().optional(),
});

export const supplyAssignmentValidationSchema = z.object({
  supplyId: z.string().min(1),
  userId: z.string().min(1),
  quantity: z.number().int().positive(),
  isReturned: z.boolean().optional(),
  assignDate: z.date().optional(),
  returnDate: z.date().optional(),
});

export const supplyReturnValidationSchema = z.object({
  supplyId: z.string().min(1),
  userId: z.string().min(1),
  quantity: z.number().int().positive(),
  returnDate: z.date().optional(),
});
