import { Router } from 'express';
import multer from 'multer';
import { authMiddleware } from '../middleware/auth.js';
import { analyzeDiet } from '../controllers/dietController.js';

const router = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

// POST /api/diet/analyze — upload meal photo + optional context → AI scraper analysis
router.post('/analyze', authMiddleware, upload.single('image'), analyzeDiet);

export default router;
