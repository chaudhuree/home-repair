import { Router } from 'express';
import * as supplyTransactionController from './supplyTransaction.controller';
import auth from '../../middlewares/auth';
import { UserRole } from '@prisma/client';

const router = Router();

// Supply transaction routes
router.get(
  '/',
  auth(UserRole.super_admin, UserRole.manager, UserRole.property_manager),
  supplyTransactionController.getAllSupplyTransactions
);

// Get transactions by employee ID
router.get(
  '/employee/:employeeId',
  supplyTransactionController.getSupplyTransactionsByEmployee
);

// Get employee supply transaction statistics
router.get(
  '/employee/:employeeId/stats',
  supplyTransactionController.getEmployeeSupplyTransactionStats
);

// Get transactions by supply ID
router.get(
  '/supply/:supplyId',
  auth(UserRole.super_admin, UserRole.manager, UserRole.property_manager),
  supplyTransactionController.getSupplyTransactionsBySupply
);

export const SupplyTransactionRoutes = router;
