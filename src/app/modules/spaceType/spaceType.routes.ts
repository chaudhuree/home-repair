import { Router } from 'express';
import * as spaceTypeController from './spaceType.controller';

const router = Router();

router.post('/', spaceTypeController.createSpaceType);
router.get('/', spaceTypeController.getAllSpaceTypes);
router.patch('/:id', spaceTypeController.updateSpaceType);
router.delete('/:id', spaceTypeController.deleteSpaceType);

export const SpaceTypeRoutes = router;
