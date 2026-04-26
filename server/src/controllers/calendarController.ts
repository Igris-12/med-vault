import { Request, Response } from 'express';
import CalendarTaskModel from '../models/CalendarTask.js';
import ReminderModel from '../models/Reminder.js';
import UserModel from '../models/User.js';

export const getTasks = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user!.uid;
    const tasks = await CalendarTaskModel.find({ userId }).sort({ dateStr: 1 });
    
    // Map _id to id for frontend
    const mapped = tasks.map((t: any) => ({
      id: t._id.toString(),
      title: t.title,
      dateStr: t.dateStr,
      timeStr: t.timeStr,
      fullDateStr: t.fullDateStr,
      colorBg: t.colorBg,
      colorDot: t.colorDot,
      rating: t.rating
    }));
    res.json({ success: true, data: mapped });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to fetch tasks' });
  }
};

export const createTask = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user!.uid;
    const data = req.body;
    
    const task = await CalendarTaskModel.create({
      userId,
      title: data.title,
      dateStr: data.dateStr,
      timeStr: data.timeStr,
      fullDateStr: data.fullDateStr,
      colorBg: data.colorBg,
      colorDot: data.colorDot,
      rating: data.rating
    });

    // Create a Reminder
    const user = await UserModel.findOne({ _id: userId });
    if (user && user.whatsappPhone) {
      let scheduledAt = new Date(`${data.dateStr}T09:00:00Z`); // default to 9am UTC
      try {
        const timeMatch = data.timeStr.match(/(\d+):(\d+)\s*(am|pm)/i);
        if (timeMatch) {
          let h = parseInt(timeMatch[1]);
          const m = parseInt(timeMatch[2]);
          const ampm = timeMatch[3].toLowerCase();
          if (ampm === 'pm' && h < 12) h += 12;
          if (ampm === 'am' && h === 12) h = 0;
          const istHour = h;
          const istMin = m;
          let utcHour = istHour - 5;
          let utcMin = istMin - 30;
          if (utcMin < 0) { utcMin += 60; utcHour -= 1; }
          if (utcHour < 0) { utcHour += 24; }
          
          scheduledAt = new Date(data.dateStr);
          scheduledAt.setUTCHours(utcHour, utcMin, 0, 0);
        }
      } catch (e) {
        console.error("Time parsing failed", e);
      }
      
      const reminder = await ReminderModel.create({
        userId,
        phone: user.whatsappPhone,
        message: `📅 *Calendar Reminder*\n\nHi ${user.name?.split(' ')[0] || 'there'}! This is a reminder for your task:\n\n*${task.title}*\n⏰ Scheduled at: ${data.timeStr}\n\n_— MedVault Health Assistant_`,
        scheduledAt,
        frequency: 'once',
        tag: `calendar:${task._id}`,
        status: 'pending'
      });
      
      task.reminderId = reminder._id.toString();
      await task.save();
    }

    res.json({ success: true, data: { ...data, id: task._id.toString() } });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to create task' });
  }
};

export const updateTask = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user!.uid;
    const { id } = req.params;
    const data = req.body;
    
    const task = await CalendarTaskModel.findOneAndUpdate(
      { _id: id, userId },
      { $set: data },
      { new: true }
    );
    
    if (!task) {
      res.status(404).json({ success: false, error: 'Task not found' });
      return;
    }
    
    // Update reminder if it exists
    if (task.reminderId) {
      const user = await UserModel.findOne({ _id: userId });
      if (user) {
        let scheduledAt = new Date(`${task.dateStr}T09:00:00Z`);
        try {
          const timeMatch = task.timeStr.match(/(\d+):(\d+)\s*(am|pm)/i);
          if (timeMatch) {
            let h = parseInt(timeMatch[1]);
            const m = parseInt(timeMatch[2]);
            const ampm = timeMatch[3].toLowerCase();
            if (ampm === 'pm' && h < 12) h += 12;
            if (ampm === 'am' && h === 12) h = 0;
            const istHour = h;
            const istMin = m;
            let utcHour = istHour - 5;
            let utcMin = istMin - 30;
            if (utcMin < 0) { utcMin += 60; utcHour -= 1; }
            if (utcHour < 0) { utcHour += 24; }
            
            scheduledAt = new Date(task.dateStr);
            scheduledAt.setUTCHours(utcHour, utcMin, 0, 0);
          }
        } catch (e) {}

        await ReminderModel.updateOne(
          { _id: task.reminderId },
          { 
            $set: { 
              message: `📅 *Calendar Reminder (Updated)*\n\nHi ${user.name?.split(' ')[0] || 'there'}! This is a reminder for your task:\n\n*${task.title}*\n⏰ Scheduled at: ${task.timeStr}\n\n_— MedVault Health Assistant_`,
              scheduledAt,
              status: 'pending'
            }
          }
        );
      }
    }
    
    res.json({ success: true, data: { ...data, id: task._id.toString() } });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to update task' });
  }
};

export const deleteTask = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user!.uid;
    const { id } = req.params;
    
    const task = await CalendarTaskModel.findOneAndDelete({ _id: id, userId });
    if (!task) {
      res.status(404).json({ success: false, error: 'Task not found' });
      return;
    }
    
    if (task.reminderId) {
      await ReminderModel.deleteOne({ _id: task.reminderId });
    }
    
    res.json({ success: true, data: true });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to delete task' });
  }
};
