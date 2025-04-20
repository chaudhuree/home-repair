import {
  Prisma,
  Reservation,
  ServiceStatus,
  PaymentStatus,
  RefundStatus,
} from '@prisma/client';
import prisma from '../../utils/prisma';
import {
  IReservation,
  IReservationFilters,
  IUpdateReservation,
  IAssignEmployee,
} from './reservation.interface';
import { IPaginationOptions } from '../../interface/pagination';
import calculatePagination from '../../utils/calculatePagination';
import { reservationSearchableFields } from './reservation.constant';
import AppError from '../../errors/AppError';
import { PaymentService } from '../payment/payment.service';

const createReservation = async (
  userId: string,
  data: IReservation,
): Promise<Reservation | null> => {
  // Validate all required entities exist
  const service = await prisma.service.findUnique({
    where: { id: data.serviceId },
  });
  if (!service) {
    throw new AppError(404, 'Service not found');
  }

  // Validate that at least one of spaceTypeId or packageTypeId is provided
  if ((!data.spaceTypeId || data.spaceTypeId.trim() === '') && 
      (!data.packageTypeId || data.packageTypeId.trim() === '')) {
    throw new AppError(400, 'At least one of spaceTypeId or packageTypeId must be provided');
  }

  // Only validate spaceType if spaceTypeId is provided and not empty
  let spaceType = null;
  if (data.spaceTypeId && data.spaceTypeId.trim() !== '') {
    spaceType = await prisma.spaceType.findUnique({
      where: { id: data.spaceTypeId },
    });
    if (!spaceType) {
      throw new AppError(404, 'Space type not found');
    }
  }

  // Only validate packageType if packageTypeId is provided and not empty
  let packageType = null;
  if (data.packageTypeId && data.packageTypeId.trim() !== '') {
    packageType = await prisma.packageType.findUnique({
      where: { id: data.packageTypeId },
    });
    if (!packageType) {
      throw new AppError(404, 'Package type not found');
    }
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
  });
  if (!user || !user.stripeCustomerId) {
    throw new AppError(404, 'User or payment information not found');
  }

  // Calculate total amount based on package selection
  let totalAmount = 0;
  
  // Calculate total amount based on what's provided
  if (data.packageTypeId && packageType) {
    // If package is selected and found, use package price
    totalAmount = packageType.price;
  } else if (data.spaceTypeId && spaceType) {
    // If space type is selected and found, use space type price
    totalAmount = spaceType.price;
  } else {
    // This should not happen due to earlier validation, but just in case
    throw new AppError(400, 'Unable to calculate price: no valid package or space type');
  }
  
  // Add paint price if providePaint is false (user doesn't provide their own paint)
  if (!data.providePaint && data.paintPrice) {
    totalAmount += data.paintPrice;
  }

  // Validate and calculate add-ons price if any
  let addOnsPrice = 0;
  let addOnItems = [];
  
  if (data.addOns && data.addOns.length > 0) {
    // Fetch all add-ons in one query for efficiency
    const addOnIds = data.addOns.map(item => item.addOnId);
    const addOns = await prisma.addOn.findMany({
      where: {
        id: { in: addOnIds }
      }
    });

    // Validate all add-ons exist
    if (addOns.length !== addOnIds.length) {
      throw new AppError(404, 'One or more add-ons not found');
    }

    // Calculate total add-ons price
    for (const addOnItem of data.addOns) {
      const addOn = addOns.find(a => a.id === addOnItem.addOnId);
      if (!addOn) continue; // Skip if not found (should not happen due to previous validation)
      
      const itemPrice = addOn.price * addOnItem.quantity;
      addOnsPrice += itemPrice;
      
      // Prepare add-on items for creation
      addOnItems.push({
        addOnId: addOnItem.addOnId,
        quantity: addOnItem.quantity
      });
    }
    
    // Add add-ons price to total amount
    totalAmount += addOnsPrice;
  }

  // Calculate installments (50% each)
  const firstInstallmentAmount = totalAmount * 0.5;
  const secondInstallmentAmount = totalAmount * 0.5;

  const result = await prisma.$transaction(async tx => {
    // Create the reservation
    // Prepare the base reservation data
    const reservationData: any = {
      userId,
      serviceId: data.serviceId,
      providePaint: data.providePaint,
      paintPrice: data.paintPrice,
      stripeCustomerId: user.stripeCustomerId,
      firstInstallmentAmount,
      secondInstallmentAmount,
      firstInstallmentPaid: false,
      secondInstallmentPaid: false,
      status: ServiceStatus.pending,
      paymentStatus: PaymentStatus.pending,
      customersGivenImages: data.customersGivenImages || [],
      beforeImages: [],
      afterImages: [],
      projectDescription: data.projectDescription,
      accessInstructionDetails: data.accessInstructionDetails,
      address: data.address,
      userSelectedDates: data.userSelectedDates,
      amount: totalAmount // Use calculated amount instead of data.amount
    };
    
    // Only add spaceTypeId if it's provided and not empty
    if (data.spaceTypeId && data.spaceTypeId.trim() !== '') {
      reservationData.spaceTypeId = data.spaceTypeId;
    }
    
    // Only add packageTypeId if it's provided and not empty
    if (data.packageTypeId && data.packageTypeId.trim() !== '') {
      reservationData.packageTypeId = data.packageTypeId;
    }
    
    const reservation = await tx.reservation.create({
      data: reservationData,
      include: {
        service: true,
        spaceType: true,
        packageType: true,
        user: true,
      },
    });

    // Create reservation add-ons if any
    if (addOnItems.length > 0) {
      for (const item of addOnItems) {
        await tx.reservationAddOn.create({
          data: {
            reservationId: reservation.id,
            addOnId: item.addOnId,
            quantity: item.quantity
          }
        });
      }
    }

    // Create chat room
    const chatRoomName = `${user.name} | ${service.name} | #${reservation.id}`;

    await tx.chatRoom.create({
      data: {
        name: chatRoomName,
        reservationId: reservation.id,
        participants: [userId],
      },
    });

    // Return the complete reservation with all related data
    const completeReservation = await tx.reservation.findUnique({
      where: { id: reservation.id },
      include: {
        service: true,
        spaceType: true,
        packageType: true,
        user: true,
        reservationAddOns: {
          include: {
            addOn: true
          }
        }
      }
    });
    
    if (!completeReservation) {
      throw new AppError(500, 'Failed to retrieve created reservation');
    }
    
    return completeReservation;
  });

  return result;
};

