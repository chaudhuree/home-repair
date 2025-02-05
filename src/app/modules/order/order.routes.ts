import express from 'express';
import { OrderController } from './order.controller';
import validateRequest from '../../middlewares/validateRequest';
import { OrderValidation } from './order.validation';
import auth from '../../middlewares/auth';
import { UserRole } from '@prisma/client';

const router = express.Router();

router.post(
  '/',
  auth(UserRole.user),
  validateRequest(OrderValidation.create),
  OrderController.createOrder
);

router.post(
  '/confirm-payment',
  auth(UserRole.user),
  OrderController.confirmPayment
);

router.post(
  '/process-second-payment',
  auth(UserRole.user),
  OrderController.processSecondPayment
);

router.post(
  '/confirm-second-payment',
  auth(UserRole.user),
  OrderController.confirmSecondPayment
);

router.get(
  '/',
  auth(UserRole.user, UserRole.manager),
  OrderController.getAllOrders
);

router.get(
  '/:id',
  auth(UserRole.user, UserRole.manager),
  OrderController.getSingleOrder
);

export const OrderRoutes = router;
