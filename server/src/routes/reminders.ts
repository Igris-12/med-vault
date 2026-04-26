import { Router } from 'express';
import { authMiddleware } from '../middleware/auth.js';
import ReminderModel from '../models/Reminder.js';

const router = Router();

// GET /api/reminders — list the authed user's reminders
router.get('/', authMiddleware, async (req, res) => {
  try {
    const { status, limit = '50' } = req.query as { status?: string; limit?: string };
    const query: Record<string, any> = { userId: req.user!.uid };
    if (status && status !== 'all') query.status = status;

    const reminders = await ReminderModel.find(query)
      .sort({ scheduledAt: -1 })
      .limit(parseInt(limit))
      .lean();

    // Map to ActivityItem shape for the frontend
    const items = reminders.map(r => ({
      id:         r._id.toString(),
      reminderId: r._id.toString(),
      message:    r.message,
      phone:      r.phone,
      status:     r.status === 'sent' ? 'delivered' : r.status,
      timestamp:  (r.sentAt || r.scheduledAt).toISOString(),
      scheduledAt: r.scheduledAt.toISOString(),
      frequency:  r.frequency,
      tag:        r.tag,
      createdAt:  r.createdAt.toISOString(),
    }));

    // Aggregate stats
    const all = await ReminderModel.find({ userId: req.user!.uid }).lean();
    const now = new Date();
    const todayStart = new Date(now); todayStart.setHours(0,0,0,0);
    const stats = {
      total:      all.length,
      sent:       all.filter(r => r.status === 'sent').length,
      pending:    all.filter(r => r.status === 'pending' && r.scheduledAt > now).length,
      failed:     all.filter(r => r.status === 'failed').length,
      sentToday:  all.filter(r => r.status === 'sent' && r.sentAt && r.sentAt >= todayStart).length,
    };

    // Wrap BOTH in data so apiFetch's json.data unwrap returns { items, stats }
    res.json({ success: true, data: { items, stats } });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// DELETE /api/reminders/:id — cancel a pending reminder
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    const rem = await ReminderModel.findOne({ _id: req.params.id, userId: req.user!.uid });
    if (!rem) { res.status(404).json({ success: false, error: 'Reminder not found' }); return; }
    if (rem.status !== 'pending') { res.status(400).json({ success: false, error: 'Only pending reminders can be cancelled' }); return; }
    rem.status = 'failed';
    await rem.save();
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
