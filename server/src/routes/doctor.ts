import express from 'express';
import { authMiddleware } from '../middleware/auth.js';
import {
  listPatients,
  getPatientProfile,
  nlSearch,
  generateAiSummary,
  getDoctorStats,
  exportPatientData,
  getPatientRecords,
} from '../controllers/doctorController.js';

const router = express.Router();

router.use(authMiddleware);

router.get('/stats', getDoctorStats);
router.get('/patients', listPatients);
router.get('/patients/:id', getPatientProfile);
router.get('/patients/:id/records', getPatientRecords);
router.get('/patients/:id/export', exportPatientData);
router.post('/patients/:id/nl-search', nlSearch);
router.post('/patients/:id/ai-summary', generateAiSummary);

export default router;
