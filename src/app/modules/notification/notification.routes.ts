import express from 'express';
import { NotificationController } from './notification.controller';
import auth from '../../middlewares/auth';
import { UserRole } from '@prisma/client';

const router = express.Router();

// Create notification
router.post(
  '/',
  auth(UserRole.super_admin, UserRole.manager, UserRole.user, UserRole.property_manager, UserRole.employee),
  NotificationController.createNotification
);

// Get notifications for a user
router.get(
  '/user',
  auth(UserRole.super_admin, UserRole.manager, UserRole.user, UserRole.property_manager, UserRole.employee),
  NotificationController.getNotifications
);

// Get notifications for managers
router.get(
  '/manager',
  auth(UserRole.super_admin, UserRole.manager),
  NotificationController.getManagerNotifications
);

// Mark a notification as seen
router.patch(
  '/mark-as-seen/:id',
  auth(UserRole.super_admin, UserRole.manager, UserRole.user, UserRole.property_manager, UserRole.employee),
  NotificationController.markAsSeen
);

// Mark all notifications as seen for a user
router.patch(
  '/mark-all-as-seen/:userId',
  auth(UserRole.super_admin, UserRole.manager, UserRole.user, UserRole.property_manager, UserRole.employee),
  NotificationController.markAllAsSeen
);

// Delete a notification
router.delete(
  '/:id',
  auth(UserRole.super_admin, UserRole.manager, UserRole.user, UserRole.property_manager, UserRole.employee),
  NotificationController.deleteNotification
);
export const NotificationRoutes = router;
