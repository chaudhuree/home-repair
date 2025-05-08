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
import { IPaginationOptions, IGenericResponse } from '../../interface/pagination';
import calculatePagination from '../../utils/calculatePagination';
import { reservationSearchableFields } from './reservation.constant';
import AppError from '../../errors/AppError';
import { PaymentService } from '../payment/payment.service';
import { TransactionService } from '../transaction/transaction.service';
import { PaymentMethod } from '../transaction/transaction.interface';
import { createReservationChecklist } from './checklist.util';

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
    // Create the reservation with all data
    const reservation = await tx.reservation.create({
      data: {
        userId,
        serviceId: data.serviceId,
        spaceTypeId: data.spaceTypeId || undefined,
        packageTypeId: data.packageTypeId || undefined,
        stripeCustomerId: user.stripeCustomerId,
        providePaint: data.providePaint,
        paintPrice: data.providePaint ? 0 : data.paintPrice,
        paintName: data.paintName,
        status: ServiceStatus.pending,
        customersGivenImages: data.customersGivenImages || [],
        beforeImages: [],
        afterImages: [],
        projectDescription: data.projectDescription,
        accessInstructionDetails: data.accessInstructionDetails,
        address: data.address,
        userSelectedDates: data.userSelectedDates,
        amount: totalAmount,
        firstInstallmentAmount,
        secondInstallmentAmount,
        firstInstallmentPaid: false,
        secondInstallmentPaid: false,
        paymentStatus: PaymentStatus.pending,
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

  // Create checklist for the reservation after transaction is complete
  await createReservationChecklist(result.id);

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
      checklist: {
        include: {
          items: true,
        },
      },
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
      checklist: {
        include: {
          items: true,
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
        
        // If transitioning from work_done to completed, check if second installment is paid
        // If not paid, automatically process the second installment payment
        if (payload.status === ServiceStatus.completed && !reservation.secondInstallmentPaid) {
          // Only users and property managers can trigger automatic payment
          if (userRole === 'user' || userRole === 'property_manager') {
            try {
              // Process second installment payment
              await processSecondInstallment(id, userId);
              
              // Since processSecondInstallment already updates the reservation status,
              // we should return from here to avoid double-updating
              return await prisma.reservation.findUnique({
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
                },
              }) as Reservation;
            } catch (error) {
              // If payment processing fails, throw an error
              if (error instanceof AppError) {
                throw error;
              }
              throw new AppError(
                400,
                'Failed to process second installment payment. Please try again or contact support.',
              );
            }
          }
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
      service: true,
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

  // Create transaction record for first installment payment using the TransactionService
  await TransactionService.createFirstInstallmentTransaction(
    reservation.id,
    PaymentMethod.stripe,
    reservation.depositPaymentIntentId || undefined // Pass the payment intent ID, handle null case
  );

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
      service: true,
      employee: true,
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

  // Create transaction record for second installment payment
  await prisma.transaction.create({
    data: {
      transactionId: `TRX-${Date.now().toString().slice(-8)}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`,
      reservationId: reservation.id,
      serviceId: reservation.serviceId,
      customerId: reservation.userId,
      employeeId: reservation.employeeId,
      amount: reservation.secondInstallmentAmount,
      paymentMethod: 'stripe',
      paymentType: 'second_installment',
      status: 'successful',
      description: `Second installment payment for ${reservation.service.name} service`,
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
    include: {
      user: true
    }
  });

  if (!cashback) {
    throw new AppError(404, 'Cashback request not found');
  }

  const reservation = await prisma.reservation.findUnique({
    where: { id },
    include: {
      service: true
    }
  });

  if (!reservation) {
    throw new AppError(404, 'Reservation not found');
  }

  // Process the cashback refund
  await PaymentService.processCashbackRefund(id, cashback.amount, cashbackId);

  // Update cashback status
  await prisma.cashback.update({
    where: { id: cashbackId },
    data: {
      status: 'approved',
    },
  });

  // Create a transaction record for the cashback
  await prisma.transaction.create({
    data: {
      transactionId: `TRX-${Date.now().toString().slice(-8)}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`,
      amount: cashback.amount,
      paymentMethod: 'stripe',
      paymentType: 'cashback',
      status: 'successful',
      description: `Cashback payment for reservation ${id}`,
      notes: `Cashback ID: ${cashbackId}`,
      reservation: {
        connect: { id }
      },
      service: {
        connect: { id: reservation.serviceId }
      },
      customer: {
        connect: { id: cashback.userId }
      }
    }
  });

  return reservation;
};

const rejectCashback = async (
  id: string,
  cashbackId: string,
): Promise<Reservation> => {
  const cashback = await prisma.cashback.findUnique({
    where: { id: cashbackId },
    include: {
      user: true
    }
  });

  if (!cashback) {
    throw new AppError(404, 'Cashback request not found');
  }

  const reservation = await prisma.reservation.findUnique({
    where: { id },
    include: {
      service: true
    }
  });

  if (!reservation) {
    throw new AppError(404, 'Reservation not found');
  }

  // Update cashback status
  await prisma.cashback.update({
    where: { id: cashbackId },
    data: {
      status: 'rejected',
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

const getUnassignedReservations = async (
  options: IPaginationOptions,
  status?: ServiceStatus
): Promise<IGenericResponse<Reservation[]>> => {
  const { page, limit, skip, sortBy, sortOrder } = calculatePagination(options);

  // Build the where condition
  const whereCondition: Prisma.ReservationWhereInput = {
    status: {
      in: ['pending', 'accepted']
    }
  };

  // Get reservations
  const reservations = await prisma.reservation.findMany({
    where: whereCondition,
    skip,
    take: limit,
    orderBy: {
      [sortBy]: sortOrder,
    },
    include: {
      service: true,
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          profile: true,
        },
      },
      spaceType: true,
      packageType: true,
      reservationAddOns: {
        include: {
          addOn: true,
        },
      },
    },
  });

  // Get total count
  const total = await prisma.reservation.count({
    where: whereCondition,
  });

  return {
    success: true,
    statusCode: 200,
    message: 'Unassigned reservations retrieved successfully',
    meta: {
      page,
      limit,
      total,
      totalPage: Math.ceil(total / limit),
    },
    data: reservations,
  };
};

const getOngoingJobs = async (
  options: IPaginationOptions
): Promise<IGenericResponse<Reservation[]>> => {
  const { page, limit, skip, sortBy, sortOrder } = calculatePagination(options);

  // Build the where condition for ongoing jobs
  // Ongoing jobs are those with status 'assigned_employee' or 'in_progress'
  const whereCondition: Prisma.ReservationWhereInput = {
    status: {
      in: [ 'in_progress'],
    },
  };

  // Get reservations
  const reservations = await prisma.reservation.findMany({
    where: whereCondition,
    skip,
    take: limit,
    orderBy: {
      [sortBy]: sortOrder,
    },
    include: {
      service: true,
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          profile: true,
        },
      },
      employee: {
        select: {
          id: true,
          name: true,
          email: true,
          profile: true,
        },
      },
      spaceType: true,
      packageType: true,
      reservationAddOns: {
        include: {
          addOn: true,
        },
      },
    },
  });

  // Get total count
  const total = await prisma.reservation.count({
    where: whereCondition,
  });

  return {
    success: true,
    statusCode: 200,
    message: 'Ongoing jobs retrieved successfully',
    meta: {
      page,
      limit,
      total,
      totalPage: Math.ceil(total / limit),
    },
    data: reservations,
  };
};

const getUpcomingJobs = async (
  options: IPaginationOptions
): Promise<IGenericResponse<Reservation[]>> => {
  const { page, limit, skip, sortBy, sortOrder } = calculatePagination(options);

  // Build the where condition for upcoming jobs
  // Upcoming jobs are those with status 'accepted' and have a scheduled date in the future
  const whereCondition: Prisma.ReservationWhereInput = {
    // status: 'accepted',
    firstInstallmentPaid: true,
    scheduledDate: {
      gte: new Date(), // Date greater than or equal to current date
    },
  };

  // Get reservations
  const reservations = await prisma.reservation.findMany({
    where: whereCondition,
    skip,
    take: limit,
    orderBy: {
      [sortBy]: sortOrder,
    },
    include: {
      service: true,
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          profile: true,
        },
      },
      spaceType: true,
      packageType: true,
      reservationAddOns: {
        include: {
          addOn: true,
        },
      },
    },
  });

  // Get total count
  const total = await prisma.reservation.count({
    where: whereCondition,
  });

  return {
    success: true,
    statusCode: 200,
    message: 'Upcoming jobs retrieved successfully',
    meta: {
      page,
      limit,
      total,
      totalPage: Math.ceil(total / limit),
    },
    data: reservations,
  };
};

const getEmployeeJobs = async (
  employeeId: string,
  options: IPaginationOptions
): Promise<IGenericResponse<Reservation[]>> => {
  const { page, limit, skip, sortBy, sortOrder } = calculatePagination(options);

  // Build the where condition for jobs assigned to a specific employee
  const whereCondition: Prisma.ReservationWhereInput = {
    employeeId: employeeId,
  };

  // Get reservations
  const reservations = await prisma.reservation.findMany({
    where: whereCondition,
    skip,
    take: limit,
    orderBy: {
      [sortBy]: sortOrder,
    },
    include: {
      service: true,
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          profile: true,
        },
      },
      spaceType: true,
      packageType: true,
      reservationAddOns: {
        include: {
          addOn: true,
        },
      },
    },
  });

  // Get total count
  const total = await prisma.reservation.count({
    where: whereCondition,
  });

  return {
    success: true,
    statusCode: 200,
    message: 'Employee jobs retrieved successfully',
    meta: {
      page,
      limit,
      total,
      totalPage: Math.ceil(total / limit),
    },
    data: reservations,
  };
};

const getTransactionHistory = async (
  options: IPaginationOptions
): Promise<IGenericResponse<any[]>> => {
  const { page, limit, skip, sortBy, sortOrder } = calculatePagination(options);

  // Get all reservations with payment information
  const reservations = await prisma.reservation.findMany({
    where: {
      OR: [
        { depositPaymentIntentId: { not: null } },
        { finalPaymentIntentId: { not: null } },
        { refundId: { not: null } },
      ],
    },
    orderBy: {
      [sortBy]: sortOrder,
    },
    select: {
      id: true,
      userId: true,
      serviceId: true,
      service: {
        select: {
          name: true,
        },
      },
      user: {
        select: {
          name: true,
          email: true,
        },
      },
      depositPaymentIntentId: true,
      finalPaymentIntentId: true,
      paymentMethodId: true,
      refundId: true,
      amount: true,
      firstInstallmentAmount: true,
      secondInstallmentAmount: true,
      firstInstallmentPaid: true,
      secondInstallmentPaid: true,
      paymentStatus: true,
      refundStatus: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  // Get all approved cashbacks
  const cashbacks = await prisma.cashback.findMany({
    where: {
      status: 'approved',
    },
    include: {
      reservation: {
        select: {
          id: true,
          serviceId: true,
          service: {
            select: {
              name: true,
            },
          },
          refundId: true,
        },
      },
      user: {
        select: {
          name: true,
          email: true,
        },
      },
    },
  });

  // Transform the data to match the required transaction history format
  const transactions = [];

  // Add reservation payment transactions
  for (const reservation of reservations) {
    // Add first installment transaction if it exists
    if (reservation.depositPaymentIntentId) {
      transactions.push({
        transactionDate: reservation.createdAt,
        transactionId: reservation.depositPaymentIntentId,
        serviceId: reservation.serviceId,
        serviceName: reservation.service.name,
        userName: reservation.user.name,
        userEmail: reservation.user.email,
        paymentMethod: 'Card',
        amount: reservation.firstInstallmentAmount,
        paidStatus: reservation.firstInstallmentPaid ? 'paid' : 'pending',
        type: 'payment',
        description: `First installment payment for ${reservation.service.name}`,
      });
    }

    // Add second installment transaction if it exists
    if (reservation.finalPaymentIntentId) {
      transactions.push({
        transactionDate: reservation.updatedAt,
        transactionId: reservation.finalPaymentIntentId,
        serviceId: reservation.serviceId,
        serviceName: reservation.service.name,
        userName: reservation.user.name,
        userEmail: reservation.user.email,
        paymentMethod: 'Card',
        amount: reservation.secondInstallmentAmount,
        paidStatus: reservation.secondInstallmentPaid ? 'paid' : 'pending',
        type: 'payment',
        description: `Final payment for ${reservation.service.name}`,
      });
    }

    // Add refund transaction if applicable
    if (reservation.refundStatus && reservation.refundId) {
      transactions.push({
        transactionDate: reservation.updatedAt,
        transactionId: reservation.refundId,
        serviceId: reservation.serviceId,
        serviceName: reservation.service.name,
        userName: reservation.user.name,
        userEmail: reservation.user.email,
        paymentMethod: 'Card',
        amount: reservation.amount,
        paidStatus: reservation.refundStatus.toLowerCase(),
        type: 'refund',
        description: `Refund for ${reservation.service.name}`,
      });
    }
  }

  // Add cashback transactions
  for (const cashback of cashbacks) {
    transactions.push({
      transactionDate: cashback.updatedAt,
      transactionId: cashback.id,
      serviceId: cashback.reservation.serviceId,
      serviceName: cashback.reservation.service.name,
      userName: cashback.user.name,
      userEmail: cashback.user.email,
      paymentMethod: 'Card',
      amount: cashback.amount,
      paidStatus: 'approved',
      type: 'cashback',
      description: `Cashback for service ${cashback.reservation.service.name}`,
      refundId: cashback.reservation.refundId,
    });
  }

  // Sort transactions by date (newest first)
  transactions.sort((a, b) => new Date(b.transactionDate).getTime() - new Date(a.transactionDate).getTime());

  // Apply pagination to the sorted array
  const paginatedTransactions = transactions.slice(skip, skip + limit);

  return {
    success: true,
    statusCode: 200,
    message: 'Transaction history retrieved successfully',
    meta: {
      page,
      limit,
      total: transactions.length,
      totalPage: Math.ceil(transactions.length / limit),
    },
    data: paginatedTransactions,
  };
};

const getAllCashbacks = async (
  options: IPaginationOptions,
  status?: string
): Promise<IGenericResponse<any[]>> => {
  const { page, limit, skip, sortBy, sortOrder } = calculatePagination(options);

  // Build where condition
  const whereCondition: Prisma.CashbackWhereInput = {};
  
  // Add status filter if provided
  if (status) {
    whereCondition.status = status as any;
  }

  // Get cashbacks with pagination
  const cashbacks = await prisma.cashback.findMany({
    where: whereCondition,
    skip,
    take: limit,
    orderBy: {
      [sortBy]: sortOrder,
    },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          profile: true,
        },
      },
      reservation: {
        select: {
          id: true,
          service: true,
          refundId: true,
          refundStatus: true,
        },
      },
    },
  });

  // Get total count
  const total = await prisma.cashback.count({
    where: whereCondition,
  });

  return {
    success: true,
    statusCode: 200,
    message: 'Cashbacks retrieved successfully',
    meta: {
      page,
      limit,
      total,
      totalPage: Math.ceil(total / limit),
    },
    data: cashbacks,
  };
};

const scheduleReservation = async (id: string, scheduledDate: Date | string): Promise<Reservation> => {
  // Check if reservation exists
  const reservation = await prisma.reservation.findUnique({
    where: { id },
  });

  if (!reservation) {
    throw new AppError(404, 'Reservation not found');
  }

  // Update the scheduled date
  const updatedReservation = await prisma.reservation.update({
    where: { id },
    data: { 
      scheduledDate: new Date(scheduledDate),
    },
    include: {
      service: true,
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          profile: true,
        },
      },
      employee: {
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
        },
      },
      spaceType: true,
      packageType: true,
      reservationAddOns: {
        include: {
          addOn: true,
        },
      },
    },
  });

  return updatedReservation;
};

