import { Prisma, Reservation, ServiceStatus, PaymentStatus } from '@prisma/client';
import prisma from '../../utils/prisma';
import { IReservation, IReservationFilters, IUpdateReservation, IAssignEmployee } from './reservation.interface';
import { IPaginationOptions } from '../../interface/pagination';
import calculatePagination from '../../utils/calculatePagination';
import { reservationSearchableFields } from './reservation.constant';
import AppError from '../../errors/AppError';

const createReservation = async (userId: string, data: IReservation): Promise<Reservation> => {
  const service = await prisma.service.findUnique({
    where: { id: data.serviceId }
  });

  if (!service) {
    throw new AppError(404, 'Service not found');
  }

  // Calculate installments (50% each)
  const firstInstallmentAmount = data.amount * 0.5;
  const secondInstallmentAmount = data.amount * 0.5;

  const result = await prisma.reservation.create({
    data: {
      ...data,
      userId,
      firstInstallmentAmount,
      secondInstallmentAmount,
      firstInstallmentPaid: false,
      secondInstallmentPaid: false,
      status: ServiceStatus.pending,
      paymentStatus: PaymentStatus.pending
    },
    include: {
      service: true,
      user: true
    }
  });

  return result;
};

const getAllReservations = async (
  filters: IReservationFilters,
  options: IPaginationOptions,
  userId: string,
  userRole: string
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
          mode: 'insensitive'
        }
      }))
    });
  }

  // Handle other filters
  type FilterKeys = Exclude<keyof IReservationFilters, 'searchTerm'>;
  
  (Object.keys(filterData) as FilterKeys[]).forEach(key => {
    const value = filterData[key];
    if (value !== undefined) {
      andConditions.push({
        [key]: value
      });
    }
  });

  const whereConditions: Prisma.ReservationWhereInput =
    andConditions.length > 0 ? { AND: andConditions } : {};

  const result = await prisma.reservation.findMany({
    where: whereConditions,
    skip,
    take: limit,
    orderBy: sortBy && sortOrder ? {
      [sortBy]: sortOrder
    } : {
      createdAt: 'desc'
    },
    include: {
      service: true,
      user: true,
      employee: true
    }
  });

  const total = await prisma.reservation.count({
    where: whereConditions
  });

  return {
    meta: {
      page,
      limit,
      total
    },
    data: result
  };
};

const getSingleReservation = async (
  id: string,
  userId: string,
  userRole: string
): Promise<Reservation> => {
  const reservation = await prisma.reservation.findUnique({
    where: {
      id,
    },
    include: {
      service: true,
      user: true,
      employee: true,
    },
  });

  if (!reservation) {
    throw new AppError(404, 'Reservation not found');
  }

  // Role-based access control
  switch (userRole) {
    case 'user':
    case 'property_manager':
      // Users and property managers can only view their own reservations
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
      
    case 'manager':
    case 'super_admin':
      // Managers and super admins can view all reservations
      break;
      
    default:
      throw new AppError(403, 'You are not authorized to view reservations');
  }

  return reservation;
};

