import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';
import { authMiddleware } from '../middleware/auth.js';
import * as chatController from '../controllers/chatController.js';

const chatMediaDir = path.join(process.cwd(), 'uploads', 'chat');
if (!fs.existsSync(chatMediaDir)) fs.mkdirSync(chatMediaDir, { recursive: true });

const chatStorage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, chatMediaDir),
  filename: (_req, file, cb) => {
    const safe = file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_');
    cb(null, `${uuidv4()}_${safe}`);
  },
});

const chatUpload = multer({
  storage: chatStorage,
  limits: { fileSize: 30 * 1024 * 1024 }, // 30MB
  fileFilter: (_req, file, cb) => {
    const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'audio/mpeg', 'audio/wav', 'audio/ogg', 'audio/mp4', 'audio/webm'];
    if (allowed.includes(file.mimetype)) cb(null, true);
    else cb(new Error(`File type ${file.mimetype} not supported for chat media`));
  },
});

const router = Router();

router.use(authMiddleware);

router.post('/message', chatController.sendMessage);
router.post('/media', chatUpload.single('file'), chatController.uploadChatMedia);
router.get('/sessions', chatController.getSessions);
router.get('/sessions/:sessionId', chatController.getSession);

export default router;