const getEmployeeActiveJobs = async (
  employeeId: string,
  options: IPaginationOptions
): Promise<IGenericResponse<Reservation[]>> => {
  const { page, limit, skip, sortBy, sortOrder } = calculatePagination(options);

  // Find reservations where the employee is assigned and status is in_progress
  const result = await prisma.reservation.findMany({
    where: {
      employeeId,
      status: ServiceStatus.in_progress
    },
    skip,
    take: limit,
    orderBy: sortBy && sortOrder ? {
      [sortBy]: sortOrder,
    } : {
      createdAt: 'desc',
    },
    include: {
      service: true,
      spaceType: true,
      packageType: true,
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          profile: true,
        },
      },
      reservationAddOns: {
        include: {
          addOn: true,
        },
      },
    },
  });

  const total = await prisma.reservation.count({
    where: {
      employeeId,
      status: ServiceStatus.in_progress
    },
  });

  return {
    success: true,
    statusCode: 200,
    message: 'Employee active jobs retrieved successfully',
    meta: {
      page,
      limit,
      total,
      totalPage: Math.ceil(total / limit),
    },
    data: result,
  };
};

const getEmployeeUpcomingJobs = async (
  employeeId: string,
  options: IPaginationOptions
): Promise<IGenericResponse<Reservation[]>> => {
  const { page, limit, skip, sortBy, sortOrder } = calculatePagination(options);
  const today = new Date();

  // Find reservations where the employee is assigned, status is assigned_employee, and scheduledDate is in the future
  const result = await prisma.reservation.findMany({
    where: {
      employeeId,
      status: ServiceStatus.assigned_employee,
      scheduledDate: {
        gt: today
      }
    },
    skip,
    take: limit,
    orderBy: sortBy && sortOrder ? {
      [sortBy]: sortOrder,
    } : {
      scheduledDate: 'asc', // Default sort by scheduled date ascending
    },
    include: {
      service: true,
      spaceType: true,
      packageType: true,
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          profile: true,
        },
      },
      reservationAddOns: {
        include: {
          addOn: true,
        },
      },
    },
  });

  const total = await prisma.reservation.count({
    where: {
      employeeId,
      status: ServiceStatus.assigned_employee,
      scheduledDate: {
        gt: today
      }
    },
  });

  return {
    success: true,
    statusCode: 200,
    message: 'Employee upcoming jobs retrieved successfully',
    meta: {
      page,
      limit,
      total,
      totalPage: Math.ceil(total / limit),
    },
    data: result,
  };
};

