import { Prisma, Reservation, ServiceStatus } from '@prisma/client';
import prisma from '../../utils/prisma';
import { IReservation, IReservationFilters, IUpdateReservation } from './reservation.interface';
import { IPaginationOptions } from '../../interface/pagination';
import  calculatePagination  from '../../utils/calculatePagination';
import { reservationSearchableFields } from './reservation.constant';
import AppError from '../../errors/AppError';
import { Order } from '@prisma/client';

const createReservation = async (userId: string, data: IReservation): Promise<Reservation> => {
  const service = await prisma.service.findUnique({
    where: { id: data.serviceId }
  });

  if (!service) {
    throw new AppError(404, 'Service not found');
  }

  const result = await prisma.reservation.create({
    data: {
      ...data,
      userId,
      status: ServiceStatus.pending,
    },
    include: {
      service: true,
      user: true,
    },
  });
  return result;
};

const getAllReservations = async (
  filters: IReservationFilters,
  options: IPaginationOptions
) => {
  const { searchTerm, ...filterData } = filters;
  const { page, limit, skip, sortBy, sortOrder } = calculatePagination(options);

  const andConditions = [];

  if (searchTerm) {
    andConditions.push({
      OR: reservationSearchableFields.map(field => ({
        [field]: {
          contains: searchTerm,
          mode: 'insensitive',
        },
      })),
    });
  }

  if (Object.keys(filterData).length > 0) {
    andConditions.push({
      AND: Object.keys(filterData).map(key => ({
        [key]: {
          equals: (filterData as any)[key],
        },
      })),
    });
  }

  const whereConditions: Prisma.ReservationWhereInput =
    andConditions.length > 0 ? { AND: andConditions } : {};

  const result = await prisma.reservation.findMany({
    where: whereConditions,
    skip,
    take: limit,
    orderBy: {
      [sortBy]: sortOrder,
    },
    include: {
      service: true,
      user: true,
      employee: true,
    },
  });
  const totalCount = await prisma.reservation.count({
    where: whereConditions,
  });

  return {
    meta: {
      page,
      limit,
      total: totalCount,
    },
    data: result,
  };
};

const getSingleReservation = async (id: string): Promise<Reservation | null> => {
  const result = await prisma.reservation.findUnique({
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

const updateReservation = async (
  id: string,
  payload: IUpdateReservation
): Promise<Reservation> => {
  const existingReservation = await prisma.reservation.findUnique({
    where: { id }
  });

  if (!existingReservation) {
    throw new AppError(404, 'Reservation not found');
  }

  // Handle work start time when status changes to in_progress
  if (payload.status === ServiceStatus.in_progress) {
    payload = {
      ...payload,
      workStartTime: new Date()
    };
  }

  // Handle work end time when status changes to completed
  if (payload.status === ServiceStatus.completed) {
    if (!existingReservation.workStartTime) {
      throw new AppError(400, 'Cannot complete work that has not been started');
    }
    payload = {
      ...payload,
      workEndTime: new Date()
    };
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

export const ReservationService = {
  createReservation,
  getAllReservations,
  getSingleReservation,
  updateReservation,
  deleteReservation,
};
