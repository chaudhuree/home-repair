import express from 'express';
import auth from '../../middlewares/auth';
import { ENUM_USER_ROLE } from '../../../enums/user';
import { CashbackController } from './cashback.controller';

const router = express.Router();

// Get all cashbacks - Admin/Manager only
router.get(
  '/',
  auth(ENUM_USER_ROLE.MANAGER, ENUM_USER_ROLE.SUPER_ADMIN),
  CashbackController.getAllCashbacks
);

// Get a single cashback by ID - Admin/Manager/User
router.get(
  '/:id',
  auth(
    ENUM_USER_ROLE.SUPER_ADMIN,
    ENUM_USER_ROLE.MANAGER,
    ENUM_USER_ROLE.USER,
    ENUM_USER_ROLE.PROPERTY_MANAGER
  ),
  CashbackController.getSingleCashback
);

// Create a new cashback request - User only
router.post(
  '/',
  auth(ENUM_USER_ROLE.USER, ENUM_USER_ROLE.PROPERTY_MANAGER),
  CashbackController.createCashback
);

// Approve a cashback request - Admin/Manager only
router.patch(
  '/approve/:id',
  auth(ENUM_USER_ROLE.MANAGER, ENUM_USER_ROLE.SUPER_ADMIN),
  CashbackController.approveCashback
);

// Reject a cashback request - Admin/Manager only
router.patch(
  '/reject/:id',
  auth(ENUM_USER_ROLE.MANAGER, ENUM_USER_ROLE.SUPER_ADMIN),
  CashbackController.rejectCashback
);

export const CashbackRoutes = router;
