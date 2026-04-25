import { Router } from 'express';
import express from 'express';
import { handleIncomingWhatsApp } from '../controllers/whatsappController.js';

const router = Router();

// Twilio sends URL-encoded form data — must parse before the controller
router.post('/webhook', express.urlencoded({ extended: false }), handleIncomingWhatsApp);

export default router;
