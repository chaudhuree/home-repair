import { Request, Response } from 'express';
import httpStatus from 'http-status';
import catchAsync from '../../utils/catchAsync';
import { ReservationService } from './reservation.service';
import sendResponse from '../../utils/sendResponse';
import AppError from '../../errors/AppError';
import pickValidFields from '../../utils/pickValidFields';
import { IPaginationOptions } from '../../interface/pagination';
import { reservationFilterableFields } from './reservation.constant';
import { ServiceStatus } from '@prisma/client';

const createReservation = catchAsync(async (req: Request, res: Response) => {
  const result = await ReservationService.createReservation(req.user.id, req.body);
  sendResponse(res, {
    statusCode: httpStatus.CREATED,
    success: true,
    message: 'Reservation created successfully',
    data: result,
  });
});

const getAllReservations = catchAsync(async (req: Request, res: Response) => {
  const filters = pickValidFields(req.query, reservationFilterableFields);
  const options: IPaginationOptions = {
    page: Number(req.query.page) || 1,
    limit: Number(req.query.limit) || 10,
    sortBy: req.query.sortBy?.toString(),
    sortOrder: req.query.sortOrder?.toString() as 'asc' | 'desc'
  };

  const result = await ReservationService.getAllReservations(
    filters,
    options,
    req.user.id,
    req.user.role
  );

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Reservations retrieved successfully',
    meta: result.meta,
    data: result.data,
  });
});

const getSingleReservation = catchAsync(async (req: Request, res: Response) => {
  const result = await ReservationService.getSingleReservation(
    req.params.id,
    req.user.id,
    req.user.role
  );

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Reservation retrieved successfully',
    data: result,
  });
});

const updateReservation = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;
  const result = await ReservationService.updateReservation(
    id,
    req.body,
    req.user.id,
    req.user.role
  );

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Reservation updated successfully',
    data: result,
  });
});

const deleteReservation = catchAsync(async (req: Request, res: Response) => {
  const result = await ReservationService.deleteReservation(req.params.id);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Reservation deleted successfully',
    data: result,
  });
});

const processFirstInstallment = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;
  const { paymentMethodId } = req.body;
  const userId = req.user.id;

  const result = await ReservationService.processFirstInstallment(id, paymentMethodId, userId);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'First installment payment processed successfully',
    data: result,
  });
});

const processSecondInstallment = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;
  const userId = req.user.id;

  const result = await ReservationService.processSecondInstallment(id, userId);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Second installment payment processed successfully',
    data: result,
  });
});

const processCashback = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;
  const userId = req.user?.id;
  const { reviewImage } = req.body;

  const result = await ReservationService.processCashback(id, userId, reviewImage);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Cashback request submitted successfully',
    data: result,
  });
});

const approveCashback = catchAsync(async (req: Request, res: Response) => {
  const { id, cashbackId } = req.params;

  const result = await ReservationService.approveCashback(id, cashbackId);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Cashback approved successfully',
    data: result,
  });
});

const assignEmployee = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;
  const result = await ReservationService.assignEmployee(id, req.body);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Employee assigned to reservation successfully',
    data: result,
  });
});

const addReservationAddOn = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;
  const userId = req.user.id;
  const result = await ReservationService.addReservationAddOn(id, req.body, userId);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Add-on added to reservation successfully',
    data: result,
  });
});

const removeReservationAddOn = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;
  const userId = req.user.id;
  const result = await ReservationService.removeReservationAddOn(id, req.body, userId);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Add-on removed from reservation successfully',
    data: result,
  });
});

const createReservationWithPayment = catchAsync(async (req: Request, res: Response) => {
  const { paymentMethodId, ...reservationData } = req.body;
  
  const result = await ReservationService.createReservationWithPayment(
    req.user.id,
    reservationData,
    paymentMethodId
  );

  sendResponse(res, {
    statusCode: httpStatus.CREATED,
    success: true,
    message: 'Reservation created and first installment processed successfully',
    data: result,
  });
});

