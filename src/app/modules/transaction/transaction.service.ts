import { Prisma, Transaction, UserRole } from '@prisma/client';
import prisma from '../../utils/prisma';
import { IGenericResponse, IPaginationOptions } from '../../interface/pagination';
import calculatePagination from '../../utils/calculatePagination';
import { ITransaction, ITransactionFilters, PaymentMethod, PaymentType } from './transaction.interface';
import AppError from '../../errors/AppError';
// Utility function to generate transaction ID
function generateTransactionId(): string {
  const prefix = 'TRX';
  const timestamp = Date.now().toString().slice(-8);
  const randomChars = Math.random().toString(36).substring(2, 8).toUpperCase();
  
  return `${prefix}-${timestamp}-${randomChars}`;
}

// Create a transaction record
const createTransaction = async (data: ITransaction) => {
  // Generate a unique transaction ID if not provided
  const transactionId = data.transactionId || generateTransactionId();

  // Create the transaction record
  // Ensure customerId is provided
  if (!data.customerId) {
    throw new AppError(400, 'Customer ID is required for regular transactions');
  }
  
  // Prepare the data object with proper type handling
  const transactionData: Prisma.TransactionCreateInput = {
    transactionId,
    date: data.date || new Date(),
    amount: data.amount,
    paymentMethod: data.paymentMethod as any, // Cast to any to avoid type issues
    paymentType: data.paymentType as any, // Cast to any to avoid type issues
    status: data.status,
    addOnsList: data.addOnsList || [],
    description: data.description,
    notes: data.notes,
    customer: {
      connect: { id: data.customerId }
    }
  };
  
  // Add optional relations if provided
  if (data.reservationId) {
    transactionData.reservation = {
      connect: { id: data.reservationId }
    };
  }
  
  if (data.serviceId) {
    transactionData.service = {
      connect: { id: data.serviceId }
    };
  }
  
  if (data.employeeId) {
    transactionData.employee = {
      connect: { id: data.employeeId }
    };
  }
  
  const result = await prisma.transaction.create({
    data: transactionData,
    include: {
      reservation: true,
      service: true,
      employee: true,
      customer: true,
    },
  });

  return result;
};

// Create transaction for first installment payment
const createFirstInstallmentTransaction = async (
  reservationId: string,
  paymentMethod: PaymentMethod 
) => {
  const reservation = await prisma.reservation.findUnique({
    where: { id: reservationId },
    include: {
      service: true,
      user: true,
    },
  });

  if (!reservation) {
    throw new AppError(404, 'Reservation not found');
  }

  if (!reservation.firstInstallmentAmount) {
    throw new AppError(400, 'First installment amount not found');
  }

  // Prepare the data object with proper type handling for first installment transaction
  const transactionData: Prisma.TransactionCreateInput = {
    transactionId: generateTransactionId(),
    amount: reservation.firstInstallmentAmount,
    paymentMethod: paymentMethod as any, // Cast to any to avoid type issues
    paymentType: PaymentType.first_installment as any, // Cast to any to avoid type issues
    status: 'successful',
    description: `First installment payment for reservation ${reservation.id}`,
    reservation: {
      connect: { id: reservation.id }
    },
    service: {
      connect: { id: reservation.serviceId }
    },
    customer: {
      connect: { id: reservation.userId }
    }
  };
  
  // Create transaction record
  const result = await prisma.transaction.create({
    data: transactionData,
    include: {
      reservation: true,
      service: true,
      customer: true,
    },
  });

  return result;
};

