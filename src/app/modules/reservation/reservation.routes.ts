import express from 'express';
import { ReservationController } from './reservation.controller';
import auth from '../../middlewares/auth';
import { ENUM_USER_ROLE } from '../../../enums/user';
import validateRequest from '../../middlewares/validateRequest';
import { ReservationValidation } from './reservation.validation';

const router = express.Router();

router.post(
  '/',
  auth(ENUM_USER_ROLE.USER, ENUM_USER_ROLE.PROPERTY_MANAGER),
  validateRequest(ReservationValidation.create),
  ReservationController.createReservation
);

router.get(
  '/',
  auth(
    ENUM_USER_ROLE.USER,
    ENUM_USER_ROLE.EMPLOYEE,
    ENUM_USER_ROLE.MANAGER,
    ENUM_USER_ROLE.SUPER_ADMIN,
    ENUM_USER_ROLE.PROPERTY_MANAGER
  ),
  ReservationController.getAllReservations
);

router.get(
  '/:id', 
  auth(
    ENUM_USER_ROLE.USER, 
    ENUM_USER_ROLE.EMPLOYEE, 
    ENUM_USER_ROLE.MANAGER,
    ENUM_USER_ROLE.PROPERTY_MANAGER
  ), 
  ReservationController.getSingleReservation
);

router.patch(
  '/:id',
  auth(ENUM_USER_ROLE.MANAGER, ENUM_USER_ROLE.EMPLOYEE),
  validateRequest(ReservationValidation.update),
  ReservationController.updateReservation
);

router.patch(
  '/:id/first-installment',
  auth(ENUM_USER_ROLE.USER, ENUM_USER_ROLE.PROPERTY_MANAGER),
  validateRequest(ReservationValidation.processFirstInstallment),
  ReservationController.processFirstInstallment
);

router.patch(
  '/:id/second-installment',
  auth(ENUM_USER_ROLE.USER, ENUM_USER_ROLE.PROPERTY_MANAGER),
  validateRequest(ReservationValidation.processSecondInstallment),
  ReservationController.processSecondInstallment
);

router.post(
  '/:id/cashback',
  auth(ENUM_USER_ROLE.USER, ENUM_USER_ROLE.PROPERTY_MANAGER),
  validateRequest(ReservationValidation.processCashback),
  ReservationController.processCashback
);

router.patch(
  '/:id/cashback/:cashbackId/approve',
  auth(ENUM_USER_ROLE.MANAGER, ENUM_USER_ROLE.SUPER_ADMIN),
  ReservationController.approveCashback
);

// Assign employee route (manager only)
router.patch(
  '/:id/assign-employee',
  auth(ENUM_USER_ROLE.MANAGER),
  validateRequest(ReservationValidation.assignEmployee),
  ReservationController.assignEmployee
);

// Add add-on to reservation
router.post(
  '/:id/add-ons',
  auth(ENUM_USER_ROLE.USER, ENUM_USER_ROLE.PROPERTY_MANAGER),
  validateRequest(ReservationValidation.addReservationAddOn),
  ReservationController.addReservationAddOn
);

// Remove add-on from reservation
router.delete(
  '/:id/add-ons',
  auth(ENUM_USER_ROLE.USER, ENUM_USER_ROLE.PROPERTY_MANAGER),
  validateRequest(ReservationValidation.removeReservationAddOn),
  ReservationController.removeReservationAddOn
);

router.delete(
  '/:id',
  auth(ENUM_USER_ROLE.MANAGER),
  ReservationController.deleteReservation
);

export const ReservationRoutes = router;
