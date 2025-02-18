import { Request, Response } from 'express';
import catchAsync from '../../utils/catchAsync';
import sendResponse from '../../utils/sendResponse';
import httpStatus from 'http-status';
import { CashbackService } from './cashback.service';

const getAllCashbacks = catchAsync(async (req: Request, res: Response) => {
  const result = await CashbackService.getAllCashbacks();

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Cashback requests retrieved successfully',
    data: result,
  });
});

export const CashbackController = {
  getAllCashbacks,
};
