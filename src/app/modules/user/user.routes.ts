import express from 'express';
import { UserControllers } from './user.controller';
import auth from '../../middlewares/auth';
import { ENUM_USER_ROLE } from '../../../enums/user';
import validateRequest from '../../middlewares/validateRequest';
import { UserValidations } from './user.validation';

const router = express.Router();

router.post(
  '/register',
  validateRequest(UserValidations.registerUser),
  UserControllers.registerUser
);

router.get('/my-profile', auth(), UserControllers.getMyProfile);

// Get all employees route should be before the :id route
// router.get(
//   '/employees',
//   auth(ENUM_USER_ROLE.SUPER_ADMIN, ENUM_USER_ROLE.MANAGER),
//   UserControllers.getAllEmployees
// );
router.get(
  '/employees',
  UserControllers.getAllEmployees
);

router.get(
  '/:id',
  auth(ENUM_USER_ROLE.MANAGER),
  UserControllers.getUserDetails
);

router.get(
  '/',
  auth(ENUM_USER_ROLE.MANAGER),
  UserControllers.getAllUsers
);

router.patch(
  '/my-profile',
  auth(),
  validateRequest(UserValidations.updateProfileSchema),
  UserControllers.updateMyProfile
);

router.patch(
  '/:id/role',
  auth(ENUM_USER_ROLE.MANAGER),
  UserControllers.updateUserStatus
);

router.post(
  '/change-password',
  auth(),
  validateRequest(UserValidations.changePassword),
  UserControllers.changePassword
);

export const UserRoutes = router;