const getAllReservations = async (
  filters: IReservationFilters,
  options: IPaginationOptions,
  userId: string,
  userRole: string,
) => {
  const { searchTerm, ...filterData } = filters;
  const { page, limit, skip, sortBy, sortOrder } = calculatePagination(options);

  const andConditions = [];

  // Role-based filtering
  switch (userRole) {
    case 'user':
      // Users can only see their own reservations
      andConditions.push({ userId: userId });
      break;
    case 'employee':
      // Employees can only see reservations assigned to them
      andConditions.push({ employeeId: userId });
      break;
    case 'property_manager':
      // Property managers can only see reservations created by them
      andConditions.push({ userId: userId });
      break;
    case 'super_admin':
    case 'manager':
      // Super admin and manager can see all reservations
      break;
    default:
      throw new AppError(403, 'You are not authorized to view reservations');
  }

  // Handle search term
  if (searchTerm) {
    andConditions.push({
      OR: reservationSearchableFields.map(field => ({
        [field]: {
          equals: searchTerm,
          mode: 'insensitive',
        },
      })),
    });
  }

  // Handle other filters
  type FilterKeys = Exclude<keyof IReservationFilters, 'searchTerm'>;

  (Object.keys(filterData) as FilterKeys[]).forEach(key => {
    const value = filterData[key];
    if (value !== undefined) {
      andConditions.push({
        [key]: value,
      });
    }
  });

  const whereConditions: Prisma.ReservationWhereInput =
    andConditions.length > 0 ? { AND: andConditions } : {};

  const result = await prisma.reservation.findMany({
    where: whereConditions,
    skip,
    take: limit,
    orderBy:
      sortBy && sortOrder
        ? {
            [sortBy]: sortOrder,
          }
        : {
            createdAt: 'desc',
          },
    include: {
      service: true,
      spaceType: true,
      packageType: true,
      user: true,
      employee: true,
      reservationAddOns: {
        include: {
          addOn: true,
        },
      },
      cashbacks: true,
    },
  });

  const total = await prisma.reservation.count({
    where: whereConditions,
  });

  return {
    meta: {
      page,
      limit,
      total,
    },
    data: result,
  };
};

