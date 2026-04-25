import { Request, Response, NextFunction } from 'express';

// Extend Express Request type globally
declare global {
  namespace Express {
    interface Request {
      user?: {
        uid: string;
        email?: string;
        name?: string;
        picture?: string;
      };
    }
  }
}

export const authMiddleware = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      res.status(401).json({ success: false, error: 'Missing or invalid Authorization header' });
      return;
    }

    const token = authHeader.split(' ')[1];

    // ── In development/demo mode, accept a special bypass token ──────────────
    if (process.env.NODE_ENV === 'development' && token === 'dev-bypass-token') {
      req.user = {
        uid: 'dev-user-001',
        email: 'priya@example.com',
        name: 'Priya Sharma',
        picture: '',
      };
      next();
      return;
    }

    // ── Production: verify Firebase ID token ──────────────────────────────────
    try {
      const admin = await import('../config/firebase.js');
      const decoded = await admin.default.auth().verifyIdToken(token);
      req.user = {
        uid: decoded.uid,
        email: decoded.email,
        name: decoded.name,
        picture: decoded.picture,
      };
      next();
    } catch {
      res.status(401).json({ success: false, error: 'Invalid or expired token' });
    }
  } catch (error) {
    next(error);
  }
};
