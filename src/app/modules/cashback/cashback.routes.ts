import express from 'express';
import auth from '../../middlewares/auth';
import { ENUM_USER_ROLE } from '../../../enums/user';
import { CashbackController } from './cashback.controller';

const router = express.Router();

router.get(
  '/',
  auth(ENUM_USER_ROLE.MANAGER, ENUM_USER_ROLE.SUPER_ADMIN),
  CashbackController.getAllCashbacks
);

export const CashbackRoutes = router;
