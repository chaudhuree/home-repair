import express from 'express';
import { ServiceController } from './service.controller';
import validateRequest from '../../middlewares/validateRequest';
import { ServiceValidation } from './service.validation';
import auth from '../../middlewares/auth';
import { UserRole } from '@prisma/client';

const router = express.Router();

router.post(
  '/',
  auth(UserRole.manager),
  validateRequest(ServiceValidation.create),
  ServiceController.createService
);

router.get('/', ServiceController.getAllServices);
router.get('/:id', ServiceController.getSingleService);

router.patch(
  '/:id',
  auth(UserRole.manager),
  validateRequest(ServiceValidation.update),
  ServiceController.updateService
);

router.delete(
  '/:id',
  auth(UserRole.manager),
  ServiceController.deleteService
);

export const ServiceRoutes = router;
