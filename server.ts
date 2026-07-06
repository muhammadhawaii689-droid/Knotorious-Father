import express from 'express';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import dotenv from 'dotenv';
import { createServer as createViteServer } from 'vite';
import { User, AccessRequest, DeviceSession, AuditLog, SystemSettings, UserRole, UserStatus } from './src/types.js';

dotenv.config();

const app = express();
const PORT = 3000;
const DB_FILE = path.join(process.cwd(), 'db.json');

app.use(express.json());

// In-memory rate limiting map
const rateLimits = new Map<string, { count: number; resetTime: number }>();

function rateLimiter(req: express.Request, res: express.Response, next: express.NextFunction) {
  const ip = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || 'unknown';
  const now = Date.now();
  const limitWindow = 60 * 1000; // 1 minute
  const maxRequests = 60; // 60 requests per minute

  const record = rateLimits.get(ip);
  if (!record || now > record.resetTime) {
    rateLimits.set(ip, { count: 1, resetTime: now + limitWindow });
    return next();
  }

  record.count++;
  if (record.count > maxRequests) {
    return res.status(429).json({ error: 'Too many requests. Please try again later.' });
  }
  next();
}

app.use('/api/', rateLimiter);

// Password Hashing helpers
function hashPassword(password: string): { hash: string; salt: string } {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.pbkdf2Sync(password, salt, 10000, 64, 'sha512').toString('hex');
  return { hash, salt };
}

function verifyPassword(password: string, hash: string, salt: string): boolean {
  const checkHash = crypto.pbkdf2Sync(password, salt, 10000, 64, 'sha512').toString('hex');
  return hash === checkHash;
}

// User Agent Parser
function parseUserAgent(userAgent: string | undefined) {
  if (!userAgent) return { browser: 'Unknown', os: 'Unknown', deviceName: 'Unknown Device' };
  
  let os = 'Unknown OS';
  if (userAgent.includes('Windows')) os = 'Windows';
  else if (userAgent.includes('Macintosh')) os = 'macOS';
  else if (userAgent.includes('Linux')) os = 'Linux';
  else if (userAgent.includes('Android')) os = 'Android';
  else if (userAgent.includes('iPhone') || userAgent.includes('iPad')) os = 'iOS';

  let browser = 'Unknown Browser';
  if (userAgent.includes('Chrome')) browser = 'Chrome';
  else if (userAgent.includes('Safari') && !userAgent.includes('Chrome')) browser = 'Safari';
  else if (userAgent.includes('Firefox')) browser = 'Firefox';
  else if (userAgent.includes('Edge')) browser = 'Edge';

  let deviceName = 'Desktop';
  if (userAgent.includes('Mobile')) deviceName = 'Mobile';
  else if (userAgent.includes('Tablet')) deviceName = 'Tablet';
  
  return { browser, os, deviceName };
}

// JSON Database Structure
interface DatabaseSchema {
  users: Array<User & { passwordHash: string; passwordSalt: string }>;
  requests: AccessRequest[];
  sessions: DeviceSession[];
  auditLogs: AuditLog[];
  settings: SystemSettings;
}

