import { z } from 'zod';
import { ServiceStatus, PaymentStatus } from '@prisma/client';

const create = z.object({
  body: z.object({
    serviceId: z.string({
      required_error: 'Service ID is required',
    }),
    providePaint: z.boolean({
      required_error: 'Provide paint option is required',
    }),
    beforeImages: z.array(z.string()).min(1, 'At least one before image is required'),
    scheduledDate: z.string({
      required_error: 'Scheduled date is required',
    }),
    amount: z.number({
      required_error: 'Amount is required',
    }),
  }),
});

const update = z.object({
  body: z.object({
    employeeId: z.string().optional(),
    status: z.enum([...Object.values(ServiceStatus)] as [string, ...string[]]).optional(),
    afterImages: z.array(z.string()).optional(),
    paymentStatus: z.enum([...Object.values(PaymentStatus)] as [string, ...string[]]).optional(),
  }),
});

export const ReservationValidation = {
  create,
  update,
};