const getSingleReservation = async (
  id: string,
  userId: string,
  userRole: string,
): Promise<Reservation> => {
  const reservation = await prisma.reservation.findUnique({
    where: { id },
    include: {
      service: true,
      spaceType: true,
      packageType: true,
      user: true,
      employee: true,
      reservationAddOns: {
        include: {
          addOn: true,
        },
      },
      cashbacks: true,
      chatRoom: {
        include: {
          messages: {
            include: {
              sender: true,
            },
            orderBy: {
              createdAt: 'asc',
            },
          },
        },
      },
    },
  });

  if (!reservation) {
    throw new AppError(404, 'Reservation not found');
  }

  // Check authorization based on role
  switch (userRole) {
    case 'user':
      // Users can only view their own reservations
      if (reservation.userId !== userId) {
        throw new AppError(403, 'You are not authorized to view this reservation');
      }
      break;
    case 'employee':
      // Employees can only view reservations assigned to them
      if (reservation.employeeId !== userId) {
        throw new AppError(403, 'You are not authorized to view this reservation');
      }
      break;
    case 'property_manager':
      // Property managers can only view reservations created by them
      if (reservation.userId !== userId) {
        throw new AppError(403, 'You are not authorized to view this reservation');
      }
      break;
    case 'super_admin':
    case 'manager':
      // Super admin and manager can view all reservations
      break;
    default:
      throw new AppError(403, 'You are not authorized to view this reservation');
  }

  return reservation;
};

const updateReservation = async (
  id: string,
  payload: IUpdateReservation,
  userId: string,
  userRole: string,
): Promise<Reservation> => {
  const reservation = await prisma.reservation.findUnique({
    where: { id },
    include: {
      user: true,
      spaceType: true,
      packageType: true,
    },
  });

  if (!reservation) {
    throw new AppError(404, 'Reservation not found');
  }

  // Check authorization based on role
  let authorized = false;

  switch (userRole) {
    case 'user':
    case 'property_manager':
      // Users and property managers can only update their own reservations
      if (reservation.userId === userId) {
        authorized = true;
      }
      break;

    case 'employee':
      // Employees can only update reservations assigned to them
      if (reservation.employeeId === userId) {
        authorized = true;
      }
      break;

    case 'manager':
    case 'super_admin':
      // Managers and super admins can update all reservations
      authorized = true;
      break;

    default:
      authorized = false;
  }

  if (!authorized) {
    throw new AppError(403, 'You are not authorized to update this reservation');
  }

  // Validate status transitions
  if (payload.status && payload.status !== reservation.status) {
    // Check if the status transition is valid
    switch (reservation.status) {
      case ServiceStatus.pending:
        // From pending, can move to accepted or cancelled
        if (
          payload.status !== ServiceStatus.accepted && 
          payload.status !== ServiceStatus.cancelled
        ) {
          throw new AppError(
            400,
            `Cannot transition from ${reservation.status} to ${payload.status}`,
          );
        }
        break;

      case ServiceStatus.accepted:
        // From accepted, can move to assigned_employee or cancelled
        if (
          payload.status !== ServiceStatus.assigned_employee && 
          payload.status !== ServiceStatus.cancelled
        ) {
          throw new AppError(
            400,
            `Cannot transition from ${reservation.status} to ${payload.status}`,
          );
        }
        break;

      case ServiceStatus.assigned_employee:
        // From assigned_employee, can move to in_progress or cancelled
        if (
          payload.status !== ServiceStatus.in_progress && 
          payload.status !== ServiceStatus.cancelled
        ) {
          throw new AppError(
            400,
            `Cannot transition from ${reservation.status} to ${payload.status}`,
          );
        }
        break;

      case ServiceStatus.in_progress:
        // From in_progress, can move to work_done or cancelled
        if (
          payload.status !== ServiceStatus.work_done && 
          payload.status !== ServiceStatus.cancelled
        ) {
          throw new AppError(
            400,
            `Cannot transition from ${reservation.status} to ${payload.status}`,
          );
        }
        break;

      case ServiceStatus.work_done:
        // From work_done, can move to completed
        if (payload.status !== ServiceStatus.completed) {
          throw new AppError(
            400,
            `Cannot transition from ${reservation.status} to ${payload.status}`,
          );
        }
        break;

      case ServiceStatus.completed:
        // From completed, cannot change status
        throw new AppError(
          400,
          'Cannot change status of a completed reservation',
        );

      case ServiceStatus.cancelled:
        // From cancelled, cannot change status
        throw new AppError(
          400,
          'Cannot change status of a cancelled reservation',
        );

      default:
        break;
    }
  }

  const updatedReservation = await prisma.reservation.update({
    where: { id },
    data: payload,
    include: {
      service: true,
      spaceType: true,
      packageType: true,
      user: true,
      employee: true,
      reservationAddOns: {
        include: {
          addOn: true,
        },
      },
    },
  });

  return updatedReservation;
};



