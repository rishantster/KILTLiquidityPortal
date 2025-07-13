import { createHash } from 'crypto';
import { Request, Response, NextFunction } from 'express';

// Admin credentials (in production, use environment variables)
const ADMIN_USERNAME = process.env.ADMIN_USERNAME || 'admin';
const ADMIN_PASSWORD_HASH = process.env.ADMIN_PASSWORD_HASH || createHash('sha256').update('admin123').digest('hex');

// Simple session storage (in production, use Redis or database)
const adminSessions = new Map<string, { userId: string; expires: number }>();

export function generateAdminToken(): string {
  return createHash('sha256').update(Date.now().toString() + Math.random().toString()).digest('hex');
}

export function validateAdminCredentials(username: string, password: string): boolean {
  const passwordHash = createHash('sha256').update(password).digest('hex');
  return username === ADMIN_USERNAME && passwordHash === ADMIN_PASSWORD_HASH;
}

export function createAdminSession(userId: string): string {
  const token = generateAdminToken();
  const expires = Date.now() + (24 * 60 * 60 * 1000); // 24 hours
  
  adminSessions.set(token, { userId, expires });
  return token;
}

export function validateAdminSession(token: string): boolean {
  const session = adminSessions.get(token);
  if (!session) return false;
  
  if (Date.now() > session.expires) {
    adminSessions.delete(token);
    return false;
  }
  
  return true;
}

export function cleanupExpiredSessions(): void {
  const now = Date.now();
  for (const [token, session] of adminSessions) {
    if (now > session.expires) {
      adminSessions.delete(token);
    }
  }
}

// Middleware to protect admin routes
export function requireAdminAuth(req: Request, res: Response, next: NextFunction): void {
  const token = req.headers.authorization?.replace('Bearer ', '');
  
  if (!token || !validateAdminSession(token)) {
    res.status(401).json({ error: 'Unauthorized: Admin access required' });
    return;
  }
  
  next();
}

// Cleanup expired sessions every hour
setInterval(cleanupExpiredSessions, 60 * 60 * 1000);