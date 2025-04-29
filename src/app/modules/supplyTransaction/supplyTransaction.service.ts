import { ISupplyTransaction, ISupplyTransactionFilter } from './supplyTransaction.interface';
import { IPaginationOptions } from '../../interface/pagination';
import calculatePagination from '../../utils/calculatePagination';
import prisma from '../../utils/prisma';

// Type assertion for Prisma client
const prismaWithSupplyTransaction = prisma as any;

// Create a new supply transaction
export async function createSupplyTransaction(payload: ISupplyTransaction) {
  return prismaWithSupplyTransaction.supplyTransaction.create({
    data: {
      supplyId: payload.supplyId,
      employeeId: payload.employeeId,
      quantity: payload.quantity,
      type: payload.type,
      date: payload.date || new Date(),
      notes: payload.notes,
    },
    include: {
      supply: true,
      employee: {
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
        },
      },
    },
  });
}

// Get all supply transactions with pagination and filtering
export async function getAllSupplyTransactions(
  filter: ISupplyTransactionFilter,
  options: IPaginationOptions
) {
  const { page, limit, skip, sortBy, sortOrder } = calculatePagination(options);
  
  // Build the where clause based on filters
  const whereClause: any = {};
  
  if (filter.employeeId) {
    whereClause.employeeId = filter.employeeId;
  }
  
  if (filter.supplyId) {
    whereClause.supplyId = filter.supplyId;
  }
  
  if (filter.type) {
    whereClause.type = filter.type;
  }
  
  // Date range filter
  if (filter.startDate || filter.endDate) {
    whereClause.date = {};
    
    if (filter.startDate) {
      whereClause.date.gte = filter.startDate;
    }
    
    if (filter.endDate) {
      whereClause.date.lte = filter.endDate;
    }
  }
  
  const result = await prismaWithSupplyTransaction.supplyTransaction.findMany({
    where: whereClause,
    skip,
    take: limit,
    orderBy: sortBy && sortOrder ? {
      [sortBy]: sortOrder,
    } : {
      date: 'desc',
    },
    include: {
      supply: true,
      employee: {
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
        },
      },
    },
  });

  const total = await prismaWithSupplyTransaction.supplyTransaction.count({
    where: whereClause,
  });

  return {
    meta: {
      page,
      limit,
      total,
    },
    data: result,
  };
}

// Get supply transactions by employee ID
export async function getSupplyTransactionsByEmployee(
  employeeId: string,
  options: IPaginationOptions
) {
  return getAllSupplyTransactions({ employeeId }, options);
}

// Get supply transactions by supply ID
export async function getSupplyTransactionsBySupply(
  supplyId: string,
  options: IPaginationOptions
) {
  return getAllSupplyTransactions({ supplyId }, options);
}

// Get supply transaction statistics for an employee
export async function getEmployeeSupplyTransactionStats(employeeId: string) {
  // Get total assigned and returned quantities
  const assignedResult = await prismaWithSupplyTransaction.supplyTransaction.aggregate({
    where: {
      employeeId,
      type: 'assigned',
    },
    _sum: {
      quantity: true,
    },
    _count: true,
  });

  const returnedResult = await prismaWithSupplyTransaction.supplyTransaction.aggregate({
    where: {
      employeeId,
      type: 'returned',
    },
    _sum: {
      quantity: true,
    },
    _count: true,
  });

  // Get most recent transactions
  const recentTransactions = await prismaWithSupplyTransaction.supplyTransaction.findMany({
    where: {
      employeeId,
    },
    take: 5,
    orderBy: {
      date: 'desc',
    },
    include: {
      supply: true,
    },
  });

  // Get supply-wise breakdown
  const supplyBreakdown = await prismaWithSupplyTransaction.supplyTransaction.groupBy({
    by: ['supplyId'],
    where: {
      employeeId,
    },
    _sum: {
      quantity: true,
    },
    _count: true,
  });

  // Fetch supply details for the breakdown
  const supplyIds = supplyBreakdown.map((item: { supplyId: string }) => item.supplyId);
  const supplies = await prismaWithSupplyTransaction.supply.findMany({
    where: {
      id: {
        in: supplyIds,
      },
    },
  });

  // Combine supply details with breakdown
  const supplyDetails = supplyBreakdown.map((item: { supplyId: string; _count: number; _sum: { quantity: number } }) => {
    const supply = supplies.find((s: { id: string; name?: string; category?: string; measureUnit?: string }) => s.id === item.supplyId);
    return {
      supplyId: item.supplyId,
      name: supply?.name || 'Unknown',
      category: supply?.category || 'Unknown',
      measureUnit: supply?.measureUnit || 'Unit',
      totalTransactions: item._count,
      totalQuantity: item._sum.quantity,
    };
  });

  return {
    totalAssigned: {
      count: assignedResult._count,
      quantity: assignedResult._sum.quantity || 0,
    },
    totalReturned: {
      count: returnedResult._count,
      quantity: returnedResult._sum.quantity || 0,
    },
    currentBalance: {
      quantity: (assignedResult._sum.quantity || 0) - (returnedResult._sum.quantity || 0),
    },
    recentTransactions,
    supplyDetails,
  };
}
