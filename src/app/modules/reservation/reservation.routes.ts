import express from 'express';
import { ReservationController } from './reservation.controller';
import validateRequest from '../../middlewares/validateRequest';
import { ReservationValidation } from './reservation.validation';
import auth from '../../middlewares/auth';
import { UserRole } from '@prisma/client';

const router = express.Router();

router.post(
  '/',
  auth(UserRole.user),
  validateRequest(ReservationValidation.create),
  ReservationController.createReservation
);

router.get(
  '/',
  auth(UserRole.user, UserRole.employee, UserRole.manager),
  ReservationController.getAllReservations
);

router.get(
  '/:id',
  auth(UserRole.user, UserRole.employee, UserRole.manager),
  ReservationController.getSingleReservation
);

router.patch(
  '/:id',
  auth(UserRole.manager),
  validateRequest(ReservationValidation.update),
  ReservationController.updateReservation
);

router.delete(
  '/:id',
  auth(UserRole.manager),
  ReservationController.deleteReservation
);

export const ReservationRoutes = router;
