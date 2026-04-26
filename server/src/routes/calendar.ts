import { Router } from 'express';
import { authMiddleware } from '../middleware/auth.js';
import * as calendarController from '../controllers/calendarController.js';

const router = Router();

router.use(authMiddleware);

router.get('/', calendarController.getTasks);
router.post('/', calendarController.createTask);
router.put('/:id', calendarController.updateTask);
router.delete('/:id', calendarController.deleteTask);

export default router;
