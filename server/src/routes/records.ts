import { Router } from 'express';
import { authMiddleware } from '../middleware/auth.js';
import * as recordsController from '../controllers/recordsController.js';

const router = Router();

router.use(authMiddleware);

router.get('/timeline', recordsController.getTimeline);
router.get('/dashboard-summary', recordsController.getDashboardSummary);
router.get('/anomalies', recordsController.getAnomalies);
router.get('/documents', recordsController.getDocuments);
router.get('/documents/:id', recordsController.getDocumentById);

export default router;
