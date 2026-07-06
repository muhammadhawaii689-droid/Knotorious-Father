export type UserRole = 'admin' | 'premium' | 'user';
export type UserStatus = 'active' | 'disabled';
export type RequestStatus = 'pending' | 'approved' | 'rejected';

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  status: UserStatus;
  dailyLimit: number;
  searchesToday: number;
  organization: string;
  phone: string;
  reason?: string;
  createdAt: string;
}

export interface AccessRequest {
  id: string;
  name: string;
  email: string;
  phone: string;
  organization: string;
  reason: string;
  limitRequested: string; // "1000" | "2000" | "3000" | "4000" | "5000" | "custom"
  customLimit?: number;
  status: RequestStatus;
  timestamp: string;
  limitAssigned?: number;
}

export interface DeviceSession {
  id: string;
  userId: string;
  email: string;
  role: UserRole;
  deviceName: string;
  browser: string;
  os: string;
  ip: string;
  location: string;
  loginTime: string;
  lastActive: string;
  token: string;
  isRemembered: boolean;
}

export interface AuditLog {
  id: string;
  type: 'login' | 'logout' | 'failed_login' | 'password_change' | 'search' | 'admin_action' | 'security';
  email: string;
  description: string;
  ip: string;
  timestamp: string;
  details?: string;
}

export interface SystemSettings {
  captchaEnabled: boolean;
  sessionTimeoutMinutes: number;
  maxDevicesPerUser: number;
  rateLimitRequests: number;
  appName: string;
  allowSelfRegistration: boolean;
  mfaRequired: boolean;
}

export interface AuthState {
  user: User | null;
  session: DeviceSession | null;
  token: string | null;
  isExpired: boolean;
}