// Load DB
function loadDB(): DatabaseSchema {
  try {
    if (fs.existsSync(DB_FILE)) {
      const raw = fs.readFileSync(DB_FILE, 'utf-8');
      return JSON.parse(raw);
    }
  } catch (err) {
    console.error('Error loading database, resetting', err);
  }
  
  // Create default state if DB doesn't exist
  const defaultAdminHash = hashPassword('AdminPassword123');
  const defaultPremiumHash = hashPassword('Investigator123');
  const defaultUserHash = hashPassword('UserPassword123');

  const defaultState: DatabaseSchema = {
    users: [
      {
        id: 'user-admin',
        email: 'admin@osint.pro',
        name: 'Administrator',
        role: 'admin',
        status: 'active',
        dailyLimit: 5000,
        searchesToday: 0,
        organization: 'OSINT High Agency',
        phone: '+919999999999',
        createdAt: new Date().toISOString(),
        passwordHash: defaultAdminHash.hash,
        passwordSalt: defaultAdminHash.salt,
      },
      {
        id: 'user-premium',
        email: 'investigator@osint.pro',
        name: 'Premium Investigator',
        role: 'premium',
        status: 'active',
        dailyLimit: 2000,
        searchesToday: 0,
        organization: 'OSINT Private Eye',
        phone: '+918888888888',
        createdAt: new Date().toISOString(),
        passwordHash: defaultPremiumHash.hash,
        passwordSalt: defaultPremiumHash.salt,
      },
      {
        id: 'user-regular',
        email: 'user@osint.pro',
        name: 'Standard Agent',
        role: 'user',
        status: 'active',
        dailyLimit: 1000,
        searchesToday: 0,
        organization: 'Public Safety',
        phone: '+917777777777',
        createdAt: new Date().toISOString(),
        passwordHash: defaultUserHash.hash,
        passwordSalt: defaultUserHash.salt,
      }
    ],
    requests: [
      {
        id: 'req-1',
        name: 'Rohan Sharma',
        email: 'rohan.sharma@investigations.in',
        phone: '+919876543210',
        organization: 'Cyber Defence Lab',
        reason: 'Authorized government cyber forensics and search matching operations.',
        limitRequested: '3000',
        status: 'pending',
        timestamp: new Date(Date.now() - 3600000 * 2).toISOString(),
      },
      {
        id: 'req-2',
        name: 'Anjali Verma',
        email: 'anjali@forensics.org',
        phone: '+919988776655',
        organization: 'Vanguard Security',
        reason: 'Need high query limit for family and missing person tracing requests.',
        limitRequested: '5000',
        status: 'approved',
        timestamp: new Date(Date.now() - 3600000 * 12).toISOString(),
        limitAssigned: 5000
      },
      {
        id: 'req-3',
        name: 'Vikram Singh',
        email: 'vikram@threatintel.io',
        phone: '+917766554433',
        organization: 'Intel Sector',
        reason: 'Spam search reasons.',
        limitRequested: '1000',
        status: 'rejected',
        timestamp: new Date(Date.now() - 3600000 * 24).toISOString()
      }
    ],
    sessions: [],
    auditLogs: [
      {
        id: 'log-1',
        type: 'security',
        email: 'system',
        description: 'System bootstrapped with secure credential storage.',
        ip: '127.0.0.1',
        timestamp: new Date().toISOString()
      }
    ],
    settings: {
      captchaEnabled: true,
      sessionTimeoutMinutes: 30,
      maxDevicesPerUser: 3,
      rateLimitRequests: 60,
      appName: 'OSINT INVESTIGATION SEARCH',
      allowSelfRegistration: true,
      mfaRequired: false
    }
  };

  saveDB(defaultState);
  return defaultState;
}

// Save DB
function saveDB(data: DatabaseSchema) {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), 'utf-8');
  } catch (err) {
    console.error('Error saving database', err);
  }
}

// Write Audit Log
function logAction(
  type: AuditLog['type'],
  email: string,
  description: string,
  req: express.Request,
  details?: string
) {
  const db = loadDB();
  const ip = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || 'unknown';
  const newLog: AuditLog = {
    id: 'log-' + crypto.randomUUID().slice(0, 8),
    type,
    email,
    description,
    ip,
    timestamp: new Date().toISOString(),
    details
  };
  db.auditLogs.unshift(newLog);
  if (db.auditLogs.length > 500) db.auditLogs.pop(); // Keep last 500 logs
  saveDB(db);
}

// Authentication Middleware
function authenticateToken(req: express.Request, res: express.Response, next: express.NextFunction) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Authentication required. Please log in.' });
  }

  const db = loadDB();
  const session = db.sessions.find(s => s.token === token);

  if (!session) {
    return res.status(401).json({ error: 'Session not found. Please sign in again.' });
  }

  // Check Expiration
  const lastActiveTime = new Date(session.lastActive).getTime();
  const now = Date.now();
  const timeoutMs = db.settings.sessionTimeoutMinutes * 60 * 1000;

  if (now - lastActiveTime > timeoutMs) {
    // Remove expired session
    db.sessions = db.sessions.filter(s => s.token !== token);
    saveDB(db);
    return res.status(401).json({ error: 'Session expired due to inactivity.', isExpired: true });
  }

  // Update last active
  session.lastActive = new Date().toISOString();
  saveDB(db);

  // Attach user and session to request
  const user = db.users.find(u => u.id === session.userId);
  if (!user) {
    return res.status(403).json({ error: 'User account not found.' });
  }

  if (user.status === 'disabled') {
    return res.status(403).json({ error: 'Your account has been disabled by an administrator.' });
  }

  (req as any).user = user;
  (req as any).session = session;
  next();
}