const updateReservation = async (
  id: string,
  payload: IUpdateReservation,
  userId: string,
  userRole: string
): Promise<Reservation> => {
  const existingReservation = await prisma.reservation.findUnique({
    where: { id }
  });

  if (!existingReservation) {
    throw new AppError(404, 'Reservation not found');
  }

  // Check authorization for status updates
  if (payload.status === ServiceStatus.in_progress || payload.status === ServiceStatus.completed) {
    // Only manager or assigned employee can update these statuses
    const isManager = userRole === 'manager';
    const isAssignedEmployee = existingReservation.employeeId === userId;

    if (!isManager && !isAssignedEmployee) {
      throw new AppError(403, 'Only manager or assigned employee can update work status');
    }
  }

  // Check if trying to update status to in_progress or completed without an employee
  if (
    (payload.status === ServiceStatus.in_progress || payload.status === ServiceStatus.completed) && 
    !existingReservation.employeeId
  ) {
    throw new AppError(400, 'Cannot start or complete work without an assigned employee');
  }

  // Handle work start time when status changes to in_progress
  if (payload.status === ServiceStatus.in_progress) {
    if (!existingReservation.firstInstallmentPaid) {
      throw new AppError(400, 'First installment payment required before starting work');
    }
    payload = {
      ...payload,
      workStartTime: new Date()
    };
  }

  // Handle work end time when status changes to completed
  if (payload.status === ServiceStatus.completed) {
    if (!existingReservation.workStartTime) {
      throw new AppError(400, 'Work must be started before completion');
    }
    if (!existingReservation.secondInstallmentPaid) {
      throw new AppError(400, 'Second installment payment required before completing work');
    }
    payload = {
      ...payload,
      workEndTime: new Date()
    };
  }

  // Update payment status based on installment payments
  if (payload.firstInstallmentPaid || payload.secondInstallmentPaid) {
    const willFirstBePaid = payload.firstInstallmentPaid ?? existingReservation.firstInstallmentPaid;
    const willSecondBePaid = payload.secondInstallmentPaid ?? existingReservation.secondInstallmentPaid;

    if (willFirstBePaid && willSecondBePaid) {
      payload.paymentStatus = PaymentStatus.total_paid;
    } else if (willFirstBePaid || willSecondBePaid) {
      payload.paymentStatus = PaymentStatus.partially_paid;
    }
  }

  const result = await prisma.reservation.update({
    where: { id },
    data: payload,
    include: {
      service: true,
      user: true,
      employee: true
    }
  });

  return result;
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

const confirmFirstInstallment = async (id: string, userId: string): Promise<Reservation> => {
  const reservation = await prisma.reservation.findUnique({
    where: { id }
  });

  if (!reservation) {
    throw new AppError(404, 'Reservation not found');
  }

  // Verify the user owns this reservation
  if (reservation.userId !== userId) {
    throw new AppError(403, 'You are not authorized to pay for this reservation');
  }

  // Check if already paid
  if (reservation.firstInstallmentPaid) {
    throw new AppError(400, 'First installment is already paid');
  }

  const result = await prisma.reservation.update({
    where: { id },
    data: {
      firstInstallmentPaid: true,
      paymentStatus: PaymentStatus.partially_paid
    },
    include: {
      service: true,
      user: true
    }
  });
  return result;
};

const confirmSecondInstallment = async (id: string, userId: string): Promise<Reservation> => {
  const reservation = await prisma.reservation.findUnique({
    where: { id }
  });

  if (!reservation) {
    throw new AppError(404, 'Reservation not found');
  }

  // Verify the user owns this reservation
  if (reservation.userId !== userId) {
    throw new AppError(403, 'You are not authorized to pay for this reservation');
  }

  // Check if first installment is paid
  if (!reservation.firstInstallmentPaid) {
    throw new AppError(400, 'First installment must be paid before paying second installment');
  }

  // Check if already paid
  if (reservation.secondInstallmentPaid) {
    throw new AppError(400, 'Second installment is already paid');
  }

  const result = await prisma.reservation.update({
    where: { id },
    data: {
      secondInstallmentPaid: true,
      paymentStatus: PaymentStatus.total_paid
    },
    include: {
      service: true,
      user: true
    }
  });
  return result;
};

const assignEmployee = async (
  id: string,
  payload: IAssignEmployee
): Promise<Reservation> => {
  // Check if reservation exists
  const existingReservation = await prisma.reservation.findUnique({
    where: { id }
  });

  if (!existingReservation) {
    throw new AppError(404, 'Reservation not found');
  }

  // Check if employee exists and has employee role
  const employee = await prisma.user.findFirst({
    where: {
      id: payload.employeeId,
      role: 'employee'
    }
  });

  if (!employee) {
    throw new AppError(404, 'Employee not found or user is not an employee');
  }

  // Check if employee is already assigned to this reservation
  if (existingReservation.employeeId === payload.employeeId) {
    throw new AppError(400, 'Employee is already assigned to this reservation');
  }

  const result = await prisma.reservation.update({
    where: { id },
    data: {
      employeeId: payload.employeeId
    },
    include: {
      service: true,
      user: true,
      employee: true
    }
  });

  return result;
};

export const ReservationService = {
  createReservation,
  getAllReservations,
  getSingleReservation,
  updateReservation,
  deleteReservation,
  confirmFirstInstallment,
  confirmSecondInstallment,
  assignEmployee,
};
