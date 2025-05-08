import { Request, Response } from 'express';
import catchAsync from '../../utils/catchAsync';
import sendResponse from '../../utils/sendResponse';
import httpStatus from 'http-status';
import { ChecklistService } from './checklist.service';

const createChecklist = catchAsync(async (req: Request, res: Response) => {
  const { reservationId } = req.params;
  const result = await ChecklistService.createChecklist(reservationId);

  sendResponse(res, {
    statusCode: httpStatus.CREATED,
    success: true,
    message: 'Checklist created successfully',
    data: result,
  });
});

const getChecklist = catchAsync(async (req: Request, res: Response) => {
  const { reservationId } = req.params;
  const result = await ChecklistService.getChecklist(reservationId);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Checklist retrieved successfully',
    data: result,
  });
});

const updateChecklistItem = catchAsync(async (req: Request, res: Response) => {
  const { itemId } = req.params;
  const result = await ChecklistService.updateChecklistItem(itemId, req.body);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Checklist item updated successfully',
    data: result,
  });
});

export const ChecklistController = {
  createChecklist,
  getChecklist,
  updateChecklistItem,
};
