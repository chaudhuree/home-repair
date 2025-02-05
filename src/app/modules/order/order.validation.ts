import { z } from 'zod';
import { OrderPaymentStatus } from '@prisma/client';

const create = z.object({
  body: z.object({
    reservationId: z.string({
      required_error: 'Reservation ID is required',
    }),
    totalAmount: z.number({
      required_error: 'Total amount is required',
    }),
    currency: z.string().default('USD'),
  }),
});

const update = z.object({
  body: z.object({
    paymentStatus: z.enum([...Object.values(OrderPaymentStatus)] as [string, ...string[]]).optional(),
    paymentIntent: z.string().optional(),
  }),
});

export const OrderValidation = {
  create,
  update,
};