// Create transaction for second installment payment
const createSecondInstallmentTransaction = async (
  reservationId: string,
  paymentMethod: string = 'stripe'
) => {
  const reservation = await prisma.reservation.findUnique({
    where: { id: reservationId },
    include: {
      service: true,
      user: true,
      employee: true,
    },
  });

  if (!reservation) {
    throw new AppError(404, 'Reservation not found');
  }

  if (!reservation.secondInstallmentAmount) {
    throw new AppError(400, 'Second installment amount not found');
  }

  // Prepare the data object with proper type handling for second installment transaction
  const transactionData: Prisma.TransactionCreateInput = {
    transactionId: generateTransactionId(),
    amount: reservation.secondInstallmentAmount,
    paymentMethod: paymentMethod as any, // Cast to any to avoid type issues
    paymentType: PaymentType.second_installment as any, // Cast to any to avoid type issues
    status: 'successful',
    description: `Second installment payment for reservation ${reservation.id}`,
    reservation: {
      connect: { id: reservation.id }
    },
    service: {
      connect: { id: reservation.serviceId }
    },
    customer: {
      connect: { id: reservation.userId }
    }
  };
  
  // Add employee if available
  if (reservation.employeeId) {
    transactionData.employee = {
      connect: { id: reservation.employeeId }
    };
  }
  
  // Create transaction record
  const result = await prisma.transaction.create({
    data: transactionData,
    include: {
      reservation: true,
      service: true,
      employee: true,
      customer: true,
    },
  });

  return result;
};

// Create a custom expense transaction
const createExpenseTransaction = async (data: ITransaction): Promise<Transaction> => {
  // Generate a unique transaction ID
  const transactionId = generateTransactionId();

  // For expense transactions, we need to handle the case where customerId might not be provided
  // For expense transactions, we don't require either customerId or employeeId, but if both are missing,
  // we'll use a system user (super_admin) as the default customer

  // If no customerId is provided but we have an employeeId, find a default system user (super_admin)
  let customerId = data.customerId;
  if (!customerId) {
    // Find the super_admin user to use as the default customer for system expenses
    const systemUser = await prisma.user.findFirst({
      where: {
        role: UserRole.super_admin
      }
    });
    
    if (!systemUser) {
      throw new AppError(404, 'No system user found to associate with the expense');
    }
    
    customerId = systemUser.id;
  }

  // Prepare the data object with proper type handling for expense transaction
  const transactionData: Prisma.TransactionCreateInput = {
    transactionId,
    date: data.date || new Date(),
    amount: data.amount,
    paymentMethod: data.paymentMethod as any, // Cast to any to avoid type issues
    paymentType: PaymentType.expense as any, // Cast to any to avoid type issues
    status: data.status || 'completed',
    addOnsList: data.addOnsList || [],
    description: data.description || 'Expense transaction',
    notes: data.notes,
    customer: {
      connect: { id: customerId }
    }
  };
  
  // Add optional relations if provided
  if (data.reservationId) {
    transactionData.reservation = {
      connect: { id: data.reservationId }
    };
  }
  
  if (data.serviceId) {
    transactionData.service = {
      connect: { id: data.serviceId }
    };
  }
  
  if (data.employeeId) {
    transactionData.employee = {
      connect: { id: data.employeeId }
    };
  }
  
  // Create the transaction record with expense type
  const result = await prisma.transaction.create({
    data: transactionData,
    include: {
      reservation: true,
      service: true,
      employee: true,
      customer: true,
    },
  });

  return result;
};