const deleteReservation = async (id: string): Promise<Reservation> => {
  const result = await prisma.reservation.delete({
    where: {
      id,
    },
    include: {
      service: true,
      user: true,
      employee: true,
    },
  });
  return result;
};

const processFirstInstallment = async (
  id: string,
  paymentMethodId: string,
  userId: string,
): Promise<Reservation> => {
  const reservation = await prisma.reservation.findUnique({
    where: { id },
    include: {
      user: true,
    },
  });

  if (!reservation) {
    throw new AppError(404, 'Reservation not found');
  }

  if (reservation.userId !== userId) {
    throw new AppError(403, 'You are not authorized to process this payment');
  }

  if (!reservation.stripeCustomerId) {
    throw new AppError(400, 'Payment information not found');
  }
  if (!reservation.firstInstallmentAmount) {
    throw new AppError(400, 'First installment amount not found');
  }
  // Process the deposit payment
  await PaymentService.processDeposit(
    id,
    reservation.firstInstallmentAmount,
    reservation.stripeCustomerId,
    paymentMethodId,
  );

  // Update reservation status
  const updatedReservation = await prisma.reservation.update({
    where: { id },
    data: {
      firstInstallmentPaid: true,
      paymentStatus: PaymentStatus.partially_paid,
      status: ServiceStatus.accepted,
    },
    include: {
      service: true,
      user: true,
      employee: true,
    },
  });

  return updatedReservation;
};
// final payment of the reservation here id is the reservation id
const processSecondInstallment = async (
  id: string,
  userId: string,
): Promise<Reservation> => {
  const reservation = await prisma.reservation.findUnique({
    where: { id },
    include: {
      user: true,
    },
  });

  if (!reservation) {
    throw new AppError(404, 'Reservation not found');
  }

  if (reservation.userId !== userId) {
    throw new AppError(403, 'You are not authorized to process this payment');
  }

  if (!reservation.stripeCustomerId) {
    throw new AppError(400, 'Payment information not found');
  }

  // Process the remaining payment
  if (!reservation.secondInstallmentAmount) {
    throw new AppError(400, 'Second installment amount not found');
  }
  await PaymentService.processRemainingPayment(id);
  //id -> reservationId

  // Update reservation status
  const updatedReservation = await prisma.reservation.update({
    where: { id },
    data: {
      secondInstallmentPaid: true,
      paymentStatus: PaymentStatus.total_paid,
      status: ServiceStatus.completed,
    },
    include: {
      service: true,
      user: true,
      employee: true,
    },
  });

  return updatedReservation;
};

