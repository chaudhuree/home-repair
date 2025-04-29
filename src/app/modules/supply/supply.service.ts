import { ISupply, ISupplyAssignment, ISupplyReturn } from './supply.interface';
import { IPaginationOptions } from '../../interface/pagination';
import calculatePagination from '../../utils/calculatePagination';
import prisma from '../../utils/prisma';
import retry from '../../utils/retry';

// Type definitions for the new models
type Supply = {
  id: string;
  name: string;
  category: string;
  measureUnit: string;
  quantity: number;
  status: boolean;
  createdAt: Date;
  updatedAt: Date;
};

type SupplyAssignment = {
  id: string;
  supplyId: string;
  userId: string;
  quantity: number;
  isReturned: boolean;
  assignDate: Date;
  returnDate?: Date;
  createdAt: Date;
  updatedAt: Date;
  supply?: Supply;
  user?: any;
};

// Type assertion for Prisma client
const prismaWithSupply = prisma as any;

// Create a new supply
export async function createSupply(payload: ISupply) {
  // Set status based on quantity
  const status = payload.quantity > 0;
  
  return prismaWithSupply.supply.create({ 
    data: {
      ...payload,
      status
    } 
  }) as Promise<Supply>;
}

// Get all supplies with pagination
export async function getAllSupplies(options: IPaginationOptions) {
  const { page, limit, skip, sortBy, sortOrder } = calculatePagination(options);
  
  const result = await prismaWithSupply.supply.findMany({
    skip,
    take: limit,
    orderBy: sortBy && sortOrder ? {
      [sortBy]: sortOrder,
    } : {
      createdAt: 'desc',
    },
  }) as Supply[];

  const total = await prismaWithSupply.supply.count();

  return {
    meta: {
      page,
      limit,
      total,
    },
    data: result,
  };
}

// Get a single supply by ID
export async function getSupplyById(id: string) {
  return prismaWithSupply.supply.findUnique({
    where: { id },
  }) as Promise<Supply | null>;
}

// Update a supply
export async function updateSupply(id: string, payload: Partial<ISupply>) {
  // If quantity is included in the payload, update status accordingly
  let status = undefined;
  
  if (payload.quantity !== undefined) {
    const currentSupply = await prismaWithSupply.supply.findUnique({
      where: { id },
    }) as Supply | null;
    
    status = payload.quantity > 0;
  }
  
  return prismaWithSupply.supply.update({
    where: { id },
    data: {
      ...payload,
      ...(status !== undefined && { status }),
    },
  });
}

// Delete a supply
export async function deleteSupply(id: string) {
  return prismaWithSupply.supply.delete({
    where: { id },
  }) as Promise<Supply>;
}



// Assign supply to an employee
export async function assignSupply(payload: ISupplyAssignment) {
  // Use retry logic for the transaction
  return retry(() => prisma.$transaction(async (tx) => {
    // Get the current supply
    const supply = await (tx as any).supply.findUnique({
      where: { id: payload.supplyId },
    }) as Supply | null;

    if (!supply) {
      throw new Error('Supply not found');
    }

    if (supply.quantity < payload.quantity) {
      throw new Error('Insufficient supply quantity');
    }

    // Update the supply quantity
    const updatedSupply = await (tx as any).supply.update({
      where: { id: payload.supplyId },
      data: {
        quantity: supply.quantity - payload.quantity,
        status: (supply.quantity - payload.quantity) > 0,
      },
    }) as Supply;

    // Create the supply assignment
    const assignment = await (tx as any).supplyAssignment.create({
      data: {
        supplyId: payload.supplyId,
        userId: payload.userId,
        quantity: payload.quantity,
        assignDate: payload.assignDate || new Date(),
      },
    }) as SupplyAssignment;

    return {
      assignment,
      supply: updatedSupply,
    };
  }));
}

