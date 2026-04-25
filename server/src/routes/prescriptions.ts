import { Router } from 'express';
import { authMiddleware } from '../middleware/auth.js';
import * as prescriptionsController from '../controllers/prescriptionsController.js';

const router = Router();

router.use(authMiddleware);

router.get('/', prescriptionsController.getPrescriptions);
router.post('/', prescriptionsController.addPrescription);
router.put('/:id', prescriptionsController.updatePrescription);
router.get('/interaction-graph', prescriptionsController.getInteractionGraph);

// ─── Prescription Viewer endpoints ──────────────────────────────────────────
router.get('/extraction/:docId', prescriptionsController.getPrescriptionExtraction);
router.post('/confirm/:docId', prescriptionsController.confirmPrescriptionExtraction);

export default router;