const processCashback = async (
  id: string,
  userId: string,
  reviewImage: string,
): Promise<Reservation> => {
  const reservation = await prisma.reservation.findUnique({
    where: { id },
    include: {
      user: true,
    },
  });

  if (!reservation) {
    throw new AppError(404, 'Reservation not found');
  }

  if (reservation.userId !== userId) {
    throw new AppError(403, 'You are not authorized to request cashback');
  }

  if (reservation.status !== ServiceStatus.completed) {
    throw new AppError(
      400,
      'Reservation must be completed to request cashback',
    );
  }

  const cashbackAmount = reservation.amount * 0.05; // 5% cashback

  // Create cashback record
  await prisma.cashback.create({
    data: {
      userId,
      reservationId: id,
      amount: cashbackAmount,
      status: 'pending',
      proof: [reviewImage], // Convert single string to array
      depositPaymentIntentId: reservation.depositPaymentIntentId,
    },
  });

  return reservation;
};

const approveCashback = async (
  id: string,
  cashbackId: string,
): Promise<Reservation> => {
  const cashback = await prisma.cashback.findUnique({
    where: { id: cashbackId },
  });

  if (!cashback) {
    throw new AppError(404, 'Cashback request not found');
  }

  const reservation = await prisma.reservation.findUnique({
    where: { id },
  });

  if (!reservation) {
    throw new AppError(404, 'Reservation not found');
  }

  // Process the cashback refund
  await PaymentService.processCashbackRefund(id, cashback.amount);

  // Update cashback status
  await prisma.cashback.update({
    where: { id: cashbackId },
    data: {
      status: 'approved',
    },
  });

  return reservation;
};

const assignEmployee = async (
  id: string,
  payload: IAssignEmployee,
): Promise<Reservation> => {
  const result = await prisma.$transaction(async tx => {
    const reservation = await tx.reservation.update({
      where: {
        id,
      },
      data: {
        employeeId: payload.employeeId,
        status: ServiceStatus.assigned_employee,
      },
      include: {
        service: true,
        user: true,
        employee: true,
      },
    });

    // Update chat room participants to include the employee
    await tx.chatRoom.update({
      where: {
        reservationId: id,
      },
      data: {
        participants: {
          push: payload.employeeId,
        },
      },
    });

    return reservation;
  });

  return result;
};

const addReservationAddOn = async (
  id: string,
  addOnData: { addOnId: string; quantity: number },
  userId: string,
): Promise<Reservation | null> => {
  const reservation = await prisma.reservation.findUnique({
    where: { id },
    include: {
      user: true,
      reservationAddOns: {
        include: {
          addOn: true,
        },
      },
    },
  });

  if (!reservation) {
    throw new AppError(404, 'Reservation not found');
  }

  // Check if user owns this reservation
  if (reservation.userId !== userId) {
    throw new AppError(403, 'You are not authorized to modify this reservation');
  }

  // Check if reservation status allows adding add-ons
  if (['work_done', 'completed', 'cancelled', 'success'].includes(reservation.status)) {
    throw new AppError(400, `Cannot add add-ons to a reservation with status: ${reservation.status}`);
  }

  // Check if the add-on exists
  const addOn = await prisma.addOn.findUnique({
    where: { id: addOnData.addOnId },
  });

  if (!addOn) {
    throw new AppError(404, 'Add-on not found');
  }

  // Calculate price for this add-on
  const addOnPrice = addOn.price * addOnData.quantity;

  // Check if this add-on is already added to the reservation
  const existingAddOn = reservation.reservationAddOns.find(
    (item) => item.addOnId === addOnData.addOnId
  );

  let priceAdjustment = 0;

  // Update reservation in a transaction to ensure data consistency
  const updatedReservation = await prisma.$transaction(async (tx) => {
    if (existingAddOn) {
      // Calculate price difference based on quantity change
      const existingPrice = existingAddOn.addOn.price * existingAddOn.quantity;
      const newPrice = addOn.price * addOnData.quantity;
      priceAdjustment = newPrice - existingPrice;

      // Update the quantity if it already exists
      await tx.reservationAddOn.update({
        where: { id: existingAddOn.id },
        data: { quantity: addOnData.quantity },
      });
    } else {
      // Create a new reservation add-on
      await tx.reservationAddOn.create({
        data: {
          reservationId: id,
          addOnId: addOnData.addOnId,
          quantity: addOnData.quantity,
        },
      });
      
      // Add the full price of the new add-on
      priceAdjustment = addOnPrice;
    }

    // Update the reservation amount and second installment amount
    const newTotalAmount = reservation.amount + priceAdjustment;
    const newSecondInstallmentAmount = (reservation.secondInstallmentAmount || 0) + priceAdjustment;

    return tx.reservation.update({
      where: { id },
      data: {
        amount: newTotalAmount,
        secondInstallmentAmount: newSecondInstallmentAmount,
      },
      include: {
        service: true,
        spaceType: true,
        packageType: true,
        user: true,
        employee: true,
        reservationAddOns: {
          include: {
            addOn: true,
          },
        },
      },
    });
  });

  return updatedReservation;
};

