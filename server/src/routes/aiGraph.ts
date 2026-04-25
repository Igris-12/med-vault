import express from 'express';
import fs from 'fs';
import path from 'path';

const router = express.Router();

// Serve raw knowledge base for client-side graph building
router.get('/kb', (_req, res) => {
    try {
        const kbPath = path.join(process.cwd(), 'src', 'knowledge', 'clinicalKnowledgeBase.json');
        if (!fs.existsSync(kbPath)) return res.status(404).json({ success: false, error: 'KB not found' });
        const data = JSON.parse(fs.readFileSync(kbPath, 'utf8'));
        res.json({ success: true, data });
    } catch (e: any) {
        res.status(500).json({ success: false, error: e.message });
    }
});

export default router;
