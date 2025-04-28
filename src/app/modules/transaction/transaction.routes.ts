import express from 'express';
import auth from '../../middlewares/auth';
import { ENUM_USER_ROLE } from '../../../enums/user';
import { TransactionController } from './transaction.controller';

const router = express.Router();

// Create a transaction (manager and super_admin only)
router.post(
  '/',
  auth(ENUM_USER_ROLE.MANAGER, ENUM_USER_ROLE.SUPER_ADMIN),
  TransactionController.createTransaction
);

// Create an expense transaction (manager and super_admin only)
router.post(
  '/expense',
  auth(ENUM_USER_ROLE.MANAGER, ENUM_USER_ROLE.SUPER_ADMIN),
  TransactionController.createExpenseTransaction
);

// Get all transactions (filtered by user role)
router.get(
  '/',
  auth(
    ENUM_USER_ROLE.SUPER_ADMIN,
    ENUM_USER_ROLE.MANAGER,
    ENUM_USER_ROLE.EMPLOYEE,
    ENUM_USER_ROLE.USER,
    ENUM_USER_ROLE.PROPERTY_MANAGER
  ),
  TransactionController.getAllTransactions
);

// Get employee completed transactions
router.get(
  '/employee-completed',
  auth(ENUM_USER_ROLE.EMPLOYEE),
  TransactionController.getEmployeeCompletedTransactions
);

// Get a single transaction by ID
router.get(
  '/:id',
  auth(
    ENUM_USER_ROLE.SUPER_ADMIN,
    ENUM_USER_ROLE.MANAGER,
    ENUM_USER_ROLE.EMPLOYEE,
    ENUM_USER_ROLE.USER,
    ENUM_USER_ROLE.PROPERTY_MANAGER
  ),
  TransactionController.getSingleTransaction
);

export const TransactionRoutes = router;
