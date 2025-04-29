import { Request, Response } from 'express';
import catchAsync from '../../utils/catchAsync';
import sendResponse from '../../utils/sendResponse';
import httpStatus from 'http-status';
import { CashbackService } from './cashback.service';

// Get all cashbacks
const getAllCashbacks = catchAsync(async (req: Request, res: Response) => {
  const result = await CashbackService.getAllCashbacks();

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Cashback requests retrieved successfully',
    data: result,
  });
});

// Get a single cashback by ID
const getSingleCashback = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;
  const result = await CashbackService.getSingleCashback(id);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Cashback request retrieved successfully',
    data: result,
  });
});

// Create a new cashback request
const createCashback = catchAsync(async (req: Request, res: Response) => {
  const userId = req.user?.userId;
  const { reservationId, amount, proof } = req.body;

  const result = await CashbackService.createCashback({
    userId,
    reservationId,
    amount,
    proof,
  });

  sendResponse(res, {
    statusCode: httpStatus.CREATED,
    success: true,
    message: 'Cashback request created successfully',
    data: result,
  });
});

// Approve a cashback request
const approveCashback = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;
  const result = await CashbackService.approveCashback(id);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Cashback request approved successfully',
    data: result,
  });
});

// Reject a cashback request
const rejectCashback = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;
  const result = await CashbackService.rejectCashback(id);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Cashback request rejected successfully',
    data: result,
  });
});

export const CashbackController = {
  getAllCashbacks,
  getSingleCashback,
  createCashback,
  approveCashback,
  rejectCashback,
};
