import { UserRole } from '@prisma/client';
import prisma from '../../utils/prisma';
import { ICreateNotification, INotification, INotificationFilters, INotificationResponse } from './notification.interface';
import calculatePagination from '../../utils/calculatePagination';
import { IPaginationOptions } from '../../interface/pagination';

// Create notification
const createNotification = async (payload: ICreateNotification): Promise<INotification> => {
  // Prepare data object with proper typing
  const data = {
    content: payload.content,
    isSeen: false,
    ...(payload.userId ? { userId: payload.userId } : {}),
    ...(payload.fromUserId ? { fromUserId: payload.fromUserId } : {}),
    ...(payload.forRole ? { forRole: payload.forRole } : {})
    // Prisma automatically handles createdAt and updatedAt fields
  };

  const notification = await prisma.notification.create({ data });

  return notification;
};

// Get notifications for a user with pagination
const getNotifications = async (filters: INotificationFilters): Promise<INotificationResponse> => {
  const { userId, forRole, isSeen, options } = filters;
  
  // Calculate pagination options
  const { page, limit, skip, sortBy, sortOrder } = calculatePagination(options || {});
  
  // Build where condition with proper typing
  const whereCondition = {
    ...(userId ? { userId } : {}),
    ...(forRole ? { forRole } : {}),
    ...(isSeen !== undefined ? { isSeen } : {})
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

  // The result matches our INotificationResponse interface
  return {
    meta: {
      page,
      limit,
      total,
      totalPage
    },
    data: notifications as INotification[]
  };
};

// Get notifications for managers with pagination
const getManagerNotifications = async (options?: IPaginationOptions): Promise<INotificationResponse> => {
  // Calculate pagination options
  const { page, limit, skip, sortBy, sortOrder } = calculatePagination(options || {});
  
  // Build where condition for managers with proper typing
  const whereCondition = {
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

  // The result matches our INotificationResponse interface
  return {
    meta: {
      page,
      limit,
      total,
      totalPage
    },
    data: notifications as INotification[]
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

// Delete a notification
const deleteNotification = async (id: string): Promise<INotification> => {
  return prisma.notification.delete({
    where: { id },
  });
};

export const NotificationService = {
  createNotification,
  getNotifications,
  getManagerNotifications,
  markAsSeen,
  markAllAsSeen,
  deleteNotification
};
