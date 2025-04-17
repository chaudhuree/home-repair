import { z } from 'zod';

export const packageTypeValidationSchema = z.object({
  name: z.string().min(1),
  description: z.array(z.string().min(1)),
  price: z.number().nonnegative(),
});