const getEmployeeDashboardStats = async (
  employeeId: string
): Promise<IGenericResponse<any>> => {
  // Get total completed jobs by the employee
  const totalCompletedJobs = await prisma.reservation.count({
    where: {
      employeeId,
      status: ServiceStatus.completed
    },
  });

  // Get all completed reservations by the employee
  const completedReservations = await prisma.reservation.findMany({
    where: {
      employeeId,
      status: ServiceStatus.completed
    },
    select: {
      amount: true
    }
  });

  // Calculate average reservation value
  let averageReservationValue = 0;
  if (completedReservations.length > 0) {
    const totalValue = completedReservations.reduce((sum, reservation) => sum + reservation.amount, 0);
    averageReservationValue = totalValue / completedReservations.length;
  }

  // Get total active jobs (in_progress)
  const totalActiveJobs = await prisma.reservation.count({
    where: {
      employeeId,
      status: ServiceStatus.in_progress
    },
  });

  // Get total upcoming jobs (assigned_employee and scheduledDate > today)
  const today = new Date();
  const totalUpcomingJobs = await prisma.reservation.count({
    where: {
      employeeId,
      status: ServiceStatus.assigned_employee,
      scheduledDate: {
        gt: today
      }
    },
  });

  return {
    success: true,
    statusCode: 200,
    message: 'Employee dashboard statistics retrieved successfully',
    data: {
      totalCompletedJobs,
      averageReservationValue,
      totalActiveJobs,
      totalUpcomingJobs
    },
  };
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
  rejectCashback,
  addReservationAddOn,
  removeReservationAddOn,
  createReservationWithPayment,
  getUnassignedReservations,
  getOngoingJobs,
  getUpcomingJobs,
  getEmployeeJobs,
  getTransactionHistory,
  getAllCashbacks,
  scheduleReservation,
  getEmployeeActiveJobs,
  getEmployeeUpcomingJobs,
  getEmployeeDashboardStats,
};
