import { Router } from 'express';
import { authMiddleware } from '../middleware/auth.js';
import * as emergencyController from '../controllers/emergencyController.js';

const router = Router();

// Public route — no auth required
router.get('/public/:token', emergencyController.getPublicEmergencyPage);

// Authenticated routes
router.get('/card', authMiddleware, emergencyController.getEmergencyCard);
router.put('/card', authMiddleware, emergencyController.updateEmergencyCard);
router.get('/qr-image', authMiddleware, emergencyController.getQRImage);

export default router;
