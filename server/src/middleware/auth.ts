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

const IS_DEV = process.env.NODE_ENV === 'development';

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

    // ── Explicit dev-bypass token ──────────────────────────────────────────────
    if (IS_DEV && token === 'dev-bypass-token') {
      req.user = {
        uid: 'dev-user-001',
        email: 'priya@example.com',
        name: 'Priya Sharma',
        picture: '',
      };
      next();
      return;
    }

    // ── Try Firebase token verification ───────────────────────────────────────
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
      return;
    } catch (firebaseErr) {
      // In development, if Firebase Admin can't verify the token
      // (e.g. wrong project ID, placeholder private key, emulator mismatch),
      // extract the UID from the JWT payload directly and allow the request.
      // This lets the real Firebase client SDK work in dev without a full Admin setup.
      if (IS_DEV) {
        try {
          const payload = JSON.parse(
            Buffer.from(token.split('.')[1], 'base64url').toString('utf8')
          );
          if (payload?.sub) {
            console.warn(
              `⚠️  [auth] Firebase Admin verification failed in dev — ` +
              `using JWT payload directly (uid=${payload.sub}). ` +
              `Set up FIREBASE_PRIVATE_KEY for full verification.`
            );
            req.user = {
              uid: payload.sub,
              email: payload.email,
              name: payload.name,
              picture: payload.picture,
            };
            next();
            return;
          }
        } catch {
          // JWT decode also failed — fall through to 401
        }
      }

      res.status(401).json({ success: false, error: 'Invalid or expired token' });
    }
  } catch (error) {
    next(error);
  }
};
