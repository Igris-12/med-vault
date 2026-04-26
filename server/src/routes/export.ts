import { Router } from 'express';
import { authMiddleware } from '../middleware/auth.js';
import { exportData } from '../controllers/exportController.js';

const router = Router();

router.get('/', authMiddleware, exportData);

export default router;