// Get all transactions with filtering and pagination
const getAllTransactions = async (
  filters: ITransactionFilters,
  options: IPaginationOptions,
  userId?: string,
  userRole?: string
): Promise<IGenericResponse<Transaction[]>> => {
  const { page, limit, skip, sortBy, sortOrder } = calculatePagination(options);
  const { searchTerm, paymentType, startDate, endDate, customerId, employeeId, reservationId, serviceId } = filters;

  const andConditions = [];

  // Apply role-based filtering
  if (userRole === UserRole.user || userRole === UserRole.property_manager) {
    andConditions.push({
      customerId: userId as string,
    });
  } else if (userRole === UserRole.employee) {
    andConditions.push({
      employeeId: userId as string,
    });
  }
  // For manager and super_admin, no additional filtering is needed - they see all transactions

  // Apply search term filtering
  if (searchTerm) {
    andConditions.push({
      OR: [
        {
          transactionId: {
            contains: searchTerm,
            mode: Prisma.QueryMode.insensitive,
          },
        },
        {
          description: {
            contains: searchTerm,
            mode: Prisma.QueryMode.insensitive,
          },
        },
        {
          notes: {
            contains: searchTerm,
            mode: Prisma.QueryMode.insensitive,
          },
        },
      ],
    });
  }

  // Apply date range filtering
  if (startDate && endDate) {
    andConditions.push({
      date: {
        gte: new Date(startDate),
        lte: new Date(endDate),
      },
    });
  }

  // Apply payment type filtering
  if (paymentType) {
    andConditions.push({
      paymentType: paymentType as any, // Cast to any to avoid type issues with Prisma
    });
  }

  // Apply customer filtering
  if (customerId) {
    andConditions.push({
      customerId,
    });
  }

  // Apply employee filtering
  if (employeeId) {
    andConditions.push({
      employeeId,
    });
  }

  // Apply reservation filtering
  if (reservationId) {
    andConditions.push({
      reservationId,
    });
  }

  // Apply service filtering
  if (serviceId) {
    andConditions.push({
      serviceId,
    });
  }

  // Construct the where condition
  const whereCondition: Prisma.TransactionWhereInput = 
    andConditions.length > 0 ? { AND: andConditions as Prisma.TransactionWhereInput[] } : {};

  // Get transactions with pagination
  const result = await prisma.transaction.findMany({
    where: whereCondition,
    skip,
    take: limit,
    orderBy: sortBy && sortOrder ? { [sortBy]: sortOrder } : { createdAt: 'desc' },
    include: {
      reservation: true,
      service: true,
      employee: true,
      customer: true,
    },
  });

  // Get total count for pagination
  const total = await prisma.transaction.count({
    where: whereCondition,
  });

  return {
    success: true,
    statusCode: 200,
    message: 'Transactions retrieved successfully',
    meta: {
      page,
      limit,
      total,
      totalPage: Math.ceil(total / limit),
    },
    data: result,
  };
};

// Get transactions for completed reservations by employee
const getEmployeeCompletedTransactions = async (
  options: IPaginationOptions,
  employeeId?: string
): Promise<IGenericResponse<Transaction[]>> => {
  const { page, limit, skip, sortBy, sortOrder } = calculatePagination(options);

  // Find transactions where the employee is assigned and reservation status is completed
  if (!employeeId) {
    throw new AppError(400, 'Employee ID is required');
  }
  
  const result = await prisma.transaction.findMany({
    where: {
      employeeId,
      reservation: {
        status: 'completed' as any, // Cast to any to avoid type issues with Prisma
      },
    },
    skip,
    take: limit,
    orderBy: sortBy && sortOrder ? { [sortBy]: sortOrder } : { createdAt: 'desc' },
    include: {
      reservation: true,
      service: true,
      customer: true,
    },
  });

  // Get total count for pagination
  const total = await prisma.transaction.count({
    where: {
      employeeId,
      reservation: {
        status: 'completed' as any, // Cast to any to avoid type issues with Prisma
      },
    },
  });

  return {
    success: true,
    statusCode: 200,
    message: 'Employee completed transactions retrieved successfully',
    meta: {
      page,
      limit,
      total,
      totalPage: Math.ceil(total / limit),
    },
    data: result,
  };
};

// Get a single transaction by ID
const getSingleTransaction = async (id: string) => {
  const result = await prisma.transaction.findUnique({
    where: { id },
    include: {
      reservation: true,
      service: true,
      employee: true,
      customer: true,
    },
  });

  if (!result) {
    throw new AppError(404, 'Transaction not found');
  }

  return result;
};

export const TransactionService = {
  createTransaction,
  createFirstInstallmentTransaction,
  createSecondInstallmentTransaction,
  createExpenseTransaction,
  getAllTransactions,
  getEmployeeCompletedTransactions,
  getSingleTransaction,
};
