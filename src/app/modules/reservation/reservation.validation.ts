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
    }).min(0, 'Amount must be positive'),
  }),
});

const update = z.object({
  body: z.object({
    employeeId: z.string().optional(),
    status: z.enum([...Object.values(ServiceStatus)] as [string, ...string[]]).optional(),
    afterImages: z.array(z.string()).optional(),
    firstInstallmentPaid: z.boolean().optional(),
    secondInstallmentPaid: z.boolean().optional(),
  }),
});

const updatePayment = z.object({
  body: z.object({
    firstInstallmentPaid: z.boolean().optional(),
    secondInstallmentPaid: z.boolean().optional(),
  }).refine(data => data.firstInstallmentPaid !== undefined || data.secondInstallmentPaid !== undefined, {
    message: 'At least one installment payment status must be provided'
  }),
});

const assignEmployee = z.object({
  body: z.object({
    employeeId: z.string({
      required_error: 'Employee ID is required',
    }),
  }),
});

export const ReservationValidation = {
  create,
  update,
  updatePayment,
  assignEmployee,
};
