import { ISupply, ISupplyAssignment, ISupplyReturn } from './supply.interface';
import { IPaginationOptions } from '../../interface/pagination';
import calculatePagination from '../../utils/calculatePagination';
import prisma from '../../utils/prisma';
import retry from '../../utils/retry';
import { createSupplyTransaction } from '../supplyTransaction/supplyTransaction.service';

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

    // Record the supply transaction
    const assignDate = payload.assignDate || new Date();
    await createSupplyTransaction({
      supplyId: payload.supplyId,
      employeeId: payload.userId,
      quantity: payload.quantity,
      type: 'assigned',
      date: assignDate,
      notes: `Assigned ${payload.quantity} ${supply.measureUnit} of ${supply.name} to employee`
    });

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
      orderBy: {
        assignDate: 'asc',
      },
    }) as SupplyAssignment[];

    if (!assignments.length) {
      throw new Error('No active assignments found for this supply and user');
    }

    // Calculate total assigned quantity
    const totalAssignedQuantity = assignments.reduce(
      (sum, assignment) => sum + assignment.quantity, 
      0
    );

    if (totalAssignedQuantity < payload.quantity) {
      throw new Error(`Cannot return more than assigned quantity. Assigned: ${totalAssignedQuantity}, Attempting to return: ${payload.quantity}`);
    }

    // Get the current supply
    const supply = await (tx as any).supply.findUnique({
      where: { id: payload.supplyId },
    }) as Supply | null;

    if (!supply) {
      throw new Error('Supply not found');
    }

    // Update the supply quantity
    const updatedSupply = await (tx as any).supply.update({
      where: { id: payload.supplyId },
      data: {
        quantity: supply.quantity + payload.quantity,
        status: true, // If we're returning items, it's definitely available
      },
    }) as Supply;

    // Process the return by updating assignments
    let remainingToReturn = payload.quantity;
    const updatedAssignments = [];
    const returnDate = payload.returnDate || new Date();

    for (const assignment of assignments) {
      if (remainingToReturn <= 0) break;

      const returnQuantity = Math.min(assignment.quantity, remainingToReturn);
      remainingToReturn -= returnQuantity;

      if (returnQuantity === assignment.quantity) {
        // If returning the entire assignment
        const updatedAssignment = await (tx as any).supplyAssignment.update({
          where: { id: assignment.id },
          data: {
            isReturned: true,
            returnDate,
          },
        });
        updatedAssignments.push(updatedAssignment);
      } else {
        // If returning part of the assignment
        // Update the current assignment with reduced quantity
        const updatedAssignment = await (tx as any).supplyAssignment.update({
          where: { id: assignment.id },
          data: {
            quantity: assignment.quantity - returnQuantity,
          },
        });
        updatedAssignments.push(updatedAssignment);

        // Create a new assignment for the returned portion
        const returnedAssignment = await (tx as any).supplyAssignment.create({
          data: {
            supplyId: payload.supplyId,
            userId: payload.userId,
            quantity: returnQuantity,
            isReturned: true,
            assignDate: assignment.assignDate,
            returnDate,
          },
        });
        updatedAssignments.push(returnedAssignment);
      }
    }

    // Record the supply transaction
    await createSupplyTransaction({
      supplyId: payload.supplyId,
      employeeId: payload.userId,
      quantity: payload.quantity,
      type: 'returned',
      date: returnDate,
      notes: `Returned ${payload.quantity} ${supply.measureUnit} of ${supply.name} from employee`
    });

    return {
      updatedAssignments,
      supply: updatedSupply,
      returnedQuantity: payload.quantity,
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
