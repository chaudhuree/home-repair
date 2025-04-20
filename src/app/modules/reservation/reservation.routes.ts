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

router.post(
  '/with-payment',
  auth(ENUM_USER_ROLE.USER, ENUM_USER_ROLE.PROPERTY_MANAGER),
  validateRequest(ReservationValidation.createWithPayment),
  ReservationController.createReservationWithPayment
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

// Admin API routes

// Get all reservations without assigned employees
router.get(
  '/admin/unassigned',
  auth(ENUM_USER_ROLE.MANAGER, ENUM_USER_ROLE.SUPER_ADMIN),
  ReservationController.getUnassignedReservations
);

// Get all ongoing jobs
router.get(
  '/admin/ongoing',
  auth(ENUM_USER_ROLE.MANAGER, ENUM_USER_ROLE.SUPER_ADMIN),
  ReservationController.getOngoingJobs
);

// Get all upcoming jobs
router.get(
  '/admin/upcoming',
  auth(ENUM_USER_ROLE.MANAGER, ENUM_USER_ROLE.SUPER_ADMIN),
  ReservationController.getUpcomingJobs
);

// Get all jobs assigned to a specific employee
router.get(
  '/admin/employee/:employeeId/jobs',
  auth(ENUM_USER_ROLE.MANAGER, ENUM_USER_ROLE.SUPER_ADMIN),
  ReservationController.getEmployeeJobs
);

// Get transaction history
router.get(
  '/admin/transactions',
  auth(ENUM_USER_ROLE.MANAGER, ENUM_USER_ROLE.SUPER_ADMIN),
  ReservationController.getTransactionHistory
);

// Get all cashbacks with pagination and status filtering
router.get(
  '/admin/cashbacks',
  auth(ENUM_USER_ROLE.MANAGER, ENUM_USER_ROLE.SUPER_ADMIN),
  ReservationController.getAllCashbacks
);

// Schedule a reservation date
router.patch(
  '/:id/schedule',
  auth(ENUM_USER_ROLE.MANAGER, ENUM_USER_ROLE.SUPER_ADMIN, ENUM_USER_ROLE.EMPLOYEE),
  validateRequest(ReservationValidation.scheduleReservationZodSchema),
  ReservationController.scheduleReservation
);

export const ReservationRoutes = router;
