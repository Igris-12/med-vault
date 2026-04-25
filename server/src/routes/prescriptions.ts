import { Router } from 'express';
import { authMiddleware } from '../middleware/auth.js';
import * as prescriptionsController from '../controllers/prescriptionsController.js';

const router = Router();

router.use(authMiddleware);

router.get('/', prescriptionsController.getPrescriptions);
router.post('/', prescriptionsController.addPrescription);
router.put('/:id', prescriptionsController.updatePrescription);
router.get('/interaction-graph', prescriptionsController.getInteractionGraph);

export default router;
