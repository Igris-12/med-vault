import express from 'express';
import fs from 'fs';
import path from 'path';
import { authMiddleware } from '../middleware/auth.js';
import DocumentModel from '../models/Document.js';
import PrescriptionModel from '../models/Prescription.js';

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

// Build a patient-specific medical graph from real DB data
router.get('/patient/:id', authMiddleware, async (req, res) => {
    try {
        const userId = req.params.id === 'me' ? req.user!.uid : req.params.id;
        const [docs, rxs] = await Promise.all([
            DocumentModel.find({ userId, status: 'done' }).select('conditionsMentioned medications labValues documentType filename').lean(),
            PrescriptionModel.find({ userId, status: 'active' }).lean(),
        ]);

        const nodes: any[] = [];
        const links: any[] = [];
        const seen = new Set<string>();

        const addNode = (id: string, label: string, group: string, val = 3) => {
            if (seen.has(id)) return;
            seen.add(id);
            nodes.push({ id, label, group, val });
        };

        // Central patient node
        addNode('patient', 'Patient', 'patient', 8);

        // Conditions
        const allConditions = docs.flatMap(d => d.conditionsMentioned || []);
        for (const c of [...new Set(allConditions)]) {
            const cId = `cond-${c}`;
            addNode(cId, c, 'condition', 5);
            links.push({ source: 'patient', target: cId, label: 'has condition' });
        }

        // Medications from prescriptions
        for (const rx of rxs) {
            const mId = `med-${rx.drugName}`;
            addNode(mId, `${rx.drugName} ${rx.dosage}`, 'medication', 4);
            links.push({ source: 'patient', target: mId, label: 'takes' });
        }

        // Lab values from documents
        for (const doc of docs) {
            for (const lv of (doc.labValues || [])) {
                const lvId = `lab-${lv.test_name}`;
                addNode(lvId, `${lv.test_name}: ${lv.value} ${lv.unit}`, lv.is_abnormal ? 'abnormal' : 'lab', lv.is_abnormal ? 5 : 3);
                links.push({ source: 'patient', target: lvId, label: lv.is_abnormal ? '⚠️ abnormal' : 'normal' });

                // Link abnormal labs to conditions
                if (lv.is_abnormal) {
                    for (const c of (doc.conditionsMentioned || [])) {
                        const cId = `cond-${c}`;
                        if (seen.has(cId)) {
                            links.push({ source: cId, target: lvId, label: 'indicated by' });
                        }
                    }
                }
            }

            // Link medications from doc to conditions
            for (const m of (doc.medications || [])) {
                const mName = typeof m === 'string' ? m : m.name;
                const mId = `med-${mName}`;
                if (seen.has(mId)) {
                    for (const c of (doc.conditionsMentioned || [])) {
                        const cId = `cond-${c}`;
                        if (seen.has(cId)) {
                            links.push({ source: mId, target: cId, label: 'treats' });
                        }
                    }
                }
            }
        }

        res.json({ success: true, data: { nodes, links } });
    } catch (e: any) {
        res.status(500).json({ success: false, error: e.message });
    }
});

export default router;

