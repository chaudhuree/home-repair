import { Request, Response } from 'express';
import httpStatus from 'http-status';
import { ReservationService } from './reservation.service';
import catchAsync from '../../utils/catchAsync';
import sendResponse from '../../utils/sendResponse';
import pickValidFields from '../../utils/pickValidFields';
import { IPaginationOptions } from '../../interface/pagination';
import { reservationFilterableFields } from './reservation.constant';

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
    page: Number(req.query.page),
    limit: Number(req.query.limit),
    sortBy: req.query.sortBy?.toString(),
    sortOrder: req.query.sortOrder?.toString() as 'asc' | 'desc'
  };

  const result = await ReservationService.getAllReservations(filters, options);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Reservations retrieved successfully',
    meta: result.meta,
    data: result.data,
  });
});

const getSingleReservation = catchAsync(async (req: Request, res: Response) => {
  const result = await ReservationService.getSingleReservation(req.params.id);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Reservation retrieved successfully',
    data: result,
  });
});

const updateReservation = catchAsync(async (req: Request, res: Response) => {
  const result = await ReservationService.updateReservation(req.params.id, req.body);
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

export const ReservationController = {
  createReservation,
  getAllReservations,
  getSingleReservation,
  updateReservation,
  deleteReservation,
};
