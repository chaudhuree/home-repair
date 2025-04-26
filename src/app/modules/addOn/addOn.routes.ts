import { Router } from 'express';
import * as addOnController from './addOn.controller';

const router = Router();

router.post('/', addOnController.createAddOn);
router.get('/', addOnController.getAllAddOns);
router.get('/service/:serviceId', addOnController.getAddOnsByServiceId);
router.patch('/:id', addOnController.updateAddOn);
router.delete('/:id', addOnController.deleteAddOn);

export const AddOnRoutes = router;
