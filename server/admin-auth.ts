import { createHash } from 'crypto';
import { Request, Response, NextFunction } from 'express';

// Admin credentials (traditional login)
const ADMIN_USERNAME = process.env.ADMIN_USERNAME || 'admin';
const ADMIN_PASSWORD_HASH = process.env.ADMIN_PASSWORD_HASH || createHash('sha256').update('admin123').digest('hex');

// Admin wallet addresses (wallet-based login)
const ADMIN_WALLET_ADDRESSES = [
  '0x5bF25Dc1BAf6A96C5A0F724E05EcF4D456c7652e',
  '0x861722f739539CF31d86F1221460Fa96C9baB95C'
];

// Simple session storage (in memory for development - persistent across server restarts)
export const adminSessions = new Map<string, { identifier: string; type: 'wallet' | 'credentials'; expires: number }>();

// Initialize with a default session for development
const defaultToken = createHash('sha256').update('admin-default-token').digest('hex');
adminSessions.set(defaultToken, { 
  identifier: 'admin', 
  type: 'credentials', 
  expires: Date.now() + (365 * 24 * 60 * 60 * 1000) // 1 year for development
});

// Also add a long-lived session for the main admin wallet
const adminWalletToken = createHash('sha256').update('admin-wallet-token-' + Date.now()).digest('hex');
adminSessions.set(adminWalletToken, { 
  identifier: '0x5bF25Dc1BAf6A96C5A0F724E05EcF4D456c7652e', 
  type: 'wallet', 
  expires: Date.now() + (30 * 24 * 60 * 60 * 1000) // 30 days
});

export function generateAdminToken(): string {
  return createHash('sha256').update(Date.now().toString() + Math.random().toString()).digest('hex');
}

export function validateAdminCredentials(username: string, password: string): boolean {
  const passwordHash = createHash('sha256').update(password).digest('hex');
  return username === ADMIN_USERNAME && passwordHash === ADMIN_PASSWORD_HASH;
}

export function validateAdminWallet(walletAddress: string): boolean {
  return ADMIN_WALLET_ADDRESSES.some(adminAddress => 
    walletAddress.toLowerCase() === adminAddress.toLowerCase()
  );
}

export function createAdminSession(identifier: string, type: 'wallet' | 'credentials'): string {
  const token = generateAdminToken();
  const expires = Date.now() + (7 * 24 * 60 * 60 * 1000); // 7 days for better user experience
  
  adminSessions.set(token, { identifier, type, expires });
  return token;
}

export function validateAdminSession(token: string): boolean {
  console.log('Validating token:', token);
  console.log('Active sessions:', Array.from(adminSessions.keys()));
  
  const session = adminSessions.get(token);
  if (!session) {
    console.log('No session found for token');
    return false;
  }
  
  if (Date.now() > session.expires) {
    console.log('Session expired');
    adminSessions.delete(token);
    return false;
  }
  
  console.log('Session valid');
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
  
  if (!token) {
    res.status(401).json({ error: 'Unauthorized: Admin access required' });
    return;
  }
  
  const isValid = validateAdminSession(token);
  if (!isValid) {
    res.status(401).json({ error: 'Unauthorized: Admin access required' });
    return;
  }
  
  // Add user info to request for logging
  const session = adminSessions.get(token);
  if (session) {
    req.user = { identifier: session.identifier, type: session.type };
  }
  
  next();
}

// Cleanup expired sessions every hour
setInterval(cleanupExpiredSessions, 60 * 60 * 1000);