// Return supply from an employee
export async function returnSupply(payload: ISupplyReturn) {
  // Use retry logic for the transaction
  return retry(() => prisma.$transaction(async (tx) => {
    // Get the assignment
    const assignments = await (tx as any).supplyAssignment.findMany({
      where: {
        supplyId: payload.supplyId,
        userId: payload.userId,
        isReturned: false,
      },
    }) as SupplyAssignment[];

    if (!assignments.length) {
      throw new Error('No active supply assignment found for this user and supply');
    }

    // Calculate total assigned quantity
    const totalAssignedQuantity = assignments.reduce((sum: number, assignment: any) => sum + assignment.quantity, 0);

    if (totalAssignedQuantity < payload.quantity) {
      throw new Error(`Cannot return more than assigned quantity. Maximum returnable: ${totalAssignedQuantity}`);
    }

    // Get the current supply
    const supply = await tx.supply.findUnique({
      where: { id: payload.supplyId },
    });

    if (!supply) {
      throw new Error('Supply not found');
    }

    // Update the supply quantity
    const updatedSupply = await (tx as any).supply.update({
      where: { id: payload.supplyId },
      data: {
        quantity: supply.quantity + payload.quantity,
        status: true, // If we're adding quantity, it's definitely available
      },
    }) as Supply;

    // Update assignments
    let remainingToReturn = payload.quantity;
    const updatedAssignments = [];

    for (const assignment of assignments) {
      if (remainingToReturn <= 0) break;

      const returnQuantity = Math.min(assignment.quantity, remainingToReturn);
      remainingToReturn -= returnQuantity;

      // If returning the full amount
      if (returnQuantity === assignment.quantity) {
        const updated = await (tx as any).supplyAssignment.update({
          where: { id: assignment.id },
          data: {
            isReturned: true,
            returnDate: payload.returnDate || new Date(),
          },
        }) as SupplyAssignment;
        updatedAssignments.push(updated);
      } else {
        // If returning partial amount, update the current assignment and create a new one for the returned portion
        const updated = await (tx as any).supplyAssignment.update({
          where: { id: assignment.id },
          data: {
            quantity: assignment.quantity - returnQuantity,
          },
        }) as SupplyAssignment;
        
        const returned = await (tx as any).supplyAssignment.create({
          data: {
            supplyId: payload.supplyId,
            userId: payload.userId,
            quantity: returnQuantity,
            isReturned: true,
            assignDate: assignment.assignDate,
            returnDate: payload.returnDate || new Date(),
          },
        }) as SupplyAssignment;
        
        updatedAssignments.push(updated, returned);
      }
    }

    return {
      updatedAssignments,
      supply: updatedSupply,
    };
  }));
}

// Get all supply assignments
export async function getAllSupplyAssignments(options: IPaginationOptions) {
  const { page, limit, skip, sortBy, sortOrder } = calculatePagination(options);
  
  const result = await prismaWithSupply.supplyAssignment.findMany({
    skip,
    take: limit,
    orderBy: sortBy && sortOrder ? {
      [sortBy]: sortOrder,
    } : {
      createdAt: 'desc',
    },
    include: {
      supply: true,
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
        },
      },
    },
  });

  const total = await prismaWithSupply.supplyAssignment.count();

  return {
    meta: {
      page,
      limit,
      total,
    },
    data: result,
  };
}

// Get supply assignments by user
export async function getSupplyAssignmentsByUser(userId: string, options: IPaginationOptions) {
  const { page, limit, skip, sortBy, sortOrder } = calculatePagination(options);
  
  const result = await prismaWithSupply.supplyAssignment.findMany({
    where: {
      userId,
    },
    skip,
    take: limit,
    orderBy: sortBy && sortOrder ? {
      [sortBy]: sortOrder,
    } : {
      createdAt: 'desc',
    },
    include: {
      supply: true,
    },
  });

  const total = await prismaWithSupply.supplyAssignment.count({
    where: {
      userId,
    },
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

// Add quantity to an existing supply
export async function addSupplyQuantity(id: string, additionalQuantity: number) {
  // Validate input
  if (additionalQuantity <= 0) {
    throw new Error('Additional quantity must be greater than zero');
  }

  // Get the current supply
  const currentSupply = await prismaWithSupply.supply.findUnique({
    where: { id },
  }) as Supply | null;

  if (!currentSupply) {
    throw new Error('Supply not found');
  }

  // Calculate new quantity
  const newQuantity = currentSupply.quantity + additionalQuantity;

  // Update the supply with the new quantity
  const updatedSupply = await prismaWithSupply.supply.update({
    where: { id },
    data: {
      quantity: newQuantity,
      status: true, // If we're adding quantity, it's definitely available
    },
  }) as Supply;

  return {
    previousQuantity: currentSupply.quantity,
    addedQuantity: additionalQuantity,
    newQuantity: updatedSupply.quantity,
    supply: updatedSupply
  };
}

// Get detailed supply information with employee allocation data
export async function getSupplyDetailWithAllocations(id: string) {
  // Get the supply details
  const supply = await prismaWithSupply.supply.findUnique({
    where: { id },
  }) as Supply | null;

  if (!supply) {
    throw new Error('Supply not found');
  }

  // Get all active assignments for this supply
  const activeAssignments = await prismaWithSupply.supplyAssignment.findMany({
    where: {
      supplyId: id,
      isReturned: false,
    },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
        },
      },
    },
  });

  // Calculate total assigned quantity
  const totalAssignedQuantity = activeAssignments.reduce(
    (sum: number, assignment: any) => sum + assignment.quantity, 
    0
  );

  // Group assignments by employee
  const employeeAllocations = activeAssignments.reduce((acc: any, assignment: any) => {
    const userId = assignment.userId;
    if (!acc[userId]) {
      acc[userId] = {
        employee: assignment.user,
        totalQuantity: 0,
        assignments: [],
      };
    }
    
    acc[userId].totalQuantity += assignment.quantity;
    acc[userId].assignments.push({
      id: assignment.id,
      quantity: assignment.quantity,
      assignDate: assignment.assignDate,
    });
    
    return acc;
  }, {});

  return {
    supply,
    availableQuantity: supply.quantity,
    totalAssignedQuantity,
    totalQuantity: supply.quantity + totalAssignedQuantity,
    employeeAllocations: Object.values(employeeAllocations),
  };
}