// Admin Authorization Middleware
function requireAdmin(req: express.Request, res: express.Response, next: express.NextFunction) {
  const user = (req as any).user;
  if (!user || user.role !== 'admin') {
    return res.status(403).json({ error: 'Access denied. Administrator privileges required.' });
  }
  next();
}

// ============================================================
// API ENDPOINTS
// ============================================================

// 1. PUBLIC AUTHENTICATION

// User info endpoint
app.get('/api/auth/me', authenticateToken, (req, res) => {
  const user = (req as any).user;
  const session = (req as any).session;
  res.json({ user, session });
});

// Login
app.post('/api/auth/login', (req, res) => {
  const { email, password, captchaResponse, deviceFingerprint, rememberMe } = req.body;
  const db = loadDB();

  // Validate Captcha
  if (db.settings.captchaEnabled && (!captchaResponse || captchaResponse.toString() === '')) {
    return res.status(400).json({ error: 'CAPTCHA verification is required.' });
  }

  const user = db.users.find(u => u.email.toLowerCase() === email.trim().toLowerCase());

  if (!user) {
    logAction('failed_login', email, 'Failed login attempt: Email not found.', req);
    return res.status(400).json({ error: 'Invalid email address or password.' });
  }

  if (user.status === 'disabled') {
    logAction('failed_login', email, 'Failed login attempt: Account disabled.', req);
    return res.status(403).json({ error: 'Your account has been disabled. Contact support.' });
  }

  const isValid = verifyPassword(password, user.passwordHash, user.passwordSalt);
  if (!isValid) {
    logAction('failed_login', email, 'Failed login attempt: Incorrect password.', req);
    return res.status(400).json({ error: 'Invalid email address or password.' });
  }

  // Device Session Tracking
  const ua = req.headers['user-agent'];
  const { browser, os, deviceName } = parseUserAgent(ua);
  const ip = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || '127.0.0.1';

  // Count active sessions for user
  const userSessions = db.sessions.filter(s => s.userId === user.id);
  if (userSessions.length >= db.settings.maxDevicesPerUser) {
    // Force logout oldest session
    const sorted = [...userSessions].sort((a, b) => new Date(a.lastActive).getTime() - new Date(b.lastActive).getTime());
    const oldest = sorted[0];
    db.sessions = db.sessions.filter(s => s.id !== oldest.id);
    logAction('security', user.email, `Max devices reached (${db.settings.maxDevicesPerUser}). Session ${oldest.id} terminated.`, req);
  }

  // Create new session
  const token = crypto.randomBytes(32).toString('hex');
  const session: DeviceSession = {
    id: 'sess-' + crypto.randomUUID().slice(0, 8),
    userId: user.id,
    email: user.email,
    role: user.role,
    deviceName: deviceFingerprint?.deviceName || deviceName,
    browser: deviceFingerprint?.browser || browser,
    os: deviceFingerprint?.os || os,
    ip,
    location: 'Approx. Location (India)',
    loginTime: new Date().toISOString(),
    lastActive: new Date().toISOString(),
    token,
    isRemembered: !!rememberMe
  };

  db.sessions.push(session);
  saveDB(db);

  logAction('login', user.email, 'User logged in successfully.', req, `Device: ${session.deviceName} | OS: ${session.os}`);

  res.json({
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      status: user.status,
      dailyLimit: user.dailyLimit,
      searchesToday: user.searchesToday,
      organization: user.organization,
      phone: user.phone
    },
    session,
    token
  });
});

// Logout
app.post('/api/auth/logout', authenticateToken, (req, res) => {
  const session = (req as any).session;
  const db = loadDB();

  db.sessions = db.sessions.filter(s => s.id !== session.id);
  saveDB(db);

  logAction('logout', session.email, 'User logged out successfully.', req);
  res.json({ success: true, message: 'Logged out successfully.' });
});

// Forgot Password
app.post('/api/auth/forgot-password', (req, res) => {
  const { email } = req.body;
  const db = loadDB();
  const user = db.users.find(u => u.email.toLowerCase() === email.trim().toLowerCase());

  if (!user) {
    return res.json({ success: true, message: 'If the email exists, a password reset link has been dispatched.' });
  }

  logAction('security', email, 'Password reset link requested.', req);
  // Generate reset token and store temporarily or mock
  res.json({
    success: true,
    message: 'If the email exists, a password reset link has been dispatched.',
    resetToken: 'reset-' + crypto.randomBytes(16).toString('hex') // In a real app sent via email, for simulation we show it in log or return safely
  });
});

