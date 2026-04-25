import { Router } from 'express';
import { authMiddleware } from '../middleware/auth.js';
import * as chatController from '../controllers/chatController.js';

const router = Router();

router.use(authMiddleware);

router.post('/message', chatController.sendMessage);
router.get('/sessions', chatController.getSessions);
router.get('/sessions/:sessionId', chatController.getSession);

export default router;
