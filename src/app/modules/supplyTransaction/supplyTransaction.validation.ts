import { z } from 'zod';

export const supplyTransactionSchema = z.object({
  supplyId: z.string({
    required_error: 'Supply ID is required',
  }),
  employeeId: z.string({
    required_error: 'Employee ID is required',
  }),
  quantity: z.number({
    required_error: 'Quantity is required',
  }).positive('Quantity must be positive'),
  type: z.enum(['assigned', 'returned'], {
    required_error: 'Type must be either "assigned" or "returned"',
  }),
  date: z.date().optional(),
  notes: z.string().optional(),
});

export const supplyTransactionFilterSchema = z.object({
  employeeId: z.string().optional(),
  supplyId: z.string().optional(),
  type: z.enum(['assigned', 'returned']).optional(),
  startDate: z.string().optional().transform(val => val ? new Date(val) : undefined),
  endDate: z.string().optional().transform(val => val ? new Date(val) : undefined),
});
