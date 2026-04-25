import { Router } from 'express';
import { authMiddleware } from '../middleware/auth.js';
import { getSupportSession, postSupportMessage } from '../controllers/supportController.js';

const router = Router();

// Support chatbot widget sessions (auth optional — works for logged-in users)
router.get('/session/:sessionId',          authMiddleware, getSupportSession);
router.post('/session/:sessionId/message', authMiddleware, postSupportMessage);

export default router;
