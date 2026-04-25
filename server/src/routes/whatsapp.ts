import { Router } from 'express';
import express from 'express';
import { authMiddleware } from '../middleware/auth.js';
import {
  handleIncomingWhatsApp,
  getWhatsAppMessages,
  getWhatsAppStatus,
  getWhatsAppStats,
} from '../controllers/whatsappController.js';

const router = Router();

// Twilio webhook — URL-encoded form data
router.post('/webhook', express.urlencoded({ extended: false }), handleIncomingWhatsApp);

// REST endpoints for the WhatsApp Connect page (require Firebase auth)
router.get('/messages', authMiddleware, getWhatsAppMessages);
router.get('/status',   authMiddleware, getWhatsAppStatus);
router.get('/stats',    authMiddleware, getWhatsAppStats);

export default router;
