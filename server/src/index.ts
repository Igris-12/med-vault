import express from 'express';
import http from 'http';
import cors from 'cors';
import morgan from 'morgan';
import dotenv from 'dotenv';
import path from 'path';
import { Server as SocketIOServer } from 'socket.io';

import { connectDB } from './config/db.js';
import { errorHandler } from './middleware/errorHandler.js';

// Routes
import uploadRoutes from './routes/upload.js';
import recordsRoutes from './routes/records.js';
import prescriptionsRoutes from './routes/prescriptions.js';
import chatRoutes from './routes/chat.js';
import emergencyRoutes from './routes/emergency.js';
import usersRoutes from './routes/users.js';
import whatsappRoutes from './routes/whatsapp.js';

dotenv.config();

const app = express();
const server = http.createServer(app);

// ─── Socket.io ───────────────────────────────────────────────────────────────
export const io = new SocketIOServer(server, {
  cors: {
    origin: process.env.CLIENT_URL || 'http://localhost:5173',
    methods: ['GET', 'POST'],
    credentials: true,
  },
});

io.on('connection', (socket: any) => {
  const userId = socket.handshake.auth?.userId as string;
  if (userId) {
    socket.join(userId);
    console.log(`🔌 Socket connected: user=${userId}`);
  }
  socket.on('disconnect', () => {
    console.log(`🔌 Socket disconnected: user=${userId}`);
  });
});

// ─── Middleware ───────────────────────────────────────────────────────────────
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:5173',
  credentials: true,
}));
app.use(express.json({ limit: '5mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(morgan('dev'));

// Serve uploaded files
app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));

// ─── Health Check ─────────────────────────────────────────────────────────────
app.get('/api/health', async (_req, res) => {
  const { default: mongoose } = await import('mongoose');
  res.json({
    success: true,
    data: {
      status: 'ok',
      dbConnected: mongoose.connection.readyState === 1,
      timestamp: new Date().toISOString(),
      env: process.env.NODE_ENV || 'development',
    },
  });
});

// ─── Routes ───────────────────────────────────────────────────────────────────
app.use('/api/upload', uploadRoutes);
app.use('/api/records', recordsRoutes);
app.use('/api/prescriptions', prescriptionsRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/emergency', emergencyRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/whatsapp', whatsappRoutes);

// ─── 404 ──────────────────────────────────────────────────────────────────────
app.use((_req, res) => {
  res.status(404).json({ success: false, error: 'Route not found' });
});

// ─── Error Handler ────────────────────────────────────────────────────────────
app.use(errorHandler);

// ─── Start ────────────────────────────────────────────────────────────────────
const PORT = parseInt(process.env.PORT || '3001', 10);

const start = async () => {
  try {
    await connectDB();
  } catch (err) {
    console.warn('\n⚠️  MongoDB unavailable — starting server without DB (mock/frontend mode)\n', err instanceof Error ? err.message : err);
  }
  server.listen(PORT, () => {
    console.log(`\n🚀 MedVault server running on http://localhost:${PORT}`);
    console.log(`📡 Health check: http://localhost:${PORT}/api/health\n`);
  });
};

start().catch(console.error);
