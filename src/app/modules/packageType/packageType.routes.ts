import { Router } from 'express';
import * as packageTypeController from './packageType.controller';


const router = Router();

router.post('/', packageTypeController.createPackageType);
router.get('/', packageTypeController.getAllPackageTypes);
router.patch('/:id', packageTypeController.updatePackageType);
router.delete('/:id', packageTypeController.deletePackageType);

export const PackageTypeRoutes = router;

