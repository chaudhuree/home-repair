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
  paymentMethod: PaymentMethod,
  paymentIntentId?: string
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
    description: paymentIntentId 
      ? `First installment payment for reservation ${reservation.id} (Stripe Payment ID: ${paymentIntentId})` 
      : `First installment payment for reservation ${reservation.id}`,
    notes: paymentIntentId ? `Stripe Payment ID: ${paymentIntentId}` : undefined,
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
  paymentMethod: string = 'stripe',
  paymentIntentId?: string
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
    description: paymentIntentId 
      ? `Second installment payment for reservation ${reservation.id} (Stripe Payment ID: ${paymentIntentId})` 
      : `Second installment payment for reservation ${reservation.id}`,
    notes: paymentIntentId ? `Stripe Payment ID: ${paymentIntentId}` : undefined,
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
const getAllTransactions = async (
  filters: ITransactionFilters,
  options: IPaginationOptions,
  userId: string,
  userRole: string
): Promise<IGenericResponse<any>> => {
  const { page, limit, skip } = calculatePagination(options);
  const { searchTerm, paymentType, startDate, endDate, customerId, employeeId, reservationId, serviceId } = filters;
  console.log(userId, userRole);
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
      customerId: customerId,
    });
  }

  // Apply employee filtering
  if (employeeId) {
    andConditions.push({
      employeeId: employeeId,
    });
  }

  // Apply reservation filtering
  if (reservationId) {
    andConditions.push({
      reservationId: reservationId,
    });
  }

  // Apply service filtering
  if (serviceId) {
    andConditions.push({
      serviceId: serviceId,
    });
  }

  // Construct the where condition
  const whereConditions: Prisma.TransactionWhereInput =
    andConditions.length > 0 ? { AND: andConditions } : {};

  // Get transactions with detailed information
  const result = await prisma.transaction.findMany({
    where: whereConditions,
    skip,
    take: limit,
    orderBy:
      options.sortBy && options.sortOrder
        ? { [options.sortBy]: options.sortOrder }
        : {
            createdAt: 'desc',
          },
    include: {
      reservation: {
        include: {
          service: true,
          reservationAddOns: {
            include: {
              addOn: true
            }
          }
        }
      },
      customer: true,
      employee: true,
      service: true
    }
  });

  // Transform the result to include required fields
  const transformedResult = result.map(transaction => {
    const addOnsList = transaction.reservation?.reservationAddOns.map(item => ({
      name: item.addOn.name,
      price: item.addOn.price,
      quantity: item.quantity
    })) || [];

    return {
      id: transaction.id,
      date: transaction.date,
      transactionId: transaction.transactionId,
      reservationId: transaction.reservationId,
      serviceName: transaction.reservation?.service?.name || transaction.service?.name || 'N/A',
      paymentMethod: transaction.paymentMethod,
      paymentType: transaction.paymentType,
      amount: transaction.amount,
      employeeName: transaction.employee?.name || 'N/A',
      customerName: transaction.customer?.name || 'N/A',
      status: transaction.status,
      description: transaction.description,
      notes: transaction.notes,
      addOnsList
    };
  });

  const total = await prisma.transaction.count({
    where: whereConditions,
  });

  // Calculate statistics based on filtered transactions
  let totalPayments = 0;
  let totalExpense = 0;
  let totalRevenue = 0;

  result.forEach(transaction => {
    const paymentType = transaction.paymentType;
    if (paymentType === 'first_installment' || paymentType === 'second_installment') {
      totalPayments += transaction.amount;
      totalRevenue += transaction.amount;
    } else if (paymentType === 'expense') {
      totalExpense += transaction.amount;
      totalRevenue -= transaction.amount;
    } else if (paymentType === 'refunded' || paymentType === 'cashback') {
      totalExpense += transaction.amount;
      totalRevenue -= transaction.amount;
    }
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
      totalPayments,
      totalExpense,
      totalRevenue
    },
    data: transformedResult,
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

// Create a cashback transaction record
const createCashbackTransaction = async (
  cashbackId: string,
  userId: string,
  reservationId: string,
  amount: number,
  paymentMethod: PaymentMethod = PaymentMethod.stripe,
  paymentId?: string
): Promise<Transaction> => {
  // Get the reservation details
  const reservation = await prisma.reservation.findUnique({
    where: { id: reservationId },
    include: {
      service: true,
    },
  });

  if (!reservation) {
    throw new AppError(404, 'Reservation not found');
  }

  // Get the cashback details
  const cashback = await prisma.cashback.findUnique({
    where: { id: cashbackId },
  });

  if (!cashback) {
    throw new AppError(404, 'Cashback record not found');
  }

  // Prepare the data object with proper type handling for cashback transaction
  const transactionData: Prisma.TransactionCreateInput = {
    transactionId: generateTransactionId(),
    date: new Date(),
    amount,
    paymentMethod: paymentMethod as any, // Cast to any to avoid type issues
    paymentType: PaymentType.cashback as any, // Cast to any to avoid type issues
    status: 'successful',
    description: paymentId
      ? `Cashback payment for reservation ${reservationId} (Stripe Payment ID: ${paymentId})`
      : `Cashback payment for reservation ${reservationId}`,
    notes: paymentId
      ? `Cashback ID: ${cashbackId}, Stripe Payment ID: ${paymentId}`
      : `Cashback ID: ${cashbackId}`,
    reservation: {
      connect: { id: reservationId }
    },
    service: {
      connect: { id: reservation.serviceId }
    },
    customer: {
      connect: { id: userId }
    }
  };
  
  // Create the transaction record
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

// Create a refund transaction record
const createRefundTransaction = async (
  reservationId: string,
  amount: number,
  refundId: string,
  paymentMethod: PaymentMethod = PaymentMethod.stripe,
  stripeRefundId?: string
): Promise<Transaction> => {
  // Get the reservation details
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

  // Prepare the data object with proper type handling for refund transaction
  const transactionData: Prisma.TransactionCreateInput = {
    transactionId: generateTransactionId(),
    date: new Date(),
    amount,
    paymentMethod: paymentMethod as any, // Cast to any to avoid type issues
    paymentType: PaymentType.refunded as any, // Cast to any to avoid type issues
    status: 'successful',
    description: stripeRefundId
      ? `Refund for reservation ${reservationId} (Stripe Refund ID: ${stripeRefundId})`
      : `Refund for reservation ${reservationId}`,
    notes: stripeRefundId
      ? `Refund ID: ${refundId}, Stripe Refund ID: ${stripeRefundId}`
      : `Refund ID: ${refundId}`,
    reservation: {
      connect: { id: reservationId }
    },
    service: {
      connect: { id: reservation.serviceId }
    },
    customer: {
      connect: { id: reservation.userId }
    }
  };
  
  // Create the transaction record
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

// Get transaction statistics (total revenue, expenses, etc.)
const getTransactionStatistics = async (
  startDate?: string,
  endDate?: string,
  userRole?: string,
  userId?: string
): Promise<{
  totalRevenue: number;
  totalExpense: number;
  totalPayments: number;
  transactionCounts: Record<string, number>;
}> => {
  // Prepare date filter if provided
  const whereConditions: Prisma.TransactionWhereInput = {};
  if (startDate && endDate) {
    whereConditions.date = {
      gte: new Date(startDate),
      lte: new Date(endDate),
    };
  }

  // Apply role-based filtering
  if (userRole === UserRole.user || userRole === UserRole.property_manager) {
    whereConditions.customerId = userId as string;
  } else if (userRole === UserRole.employee) {
    whereConditions.employeeId = userId as string;
  }
  // For manager and super_admin, no additional filtering is needed - they see all transactions

  // Get all transactions with role-based filtering
  const transactions = await prisma.transaction.findMany({
    where: whereConditions,
  });

  // Calculate statistics
  let totalRevenue = 0;
  let totalExpense = 0;
  let totalPayments = 0;
  const transactionCounts: Record<string, number> = {};

  transactions.forEach(transaction => {
    // Count by payment type
    const paymentType = transaction.paymentType;
    transactionCounts[paymentType] = (transactionCounts[paymentType] || 0) + 1;

    // Calculate totals based on payment type
    if (paymentType === 'first_installment' || paymentType === 'second_installment') {
      totalPayments += transaction.amount;
      totalRevenue += transaction.amount;
    } else if (paymentType === 'expense') {
      totalExpense += transaction.amount;
      totalRevenue -= transaction.amount;
    } else if (paymentType === 'refunded' || paymentType === 'cashback') {
      totalExpense += transaction.amount;
      totalRevenue -= transaction.amount;
    }
  });

  return {
    totalRevenue,
    totalExpense,
    totalPayments,
    transactionCounts,
  };
};

// Get add-ons statistics
const getAddOnsStatistics = async (
  startDate?: string,
  endDate?: string,
  userRole?: string,
  userId?: string
): Promise<{
  addOnsStats: Array<{ name: string; count: number; totalAmount: number }>;
}> => {
  // Prepare date filter if provided
  const whereConditions: Prisma.ReservationWhereInput = {};
  if (startDate && endDate) {
    whereConditions.createdAt = {
      gte: new Date(startDate),
      lte: new Date(endDate),
    };
  }

  // Apply role-based filtering
  if (userRole === UserRole.user || userRole === UserRole.property_manager) {
    whereConditions.userId = userId as string;
  } else if (userRole === UserRole.employee) {
    whereConditions.employeeId = userId as string;
  }
  // For manager and super_admin, no additional filtering is needed - they see all reservations

  // Get all reservations with add-ons
  const reservations = await prisma.reservation.findMany({
    where: whereConditions,
    include: {
      reservationAddOns: {
        include: {
          addOn: true,
        },
      },
    },
  });

  // Calculate add-ons statistics
  const addOnsMap = new Map<string, { name: string; count: number; totalAmount: number }>();

  reservations.forEach(reservation => {
    reservation.reservationAddOns.forEach(reservationAddOn => {
      const addOn = reservationAddOn.addOn;
      const addOnName = addOn.name;
      const quantity = reservationAddOn.quantity;
      const amount = addOn.price * quantity;

      if (addOnsMap.has(addOnName)) {
        const stats = addOnsMap.get(addOnName)!;
        stats.count += 1;
        stats.totalAmount += amount;
      } else {
        addOnsMap.set(addOnName, {
          name: addOnName,
          count: 1,
          totalAmount: amount,
        });
      }
    });
  });

  return {
    addOnsStats: Array.from(addOnsMap.values()),
  };
};

// Get revenue data for graphs (monthly and yearly)
const getRevenueGraphData = async (
  year?: string,
  userRole?: string,
  userId?: string
): Promise<{
  monthlyData: Array<{ name: string; value: number }>;
  yearlyData: Array<{ name: string; value: number }>;
}> => {
  // Prepare filter conditions
  const whereConditions: Prisma.TransactionWhereInput = {};
  
  // Apply role-based filtering
  if (userRole === UserRole.user || userRole === UserRole.property_manager) {
    whereConditions.customerId = userId as string;
  } else if (userRole === UserRole.employee) {
    whereConditions.employeeId = userId as string;
  }
  // For manager and super_admin, no additional filtering is needed - they see all transactions
  
  // Get all transactions
  const transactions = await prisma.transaction.findMany({
    where: whereConditions,
  });
  
  // Initialize monthly data with all months
  const months = [
    'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
  ];
  
  const monthlyData = months.map(name => ({ name, value: 0 }));
  
  // Initialize yearly data (last 5 years)
  const currentYear = new Date().getFullYear();
  const yearlyData: Array<{ name: string; value: number }> = [];
  
  for (let i = 4; i >= 0; i--) {
    yearlyData.push({ name: (currentYear - i).toString(), value: 0 });
  }
  
  // Calculate revenue for each month and year
  transactions.forEach(transaction => {
    const transactionDate = new Date(transaction.date);
    const transactionMonth = transactionDate.getMonth(); // 0-11
    const transactionYear = transactionDate.getFullYear();
    const paymentType = transaction.paymentType;
    
    // Only count revenue (not expenses or refunds)
    if (paymentType === 'first_installment' || paymentType === 'second_installment') {
      // Update monthly data if transaction is from the requested year
      if (!year || transactionYear.toString() === year) {
        monthlyData[transactionMonth].value += transaction.amount;
      }
      
      // Update yearly data if transaction year is within the last 5 years
      const yearIndex = yearlyData.findIndex(item => item.name === transactionYear.toString());
      if (yearIndex !== -1) {
        yearlyData[yearIndex].value += transaction.amount;
      }
    }
  });
  
  return {
    monthlyData,
    yearlyData
  };
};

export const TransactionService = {
  createTransaction,
  createFirstInstallmentTransaction,
  createSecondInstallmentTransaction,
  createExpenseTransaction,
  createCashbackTransaction,
  createRefundTransaction,
  getAllTransactions,
  getEmployeeCompletedTransactions,
  getSingleTransaction,
  getTransactionStatistics,
  getAddOnsStatistics,
  getRevenueGraphData,
};
