import { Request, Response } from 'express';
import { NotificationService } from './notification.service';
import catchAsync from '../../utils/catchAsync';
import sendResponse from '../../utils/sendResponse';
import { ICreateNotification } from './notification.interface';
import { UserRole } from '@prisma/client';
import calculatePagination from '../../utils/calculatePagination';
import { IPaginationOptions } from '../../interface/pagination';

// Create notification
const createNotification = catchAsync(async (req: Request, res: Response) => {
  const payload: ICreateNotification = req.body;
  const result = await NotificationService.createNotification(payload);

  sendResponse(res, {
    success: true,
    statusCode: 201,
    message: 'Notification created successfully',
    data: result
  });
});

// Get notifications for a user with pagination
const getNotifications = catchAsync(async (req: Request, res: Response) => {
  const userId = req.params.userId;
  const { forRole, isSeen, page, limit, sortBy, sortOrder } = req.query;
  
  // Prepare pagination options
  const paginationOptions: IPaginationOptions = {
    page: page ? Number(page) : undefined,
    limit: limit ? Number(limit) : undefined,
    sortBy: sortBy as string,
    sortOrder: sortOrder as 'asc' | 'desc'
  };
  
  // Prepare filters
  const filters = {
    userId,
    forRole: forRole as UserRole,
    isSeen: isSeen === 'true' ? true : isSeen === 'false' ? false : undefined,
    options: paginationOptions
  };
  
  const result = await NotificationService.getNotifications(filters);

  sendResponse(res, {
    success: true,
    statusCode: 200,
    message: 'Notifications retrieved successfully',
    meta: result.meta,
    data: result.data
  });
});

// Get notifications for managers with pagination
const getManagerNotifications = catchAsync(async (req: Request, res: Response) => {
  const { page, limit, sortBy, sortOrder } = req.query;
  
  // Prepare pagination options
  const paginationOptions: IPaginationOptions = {
    page: page ? Number(page) : undefined,
    limit: limit ? Number(limit) : undefined,
    sortBy: sortBy as string,
    sortOrder: sortOrder as 'asc' | 'desc'
  };
  
  const result = await NotificationService.getManagerNotifications(paginationOptions);

  sendResponse(res, {
    success: true,
    statusCode: 200,
    message: 'Manager notifications retrieved successfully',
    meta: result.meta,
    data: result.data
  });
});

// Mark a notification as seen
const markAsSeen = catchAsync(async (req: Request, res: Response) => {
  const id = req.params.id;
  const result = await NotificationService.markAsSeen(id);

  sendResponse(res, {
    success: true,
    statusCode: 200,
    message: 'Notification marked as seen successfully',
    data: result
  });
});

// Mark all notifications as seen for a user
const markAllAsSeen = catchAsync(async (req: Request, res: Response) => {
  const userId = req.params.userId;
  const result = await NotificationService.markAllAsSeen(userId);

  sendResponse(res, {
    success: true,
    statusCode: 200,
    message: 'All notifications marked as seen successfully',
    data: result
  });
});

export const NotificationController = {
  createNotification,
  getNotifications,
  getManagerNotifications,
  markAsSeen,
  markAllAsSeen
};