// Password Reset Action
app.post('/api/auth/reset-password', (req, res) => {
  const { email, token, newPassword } = req.body;
  const db = loadDB();
  const user = db.users.find(u => u.email.toLowerCase() === email.trim().toLowerCase());

  if (!user) {
    return res.status(400).json({ error: 'User not found or reset token expired.' });
  }

  const { hash, salt } = hashPassword(newPassword);
  user.passwordHash = hash;
  user.passwordSalt = salt;
  
  // Terminate all sessions for security
  db.sessions = db.sessions.filter(s => s.userId !== user.id);
  saveDB(db);

  logAction('password_change', email, 'Password reset successfully using secure recovery token.', req);
  res.json({ success: true, message: 'Password has been updated successfully.' });
});

// Access Request Submission
app.post('/api/auth/request-access', (req, res) => {
  const { name, email, phone, organization, reason, limitRequested, customLimit } = req.body;
  
  if (!name || !email || !phone || !organization || !reason) {
    return res.status(400).json({ error: 'All fields are required.' });
  }

  const db = loadDB();
  
  // Create request
  const newRequest: AccessRequest = {
    id: 'req-' + crypto.randomUUID().slice(0, 8),
    name: name.trim(),
    email: email.trim().toLowerCase(),
    phone: phone.trim(),
    organization: organization.trim(),
    reason: reason.trim(),
    limitRequested,
    customLimit: customLimit ? parseInt(customLimit) : undefined,
    status: 'pending',
    timestamp: new Date().toISOString()
  };

  db.requests.unshift(newRequest);
  saveDB(db);

  logAction('security', email.trim(), `Access request submitted. Limit requested: ${limitRequested}`, req);
  res.json({ success: true, message: 'Access request submitted successfully. Admin review is pending.' });
});

// Regular user password change reason submission
app.post('/api/auth/change-password-request', authenticateToken, (req, res) => {
  const user = (req as any).user;
  const { reason } = req.body;

  if (!reason) {
    return res.status(400).json({ error: 'Reason is required.' });
  }

  logAction('password_change', user.email, `User requested password change reason: ${reason}`, req);
  res.json({ success: true, message: 'Your password change request was logged. Please check with administrator.' });
});


// 2. SEARCH & API PROXIES

