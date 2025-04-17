import { z } from 'zod';

export const addOnValidationSchema = z.object({
  name: z.string().min(1),
  description: z.string().min(1),
  price: z.number().nonnegative(),
  quantity: z.number().int().nonnegative(),
});
