import { Router } from 'express';
import { authMiddleware } from '../middleware/auth.js';
import * as usersController from '../controllers/usersController.js';

const router = Router();

router.post('/sync', authMiddleware, usersController.syncUser);
router.get('/profile', authMiddleware, usersController.getProfile);
router.put('/profile', authMiddleware, usersController.updateProfile);

export default router;