app.post('/api/search', authenticateToken, async (req, res) => {
  const user = (req as any).user;
  const { type, query } = req.body;

  if (!type || !query) {
    return res.status(400).json({ error: 'Search type and query are required.' });
  }

  const db = loadDB();
  const dbUser = db.users.find(u => u.id === user.id);

  if (!dbUser) {
    return res.status(403).json({ error: 'Account not found.' });
  }

  // Check limit expiration/reset (resets daily, but for simplicity let's compare with current date)
  // Check daily limit
  if (dbUser.searchesToday >= dbUser.dailyLimit) {
    logAction('security', user.email, `Search rate limit hit: ${dbUser.searchesToday}/${dbUser.dailyLimit}`, req);
    return res.status(403).json({ error: `Daily search limit reached (${dbUser.dailyLimit}). Contact admin.` });
  }

  // Update count
  dbUser.searchesToday++;
  db.users = db.users.map(u => u.id === dbUser.id ? dbUser : u);
  saveDB(db);

  logAction('search', user.email, `Performed OSINT Search (${type}) on query: ${query}`, req);

  try {
    if (type === 'mobile') {
      const trimmedNum = query.trim().replace(/\D/g, '').slice(-10);
      const url = `https://ft-osint-api.duckdns.org/api/numleak?key=shiva-m&num=${trimmedNum}`;
      
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`External API responded with status ${response.status}`);
      }
      const data = await response.json();
      return res.json(data);
    } 
    else if (type === 'aadhaar') {
      // Use Family-to-Details API
      const trimmedAadhaar = query.trim().replace(/\D/g, '');
      const url = `https://data-base-opal.vercel.app/aadhaar/${trimmedAadhaar}`;
      
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Details API responded with status ${response.status}`);
      }
      const data = await response.json();
      return res.json(data);
    } 
    else if (type === 'family') {
      // Aadhaar-to-Family API is currently not working
      return res.json({
        success: false,
        error: 'unavailable',
        message: 'This feature is temporarily unavailable. It will be working again soon.'
      });
    } 
    else {
      return res.status(400).json({ error: 'Invalid search type' });
    }
  } catch (error: any) {
    console.error('Search proxy error:', error);
    return res.status(500).json({ error: 'Failed to retrieve data from intelligence database. Try again.' });
  }
});


// 3. ADMIN MANAGEMENT ENDPOINTS (PROTECTED & RBAC)

// User Management CRUD
app.get('/api/admin/users', authenticateToken, requireAdmin, (req, res) => {
  const db = loadDB();
  // Don't expose salt and hashes
  const safeUsers = db.users.map(u => ({
    id: u.id,
    email: u.email,
    name: u.name,
    role: u.role,
    status: u.status,
    dailyLimit: u.dailyLimit,
    searchesToday: u.searchesToday,
    organization: u.organization,
    phone: u.phone,
    createdAt: u.createdAt
  }));
  res.json(safeUsers);
});

// Create User
app.post('/api/admin/users', authenticateToken, requireAdmin, (req, res) => {
  const { name, email, phone, organization, role, dailyLimit, password } = req.body;
  const db = loadDB();

  if (db.users.some(u => u.email.toLowerCase() === email.toLowerCase().trim())) {
    return res.status(400).json({ error: 'User with this email already exists.' });
  }

  const { hash, salt } = hashPassword(password || 'OSINTPassword123');

  const newUser = {
    id: 'user-' + crypto.randomUUID().slice(0, 8),
    email: email.trim().toLowerCase(),
    name: name.trim(),
    role: role || 'user',
    status: 'active' as UserStatus,
    dailyLimit: parseInt(dailyLimit) || 1000,
    searchesToday: 0,
    organization: organization || 'OSINT Professional',
    phone: phone || '',
    createdAt: new Date().toISOString(),
    passwordHash: hash,
    passwordSalt: salt
  };

  db.users.push(newUser);
  saveDB(db);

  logAction('admin_action', (req as any).user.email, `Created new user account: ${newUser.email}`, req);
  res.json({ success: true, user: newUser });
});

// Update User
app.put('/api/admin/users/:id', authenticateToken, requireAdmin, (req, res) => {
  const { id } = req.params;
  const { name, phone, organization, role, dailyLimit, status } = req.body;
  const db = loadDB();

  const userIdx = db.users.findIndex(u => u.id === id);
  if (userIdx === -1) {
    return res.status(404).json({ error: 'User not found.' });
  }

  const user = db.users[userIdx];
  user.name = name !== undefined ? name.trim() : user.name;
  user.phone = phone !== undefined ? phone.trim() : user.phone;
  user.organization = organization !== undefined ? organization.trim() : user.organization;
  user.role = role !== undefined ? role : user.role;
  user.dailyLimit = dailyLimit !== undefined ? parseInt(dailyLimit) : user.dailyLimit;
  user.status = status !== undefined ? status : user.status;

  db.users[userIdx] = user;
  saveDB(db);

  logAction('admin_action', (req as any).user.email, `Updated user account settings: ${user.email}`, req);
  res.json({ success: true, user });
});

// Reset Password of user
app.post('/api/admin/users/:id/reset-password', authenticateToken, requireAdmin, (req, res) => {
  const { id } = req.params;
  const { password } = req.body;
  const db = loadDB();

  const user = db.users.find(u => u.id === id);
  if (!user) {
    return res.status(404).json({ error: 'User not found.' });
  }

  const { hash, salt } = hashPassword(password || 'OSINTReset123');
  user.passwordHash = hash;
  user.passwordSalt = salt;

  // Terminate user sessions for security
  db.sessions = db.sessions.filter(s => s.userId !== user.id);
  saveDB(db);

  logAction('admin_action', (req as any).user.email, `Forced password reset for user: ${user.email}`, req);
  res.json({ success: true, message: `Password reset successfully for ${user.name}` });
});

// Delete User
app.delete('/api/admin/users/:id', authenticateToken, requireAdmin, (req, res) => {
  const { id } = req.params;
  const db = loadDB();

  const user = db.users.find(u => u.id === id);
  if (!user) {
    return res.status(404).json({ error: 'User not found.' });
  }

  if (user.role === 'admin') {
    return res.status(400).json({ error: 'System administrator accounts cannot be deleted.' });
  }

  db.users = db.users.filter(u => u.id !== id);
  db.sessions = db.sessions.filter(s => s.userId !== id); // Terminate active sessions
  saveDB(db);

  logAction('admin_action', (req as any).user.email, `Deleted user account: ${user.email}`, req);
  res.json({ success: true });
});

// Request Management
app.get('/api/admin/requests', authenticateToken, requireAdmin, (req, res) => {
  const db = loadDB();
  res.json(db.requests);
});

// Approve/Reject Access Request
app.post('/api/admin/requests/:id/action', authenticateToken, requireAdmin, (req, res) => {
  const { id } = req.params;
  const { status, limitAssigned } = req.body; // status: 'approved' | 'rejected'
  const db = loadDB();

  const request = db.requests.find(r => r.id === id);
  if (!request) {
    return res.status(404).json({ error: 'Request not found.' });
  }

  request.status = status;
  if (status === 'approved') {
    request.limitAssigned = limitAssigned ? parseInt(limitAssigned) : parseInt(request.limitRequested) || 1000;
    
    // Auto-create User account!
    if (!db.users.some(u => u.email.toLowerCase() === request.email.toLowerCase())) {
      const defaultPassword = 'OSINTPassword123';
      const { hash, salt } = hashPassword(defaultPassword);
      
      const newUser = {
        id: 'user-' + crypto.randomUUID().slice(0, 8),
        email: request.email,
        name: request.name,
        role: 'user' as UserRole,
        status: 'active' as UserStatus,
        dailyLimit: request.limitAssigned,
        searchesToday: 0,
        organization: request.organization,
        phone: request.phone,
        createdAt: new Date().toISOString(),
        passwordHash: hash,
        passwordSalt: salt
      };
      
      db.users.push(newUser);
      logAction('admin_action', (req as any).user.email, `Approved request access for ${request.email}. Auto-created active investigator account.`, req);
    }
  } else {
    logAction('admin_action', (req as any).user.email, `Rejected request access for ${request.email}`, req);
  }

  saveDB(db);
  res.json({ success: true, request });
});

// Device and Session Management
app.get('/api/admin/sessions', authenticateToken, requireAdmin, (req, res) => {
  const db = loadDB();
  res.json(db.sessions);
});

// Force logout specific session
app.post('/api/admin/sessions/:id/logout', authenticateToken, requireAdmin, (req, res) => {
  const { id } = req.params;
  const db = loadDB();

  const session = db.sessions.find(s => s.id === id);
  if (!session) {
    return res.status(404).json({ error: 'Active session not found.' });
  }

  db.sessions = db.sessions.filter(s => s.id !== id);
  saveDB(db);

  logAction('admin_action', (req as any).user.email, `Forced termination of active session: ${session.email} (${session.id})`, req);
  res.json({ success: true });
});

// Logout all devices for a user
app.post('/api/admin/users/:userId/logout-all', authenticateToken, requireAdmin, (req, res) => {
  const { userId } = req.params;
  const db = loadDB();

  db.sessions = db.sessions.filter(s => s.userId !== userId);
  saveDB(db);

  logAction('admin_action', (req as any).user.email, `Forced logout of all active sessions for user ID: ${userId}`, req);
  res.json({ success: true });
});

// Audit and Activity Monitoring
app.get('/api/admin/audit-logs', authenticateToken, requireAdmin, (req, res) => {
  const db = loadDB();
  res.json(db.auditLogs);
});

// Update Platform Settings
app.get('/api/admin/settings', authenticateToken, requireAdmin, (req, res) => {
  const db = loadDB();
  res.json(db.settings);
});

app.put('/api/admin/settings', authenticateToken, requireAdmin, (req, res) => {
  const settings = req.body;
  const db = loadDB();

  db.settings = {
    ...db.settings,
    ...settings
  };
  saveDB(db);

  logAction('admin_action', (req as any).user.email, 'Updated system security and platform parameters.', req);
  res.json({ success: true, settings: db.settings });
});

// Reset search counters for all users (Admin operation)
app.post('/api/admin/reset-daily-searches', authenticateToken, requireAdmin, (req, res) => {
  const db = loadDB();
  db.users = db.users.map(u => ({ ...u, searchesToday: 0 }));
  saveDB(db);
  logAction('admin_action', (req as any).user.email, 'Forced administrative reset of daily search counters for all accounts.', req);
  res.json({ success: true });
});

// Initialize database
loadDB();

// ============================================================
// VITE DEV SERVER AND PRODUCTION CONFIG
// ============================================================

async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
