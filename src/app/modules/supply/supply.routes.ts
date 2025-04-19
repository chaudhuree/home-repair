import { Router } from 'express';
import * as supplyController from './supply.controller';

const router = Router();

// Supply routes
router.post('/', supplyController.createSupply);
router.get('/', supplyController.getAllSupplies);
router.get('/:id', supplyController.getSupplyById);
router.patch('/:id', supplyController.updateSupply);
router.delete('/:id', supplyController.deleteSupply);

// Supply assignment routes
router.post('/assign', supplyController.assignSupply);
router.post('/return', supplyController.returnSupply);
router.get('/assignments/all', supplyController.getAllSupplyAssignments);
router.get('/assignments/user/:userId', supplyController.getSupplyAssignmentsByUser);

export const SupplyRoutes = router;
