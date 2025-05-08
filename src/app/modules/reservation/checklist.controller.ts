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
  
  // First get the current state of the checklist item
  const currentItem = await ChecklistService.getChecklistItem(itemId);
  
  // Toggle the isDone property
  const newIsDone = !currentItem.isDone;
  
  // Update with the toggled value - pass the boolean directly instead of an object
  const result = await ChecklistService.updateChecklistItem(itemId, newIsDone);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Checklist item toggled successfully',
    data: result,
  });
});

export const ChecklistController = {
  createChecklist,
  getChecklist,
  updateChecklistItem,
};