const getUnassignedReservations = catchAsync(async (req: Request, res: Response) => {
  const options: IPaginationOptions = {
    page: Number(req.query.page) || 1,
    limit: Number(req.query.limit) || 10,
    sortBy: req.query.sortBy?.toString(),
    sortOrder: req.query.sortOrder?.toString() as 'asc' | 'desc'
  };
  
  // Get status filter if provided
  const status = req.query.status as ServiceStatus | undefined;

  const result = await ReservationService.getUnassignedReservations(options, status);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Unassigned reservations retrieved successfully',
    meta: result.meta,
    data: result.data,
  });
});

const getOngoingJobs = catchAsync(async (req: Request, res: Response) => {
  const options: IPaginationOptions = {
    page: Number(req.query.page) || 1,
    limit: Number(req.query.limit) || 10,
    sortBy: req.query.sortBy?.toString(),
    sortOrder: req.query.sortOrder?.toString() as 'asc' | 'desc'
  };

  const result = await ReservationService.getOngoingJobs(options);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Ongoing jobs retrieved successfully',
    meta: result.meta,
    data: result.data,
  });
});

const getUpcomingJobs = catchAsync(async (req: Request, res: Response) => {
  const options: IPaginationOptions = {
    page: Number(req.query.page) || 1,
    limit: Number(req.query.limit) || 10,
    sortBy: req.query.sortBy?.toString(),
    sortOrder: req.query.sortOrder?.toString() as 'asc' | 'desc'
  };

  const result = await ReservationService.getUpcomingJobs(options);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Upcoming jobs retrieved successfully',
    meta: result.meta,
    data: result.data,
  });
});

const getEmployeeJobs = catchAsync(async (req: Request, res: Response) => {
  const { employeeId } = req.params;
  
  const options: IPaginationOptions = {
    page: Number(req.query.page) || 1,
    limit: Number(req.query.limit) || 10,
    sortBy: req.query.sortBy?.toString(),
    sortOrder: req.query.sortOrder?.toString() as 'asc' | 'desc'
  };

  const result = await ReservationService.getEmployeeJobs(employeeId, options);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Employee jobs retrieved successfully',
    meta: result.meta,
    data: result.data,
  });
});

const getTransactionHistory = catchAsync(async (req: Request, res: Response) => {
  const options: IPaginationOptions = {
    page: Number(req.query.page) || 1,
    limit: Number(req.query.limit) || 10,
    sortBy: req.query.sortBy?.toString(),
    sortOrder: req.query.sortOrder?.toString() as 'asc' | 'desc'
  };

  const result = await ReservationService.getTransactionHistory(options);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Transaction history retrieved successfully',
    meta: result.meta,
    data: result.data,
  });
});

const getAllCashbacks = catchAsync(async (req: Request, res: Response) => {
  const options: IPaginationOptions = {
    page: Number(req.query.page) || 1,
    limit: Number(req.query.limit) || 10,
    sortBy: req.query.sortBy?.toString(),
    sortOrder: req.query.sortOrder?.toString() as 'asc' | 'desc'
  };
  
  // Get status filter if provided
  const status = req.query.status?.toString();

  const result = await ReservationService.getAllCashbacks(options, status);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Cashbacks retrieved successfully',
    meta: result.meta,
    data: result.data,
  });
});

export const scheduleReservation = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;
  const { scheduledDate } = req.body;

  // Validate that scheduledDate is provided
  if (!scheduledDate) {
    throw new AppError(400, 'Scheduled date is required');
  }

  const result = await ReservationService.scheduleReservation(id, scheduledDate);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Reservation scheduled successfully',
    data: result,
  });
});

export const ReservationController = {
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
  getUnassignedReservations,
  getOngoingJobs,
  getUpcomingJobs,
  getEmployeeJobs,
  getTransactionHistory,
  getAllCashbacks,
  scheduleReservation,
};
