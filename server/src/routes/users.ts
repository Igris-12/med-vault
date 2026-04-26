import { Router } from 'express';
import { authMiddleware } from '../middleware/auth.js';
import * as usersController from '../controllers/usersController.js';

const router = Router();

router.post('/sync', authMiddleware, usersController.syncUser);
router.get('/profile', authMiddleware, usersController.getProfile);
router.put('/profile', authMiddleware, usersController.updateProfile);
router.post('/link-whatsapp', authMiddleware, usersController.linkWhatsApp);
router.post('/regenerate-token', authMiddleware, usersController.regenerateEmergencyToken);
router.post('/test-reminder', authMiddleware, usersController.sendTestReminder);
router.post('/schedule-reminder', authMiddleware, usersController.scheduleReminder);

export default router;


