import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

export const JWT_SECRET = process.env.JWT_SECRET || 'smart-pos-secret-key-2026';

export interface AuthRequest extends Request {
  user?: { id: number; username: string; role: string };
}

export function authenticate(req: AuthRequest, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ error: 'غير مصرح' });
    return;
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { id: number; username: string; role: string };
    req.user = decoded;
    next();
  } catch {
    res.status(401).json({ error: 'غير مصرح' });
  }
}

export function requireRole(...roles: string[]) {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ error: 'غير مصرح' });
      return;
    }
    if (!roles.includes(req.user.role)) {
      res.status(401).json({ error: 'غير مصرح' });
      return;
    }
    next();
  };
}
