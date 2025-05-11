import { UserRole } from '@prisma/client';
import prisma from '../../utils/prisma';
import { ICreateNotification, INotification, INotificationFilters, INotificationResponse } from './notification.interface';
import calculatePagination from '../../utils/calculatePagination';
import { IPaginationOptions } from '../../interface/pagination';

// Create notification
const createNotification = async (payload: ICreateNotification): Promise<INotification> => {
  // Create a data object with required fields
  const data: any = {
    content: payload.content,
    isSeen: false,
    // Prisma automatically handles createdAt and updatedAt fields
  };

  // Only add optional fields if they exist
  if (payload.userId) data.userId = payload.userId;
  if (payload.fromUserId) data.fromUserId = payload.fromUserId;
  if (payload.forRole) data.forRole = payload.forRole;

  const notification = await prisma.notification.create({ data });

  return notification;
};

// Get notifications for a user with pagination
const getNotifications = async (filters: INotificationFilters): Promise<INotificationResponse> => {
  const { userId, forRole, isSeen, options } = filters;
  
  // Calculate pagination options
  const { page, limit, skip, sortBy, sortOrder } = calculatePagination(options || {});
  
  // Build where condition
  const whereCondition: any = {};
  if (userId) whereCondition.userId = userId;
  if (forRole) whereCondition.forRole = forRole;
  if (isSeen !== undefined) whereCondition.isSeen = isSeen;

  // Get notifications with pagination
  const notifications = await prisma.notification.findMany({
    where: whereCondition,
    skip,
    take: limit,
    orderBy: sortBy && sortOrder ? {
      [sortBy]: sortOrder,
    } : {
      createdAt: 'desc',
    },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          role: true
        }
      },
      fromUser: {
        select: {
          id: true,
          name: true,
          email: true,
          role: true
        }
      }
    }
  });

  // Count total notifications for pagination metadata
  const total = await prisma.notification.count({ where: whereCondition });
  const totalPage = Math.ceil(total / limit);

  return {
    meta: {
      page,
      limit,
      total,
      totalPage
    },
    data: notifications
  };
};

// Get notifications for managers with pagination
const getManagerNotifications = async (options?: IPaginationOptions): Promise<INotificationResponse> => {
  // Calculate pagination options
  const { page, limit, skip, sortBy, sortOrder } = calculatePagination(options || {});
  
  // Build where condition for managers
  const whereCondition: any = {
    forRole: {
      in: [UserRole.manager, UserRole.super_admin]
    }
  };

  // Get notifications with pagination
  const notifications = await prisma.notification.findMany({
    where: whereCondition,
    skip,
    take: limit,
    orderBy: sortBy && sortOrder ? {
      [sortBy]: sortOrder,
    } : {
      createdAt: 'desc',
    },
    include: {
      fromUser: {
        select: {
          id: true,
          name: true,
          email: true,
          role: true
        }
      }
    }
  });

  // Count total notifications for pagination metadata
  const total = await prisma.notification.count({ where: whereCondition });
  const totalPage = Math.ceil(total / limit);

  return {
    meta: {
      page,
      limit,
      total,
      totalPage
    },
    data: notifications
  };
};

// Mark a notification as seen
const markAsSeen = async (id: string): Promise<INotification> => {
  return prisma.notification.update({
    where: { id },
    data: { isSeen: true },
  });
};

// Mark all notifications as seen for a user
const markAllAsSeen = async (userId: string) => {
  return prisma.notification.updateMany({
    where: { userId },
    data: { isSeen: true },
  });
};

export const NotificationService = {
  createNotification,
  getNotifications,
  getManagerNotifications,
  markAsSeen,
  markAllAsSeen
};