const removeReservationAddOn = async (
  id: string,
  data: { addOnId: string },
  userId: string,
): Promise<Reservation | null> => {
  const reservation = await prisma.reservation.findUnique({
    where: { id },
    include: {
      user: true,
      reservationAddOns: {
        include: {
          addOn: true,
        },
      },
    },
  });

  if (!reservation) {
    throw new AppError(404, 'Reservation not found');
  }

  // Check if user owns this reservation
  if (reservation.userId !== userId) {
    throw new AppError(403, 'You are not authorized to modify this reservation');
  }

  // Check if reservation status allows removing add-ons
  if (['work_done', 'completed', 'cancelled', 'success'].includes(reservation.status)) {
    throw new AppError(400, `Cannot remove add-ons from a reservation with status: ${reservation.status}`);
  }

  // Find the add-on in the reservation
  const existingAddOn = reservation.reservationAddOns.find(
    (item) => item.addOnId === data.addOnId
  );

  if (!existingAddOn) {
    throw new AppError(404, 'Add-on not found in this reservation');
  }

  // Calculate price to be reduced
  const priceReduction = existingAddOn.addOn.price * existingAddOn.quantity;

  // Update reservation in a transaction to ensure data consistency
  const updatedReservation = await prisma.$transaction(async (tx) => {
    // Delete the reservation add-on
    await tx.reservationAddOn.delete({
      where: { id: existingAddOn.id },
    });

    // Update the reservation amount and second installment amount
    const newTotalAmount = reservation.amount - priceReduction;
    const newSecondInstallmentAmount = (reservation.secondInstallmentAmount || 0) - priceReduction;

    return tx.reservation.update({
      where: { id },
      data: {
        amount: newTotalAmount,
        secondInstallmentAmount: newSecondInstallmentAmount,
      },
      include: {
        service: true,
        spaceType: true,
        packageType: true,
        user: true,
        employee: true,
        reservationAddOns: {
          include: {
            addOn: true,
          },
        },
      },
    });
  });

  return updatedReservation;
};

const createReservationWithPayment = async (
  userId: string,
  data: IReservation,
  paymentMethodId: string,
): Promise<Reservation | null> => {
  // Create the reservation first
  const reservation = await createReservation(userId, data);
  
  if (!reservation) {
    throw new AppError(500, 'Failed to create reservation');
  }
  
  // Process the first installment payment
  const updatedReservation = await processFirstInstallment(
    reservation.id,
    paymentMethodId,
    userId
  );
  
  return updatedReservation;
};

export const ReservationService = {
  createReservation,
  getAllReservations,
  getSingleReservation,
  updateReservation,
  deleteReservation,
  processFirstInstallment,
  processSecondInstallment,
  assignEmployee,
  processCashback,
  approveCashback,
  addReservationAddOn,
  removeReservationAddOn,
  createReservationWithPayment,
};
