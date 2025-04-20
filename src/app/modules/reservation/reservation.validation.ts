import { z } from 'zod';
import { ServiceStatus, PaymentStatus, RefundStatus } from '@prisma/client';

const addressSchema = z.object({
  streetAddress: z.string({
    required_error: 'Street address is required',
  }),
  apartmentSuitUnit: z.string({
    required_error: 'Apartment/Suite/Unit is required',
  }),
  city: z.string({
    required_error: 'City is required',
  }),
  state: z.string({
    required_error: 'State is required',
  }),
});

const reservationAddOnSchema = z.object({
  addOnId: z.string({
    required_error: 'AddOn ID is required',
  }),
  quantity: z.number({
    required_error: 'Quantity is required',
  }).min(1, 'Quantity must be at least 1'),
});

const create = z.object({
  body: z.object({
    serviceId: z.string({
      required_error: 'Service ID is required',
    }),
    spaceTypeId: z.string({
      required_error: 'Space Type ID is required',
    }),
    packageTypeId: z.string({
      required_error: 'Package Type ID is required',
    }),
    providePaint: z.boolean({
      required_error: 'Provide paint option is required',
    }),
    paintPrice: z.number().optional(),
    customersGivenImages: z.array(z.string()).min(1, 'At least one image is required'),
    projectDescription: z.string().optional(),
    accessInstructionDetails: z.string().optional(),
    address: addressSchema,
    userSelectedDates: z.array(z.string()).min(1, 'At least one date is required'),
    amount: z.number({
      required_error: 'Amount is required',
    }).min(0, 'Amount must be positive').optional(), // Make amount optional as it will be calculated on the server
    addOns: z.array(reservationAddOnSchema).optional(),
  }),
});

const update = z.object({
  body: z.object({
    employeeId: z.string().optional(),
    status: z.enum([...Object.values(ServiceStatus)] as [string, ...string[]]).optional(),
    beforeImages: z.array(z.string()).optional(),
    afterImages: z.array(z.string()).optional(),
    projectDescription: z.string().optional(),
    accessInstructionDetails: z.string().optional(),
    scheduledDate: z.string().optional(),
    firstInstallmentPaid: z.boolean().optional(),
    secondInstallmentPaid: z.boolean().optional(),
    workStartTime: z.string().optional(),
    workEndTime: z.string().optional(),
    refundStatus: z.enum([...Object.values(RefundStatus)] as [string, ...string[]]).optional(),
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

const processFirstInstallment = z.object({
  body: z.object({
    paymentMethodId: z.string({
      required_error: 'Payment method ID is required',
    }),
  }),
});

const processSecondInstallment = z.object({
  body: z.object({
    // No additional fields needed for second installment as we'll use the stored payment method
  }),
});

const processCashback = z.object({
  body: z.object({
    reviewImage: z.string({
      required_error: 'Review image is required',
    }),
  }),
});

const addReservationAddOn = z.object({
  body: z.object({
    addOnId: z.string({
      required_error: 'AddOn ID is required',
    }),
    quantity: z.number({
      required_error: 'Quantity is required',
    }).min(1, 'Quantity must be at least 1'),
  }),
});

const removeReservationAddOn = z.object({
  body: z.object({
    addOnId: z.string({
      required_error: 'AddOn ID is required',
    }),
  }),
});

const createWithPayment = z.object({
  body: z.object({
    // Combine reservation data with payment method ID
    serviceId: z.string({
      required_error: 'Service ID is required',
    }),
    spaceTypeId: z.string({
      required_error: 'Space Type ID is required',
    }),
    packageTypeId: z.string({
      required_error: 'Package Type ID is required',
    }),
    providePaint: z.boolean({
      required_error: 'Provide paint option is required',
    }),
    paintPrice: z.number().optional(),
    customersGivenImages: z.array(z.string()).min(1, 'At least one image is required'),
    projectDescription: z.string().optional(),
    accessInstructionDetails: z.string().optional(),
    address: addressSchema,
    userSelectedDates: z.array(z.string()).min(1, 'At least one date is required'),
    amount: z.number({
      required_error: 'Amount is required',
    }).min(0, 'Amount must be positive').optional(), // Make amount optional as it will be calculated on the server
    addOns: z.array(reservationAddOnSchema).optional(),
    // Payment method ID for processing first installment
    paymentMethodId: z.string({
      required_error: 'Payment method ID is required',
    }),
  }),
});

export const ReservationValidation = {
  create,
  update,
  updatePayment,
  assignEmployee,
  processFirstInstallment,
  processSecondInstallment,
  processCashback,
  addReservationAddOn,
  removeReservationAddOn,
  createWithPayment,
};
