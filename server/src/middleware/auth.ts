import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import prisma from '../lib/prisma';

if (!process.env.JWT_SECRET) {
  throw new Error('JWT_SECRET environment variable is required. Set it before starting the server.');
}
const JWT_SECRET = process.env.JWT_SECRET;

export interface AuthRequest extends Request {
  userId?: string;
  userRole?: string;
}

export function generateToken(userId: string): string {
  return jwt.sign({ userId }, JWT_SECRET, { expiresIn: '30d' });
}

export async function requireAuth(req: AuthRequest, res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  try {
    const token = header.slice(7);
    const decoded = jwt.verify(token, JWT_SECRET) as { userId: string };
    const user = await prisma.rallyUser.findUnique({ where: { id: decoded.userId } });
    if (!user) {
      return res.status(401).json({ error: 'User not found' });
    }
    req.userId = user.id;
    req.userRole = user.role.toLowerCase();
    next();
  } catch {
    return res.status(401).json({ error: 'Invalid token' });
  }
}

export async function requireAdmin(req: AuthRequest, res: Response, next: NextFunction) {
  if (!req.userRole || !['admin', 'developer'].includes(req.userRole)) {
    return res.status(403).json({ error: 'Admin access required' });
  }
  next();
}

export async function requireDeveloper(req: AuthRequest, res: Response, next: NextFunction) {
  if (req.userRole !== 'developer') {
    return res.status(403).json({ error: 'Developer access required' });
  }
  next();
}

export async function optionalAuth(req: AuthRequest, _res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (header && header.startsWith('Bearer ')) {
    try {
      const token = header.slice(7);
      const decoded = jwt.verify(token, JWT_SECRET) as { userId: string };
      req.userId = decoded.userId;
    } catch {
      // Ignore invalid tokens for optional auth
    }
  }
  next();
}
