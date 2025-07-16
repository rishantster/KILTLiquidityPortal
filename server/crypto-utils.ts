import crypto from 'crypto';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';

// Secure random token generation
export const generateSecureToken = (length: number = 32): string => {
  return crypto.randomBytes(length).toString('hex');
};

// Generate session ID with timestamp and random data
export const generateSessionId = (): string => {
  const timestamp = Date.now().toString(36);
  const randomPart = crypto.randomBytes(16).toString('hex');
  return `${timestamp}_${randomPart}`;
};

// Hash sensitive data (like user IDs in sessions)
export const hashData = async (data: string): Promise<string> => {
  const saltRounds = 12;
  return bcrypt.hash(data, saltRounds);
};

// Verify hashed data
export const verifyHash = async (data: string, hash: string): Promise<boolean> => {
  return bcrypt.compare(data, hash);
};

// JWT token generation for secure API authentication
export const generateJWT = (payload: object, expiresIn: string = '24h'): string => {
  const secret = process.env.JWT_SECRET || generateSecureToken(64);
  return jwt.sign(payload, secret, { expiresIn });
};

// JWT token verification
export const verifyJWT = (token: string): any => {
  const secret = process.env.JWT_SECRET || generateSecureToken(64);
  return jwt.verify(token, secret);
};

// Secure comparison to prevent timing attacks
export const secureCompare = (a: string, b: string): boolean => {
  if (a.length !== b.length) {
    return false;
  }
  return crypto.timingSafeEqual(Buffer.from(a), Buffer.from(b));
};

// Validate Ethereum address format
export const isValidEthereumAddress = (address: string): boolean => {
  return /^0x[a-fA-F0-9]{40}$/.test(address);
};

// Validate NFT token ID format
export const isValidNFTTokenId = (tokenId: string): boolean => {
  return /^[0-9]+$/.test(tokenId) && tokenId.length <= 78; // Max uint256
};

// Sanitize and validate numerical inputs
export const sanitizeNumber = (input: any): number | null => {
  const num = parseFloat(input);
  if (isNaN(num) || !isFinite(num)) {
    return null;
  }
  // Prevent extremely large numbers that could cause issues
  if (Math.abs(num) > Number.MAX_SAFE_INTEGER) {
    return null;
  }
  return num;
};

// Rate limiting key generation
export const generateRateLimitKey = (ip: string, endpoint: string): string => {
  return `rate_limit:${ip}:${endpoint}`;
};

// Encrypt sensitive data for storage
export const encrypt = (text: string, key?: string): string => {
  const secretKey = key || process.env.ENCRYPTION_KEY || generateSecureToken(32);
  const algorithm = 'aes-256-gcm';
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(algorithm, Buffer.from(secretKey.substring(0, 32)), iv);
  
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const authTag = cipher.getAuthTag();
  
  return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
};

// Decrypt sensitive data
export const decrypt = (encryptedText: string, key?: string): string => {
  const secretKey = key || process.env.ENCRYPTION_KEY || generateSecureToken(32);
  const algorithm = 'aes-256-gcm';
  const [ivHex, authTagHex, encrypted] = encryptedText.split(':');
  const iv = Buffer.from(ivHex, 'hex');
  const authTag = Buffer.from(authTagHex, 'hex');
  const decipher = crypto.createDecipheriv(algorithm, Buffer.from(secretKey.substring(0, 32)), iv);
  decipher.setAuthTag(authTag);
  
  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  
  return decrypted;
};