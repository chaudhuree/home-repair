import { UserRole } from '@prisma/client';
import { IPaginationOptions } from '../../interface/pagination';

export type INotification = {
  id: string;
  userId?: string;
  fromUserId?: string | null;
  content: string;
  forRole?: UserRole | null;
  isSeen: boolean;
  createdAt: Date;
  updatedAt: Date;
};

export type ICreateNotification = {
  userId?: string;
  fromUserId?: string;
  content: string;
  forRole?: UserRole;
};

export type IMarkAsSeen = {
  id: string;
};

export type IMarkAllAsSeen = {
  userId: string;
};

export type INotificationFilters = {
  forRole?: UserRole;
  userId?: string;
  isSeen?: boolean;
  options?: IPaginationOptions;
};

export type INotificationResponse = {
  data: INotification[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPage?: number;
  };
};
