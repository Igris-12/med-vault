import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';
import { authMiddleware } from '../middleware/auth.js';
import * as uploadController from '../controllers/uploadController.js';
import DocumentModel from '../models/Document.js';

const uploadDir = path.join(process.cwd(), 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadDir),
  filename: (_req, file, cb) => {
    const safe = file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_');
    cb(null, `${uuidv4()}_${safe}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 20 * 1024 * 1024 }, // 20MB
  fileFilter: (_req, file, cb) => {
    const allowed = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp'];
    if (allowed.includes(file.mimetype)) cb(null, true);
    else cb(new Error(`File type ${file.mimetype} not supported`));
  },
});

const router = Router();

router.post('/', authMiddleware, upload.array('files', 10), uploadController.handleUpload);
router.get('/status/:docId', authMiddleware, uploadController.getStatus);

// ─── Authenticated image serving ─────────────────────────────────────────────
// Allows the PrescriptionViewer to load prescription images securely (no public URL).
router.get('/file/:docId', authMiddleware, async (req: any, res: any) => {
  try {
    const doc = await DocumentModel.findOne(
      { _id: req.params.docId, userId: req.user!.uid },
      { filePath: 1, mimeType: 1 }
    );
    if (!doc) {
      return res.status(404).json({ success: false, error: 'File not found' });
    }
    const abs = path.resolve(doc.filePath);
    if (!fs.existsSync(abs)) {
      return res.status(404).json({ success: false, error: 'File missing on disk' });
    }
    res.setHeader('Content-Type', doc.mimeType);
    res.setHeader('Cache-Control', 'private, max-age=3600');
    return fs.createReadStream(abs).pipe(res);
  } catch (err) {
    return res.status(500).json({ success: false, error: 'Failed to serve file' });
  }
});

export default router;
