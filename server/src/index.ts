import express from 'express';
import http from 'http';
import cors from 'cors';
import morgan from 'morgan';
import dotenv from 'dotenv';
import path from 'path';
import { execSync } from 'child_process';
import { Server as SocketIOServer } from 'socket.io';

import { connectDB } from './config/db.js';
import { errorHandler } from './middleware/errorHandler.js';
import { isAiServerHealthy } from './services/aiClient.js';

// Routes
import uploadRoutes from './routes/upload.js';
import recordsRoutes from './routes/records.js';
import prescriptionsRoutes from './routes/prescriptions.js';
import chatRoutes from './routes/chat.js';
import emergencyRoutes from './routes/emergency.js';
import usersRoutes from './routes/users.js';
import whatsappRoutes from './routes/whatsapp.js';
import supportRoutes from './routes/support.js';
import dietRoutes from './routes/diet.js';
import { startAllCronJobs } from './services/reminderCronService.js';
import aiGraphRoutes from './routes/aiGraph.js';
import doctorRoutes from './routes/doctor.js';

dotenv.config();

const app = express();
const server = http.createServer(app);

// ─── Socket.io ───────────────────────────────────────────────────────────────
// Accept any localhost port in dev, or the explicit CLIENT_URL in prod
const corsOrigin = (origin: string | undefined, cb: (err: Error | null, ok?: boolean) => void) => {
  if (!origin || origin.startsWith('http://localhost') || origin === process.env.CLIENT_URL) {
    cb(null, true);
  } else {
    cb(new Error(`CORS blocked: ${origin}`));
  }
};

export const io = new SocketIOServer(server, {
  cors: {
    origin: true, // Allow any origin for local dev ports
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
  origin: true, // Allow any origin for local dev ports
  credentials: true,
}));
app.use(express.json({ limit: '5mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(morgan('dev'));

// Serve uploaded files
app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));
app.use('/uploads/chat', express.static(path.join(process.cwd(), 'uploads', 'chat')));

// ─── Health Check ─────────────────────────────────────────────────────────────
app.get('/api/health', async (_req, res) => {
  const { default: mongoose } = await import('mongoose');
  const aiProxyHealthy = await isAiServerHealthy();
  res.json({
    success: true,
    data: {
      status: 'ok',
      dbConnected: mongoose.connection.readyState === 1,
      aiProxyConnected: aiProxyHealthy,
      aiProxyUrl: process.env.AI_SERVER_URL || 'http://localhost:5000',
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
app.use('/api/support', supportRoutes);
app.use('/api/diet', dietRoutes);
app.use('/api/ai/graph', aiGraphRoutes);
app.use('/api/doctor', doctorRoutes);

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

  // Check if ai/server.py Playwright proxy is reachable
  const aiUrl = process.env.AI_SERVER_URL || 'http://localhost:5000';
  const aiOk = await isAiServerHealthy();
  if (aiOk) {
    console.log(`🤖 AI proxy connected at ${aiUrl}`);
  } else {
    console.warn(`⚠️  AI proxy NOT reachable at ${aiUrl} — start ai/server.py first.`);
    console.warn(`   Generation calls (chat, upload extraction, etc.) will fail until it starts.`);
  }

  const listen = (retry = false) => {
    server.listen(PORT, () => {
      console.log(`\n🚀 MedVault server running on http://localhost:${PORT}`);
      console.log(`📡 Health check: http://localhost:${PORT}/api/health\n`);
      // Start scheduled WhatsApp reminders
      startAllCronJobs();
    });

    server.once('error', (err: NodeJS.ErrnoException) => {
      if (err.code === 'EADDRINUSE' && !retry) {
        console.warn(`\n⚠️  Port ${PORT} in use — killing the blocking process…`);
        try {
          const isWin = process.platform === 'win32';
          if (isWin) {
            const out = execSync(`netstat -ano | findstr :${PORT} | findstr LISTENING`, { encoding: 'utf-8' });
            const pids = [...new Set(out.trim().split('\n').map(l => l.trim().split(/\s+/).pop()!).filter(Boolean))];
            for (const pid of pids) {
              console.log(`   Killing PID ${pid}…`);
              try { execSync(`taskkill /F /PID ${pid}`, { encoding: 'utf-8' }); } catch {}
            }
          } else {
            try { execSync(`lsof -ti :${PORT} | xargs kill -9`, { encoding: 'utf-8' }); } catch {}
          }
          console.log(`   Waiting 1s then retrying…\n`);
          setTimeout(() => listen(true), 1000);
        } catch (killErr) {
          console.error('   Could not auto-kill. Please run manually:\n');
          console.error(`   Windows:  netstat -ano | findstr :${PORT}  →  taskkill /F /PID <pid>`);
          console.error(`   Mac/Linux: lsof -ti :${PORT} | xargs kill -9\n`);
          process.exit(1);
        }
      } else {
        throw err;
      }
    });
  };

  listen();
};

start().catch(console.error);
