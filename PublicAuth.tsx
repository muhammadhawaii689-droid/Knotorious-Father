import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ShieldAlert, Mail, Lock, User, Phone, Building2, KeyRound, ChevronRight, CornerDownLeft, Loader2, Sparkles, AlertCircle } from 'lucide-react';
import { useToast } from './Toast.jsx';
import { Captcha, CaptchaHandle } from './Captcha.jsx';
import { User as UserType, DeviceSession } from '../types.js';

interface PublicAuthProps {
  onAuthSuccess: (user: UserType, session: DeviceSession, token: string) => void;
  sessionExpired: boolean;
  clearSessionExpired: () => void;
}

type AuthMode = 'login' | 'request-access' | 'forgot-password' | 'reset-password';

export default function PublicAuth({ onAuthSuccess, sessionExpired, clearSessionExpired }: PublicAuthProps) {
  const { showToast } = useToast();
  const [mode, setMode] = useState<AuthMode>('login');
  const [loading, setLoading] = useState(false);
  const captchaRef = useRef<CaptchaHandle>(null);
  const [captchaVerified, setCaptchaVerified] = useState(false);

  // Form Fields
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [captchaInput, setCaptchaInput] = useState('');

  // Request Access Fields
  const [fullName, setFullName] = useState('');
  const [reqEmail, setReqEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [organization, setOrganization] = useState('');
  const [reason, setReason] = useState('');
  const [limitDropdown, setLimitDropdown] = useState('1000');
  const [customLimit, setCustomLimit] = useState('');

  // Forgot / Reset Fields
  const [forgotEmail, setForgotEmail] = useState('');
  const [resetToken, setResetToken] = useState('');
  const [newPassword, setNewPassword] = useState('');

  // Device Fingerprinting
  const getDeviceFingerprint = () => {
    const ua = navigator.userAgent;
    let os = 'Unknown OS';
    if (ua.includes('Windows')) os = 'Windows';
    else if (ua.includes('Macintosh')) os = 'macOS';
    else if (ua.includes('Linux')) os = 'Linux';
    else if (ua.includes('Android')) os = 'Android';
    else if (ua.includes('iPhone') || ua.includes('iPad')) os = 'iOS';

    let browser = 'Unknown Browser';
    if (ua.includes('Chrome')) browser = 'Chrome';
    else if (ua.includes('Safari') && !ua.includes('Chrome')) browser = 'Safari';
    else if (ua.includes('Firefox')) browser = 'Firefox';
    else if (ua.includes('Edge')) browser = 'Edge';

    return {
      deviceName: `${os} Device (${browser})`,
      os,
      browser
    };
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      showToast('Please specify both email and password.', 'error');
      return;
    }

    if (!captchaVerified) {
      showToast('Please solve the human verification CAPTCHA.', 'error');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email.trim(),
          password,
          captchaResponse: 'verified',
          rememberMe,
          deviceFingerprint: getDeviceFingerprint()
        })
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Login failed. Please verify credentials.');
      }

      showToast(`Welcome back, ${data.user.name}!`, 'success');
      onAuthSuccess(data.user, data.session, data.token);
    } catch (err: any) {
      showToast(err.message || 'Connection to authentication services failed.', 'error');
      captchaRef.current?.refresh();
      setCaptchaVerified(false);
    } finally {
      setLoading(false);
    }
  };

  const handleRequestAccess = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName || !reqEmail || !phone || !organization || !reason) {
      showToast('Please populate all request fields.', 'error');
      return;
    }

    setLoading(true);
    try {
      const selectedLimit = limitDropdown === 'custom' ? customLimit : limitDropdown;
      const response = await fetch('/api/auth/request-access', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: fullName,
          email: reqEmail,
          phone,
          organization,
          reason,
          limitRequested: limitDropdown,
          customLimit: selectedLimit
        })
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to submit request.');
      }

      showToast('Access request submitted successfully. Admin review in progress.', 'success');
      // Reset request fields
      setFullName('');
      setReqEmail('');
      setPhone('');
      setOrganization('');
      setReason('');
      setLimitDropdown('1000');
      setCustomLimit('');
      setMode('login');
    } catch (err: any) {
      showToast(err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!forgotEmail) {
      showToast('Please input your registered email.', 'error');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: forgotEmail })
      });
      const data = await res.json();
      
      showToast(data.message, 'success');
      if (data.resetToken) {
        setResetToken(data.resetToken);
        setMode('reset-password');
      }
    } catch (err: any) {
      showToast('Failed to dispatch recovery request.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!forgotEmail || !resetToken || !newPassword) {
      showToast('Please complete all recovery fields.', 'error');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: forgotEmail,
          token: resetToken,
          newPassword
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      showToast('Password has been updated. You can now log in.', 'success');
      setForgotEmail('');
      setResetToken('');
      setNewPassword('');
      setMode('login');
    } catch (err: any) {
      showToast(err.message || 'Recovery code validation failed.', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-140px)] flex flex-col justify-center items-center py-10 px-4 relative">
      {/* Background Grid Accent */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(0,180,255,0.015)_1px,transparent_1px),linear-gradient(90deg,rgba(0,180,255,0.015)_1px,transparent_1px)] bg-[size:30px_30px] pointer-events-none" />

      <AnimatePresence mode="wait">
        {sessionExpired && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="mb-6 w-full max-w-md bg-rose-500/10 border border-rose-500/30 p-4 rounded-xl flex items-start gap-3 backdrop-blur-md"
          >
            <ShieldAlert className="h-5 w-5 text-rose-400 flex-shrink-0 mt-0.5" />
            <div>
              <h4 className="text-sm font-semibold text-rose-300">Session Expired Notice</h4>
              <p className="text-xs text-[#a0b8d0] mt-1">
                Your credentials lapsed due to programmatic inactivity rules. Please authenticate again.
              </p>
            </div>
            <button 
              onClick={clearSessionExpired} 
              className="text-xs text-rose-300 hover:text-white underline ml-auto flex-shrink-0"
            >
              Acknowledge
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-lg bg-[#0c1428]/70 backdrop-blur-xl border border-sky-500/15 rounded-3xl overflow-hidden shadow-2xl shadow-black/80 relative"
      >
        {/* Glow effect */}
        <div className="absolute top-0 left-1/4 right-1/4 h-[2px] bg-gradient-to-r from-transparent via-[#00ccff] to-transparent shadow-[0_0_15px_#00ccff]" />

        {/* Brand Header */}
        <div className="p-8 pb-4 text-center border-b border-sky-500/10">
          <div className="inline-flex items-center justify-center h-14 w-14 rounded-2xl bg-gradient-to-br from-blue-600 to-sky-400 text-white font-black text-2xl shadow-lg shadow-sky-500/20 mb-4">
            OI
          </div>
          <h2 className="text-2xl font-bold tracking-tight text-white bg-gradient-to-r from-[#e0e6f0] to-[#80c0ff] bg-clip-text text-transparent">
            {mode === 'login' && 'AGENT SIGN IN'}
            {mode === 'request-access' && 'INVESTIGATOR ENROLLMENT'}
            {mode === 'forgot-password' && 'RECOVER KEY'}
            {mode === 'reset-password' && 'UPDATE CREDENTIALS'}
          </h2>
          <p className="text-xs text-[#4a6a8a] mt-1 tracking-wider uppercase">
            {mode === 'login' && 'Intelligence Portal Gateway'}
            {mode === 'request-access' && 'Request system security credentials'}
            {mode === 'forgot-password' && 'Reset administrator or agent password'}
            {mode === 'reset-password' && 'Enter recovery code & new password'}
          </p>
        </div>

        {/* Card Body */}
        <div className="p-8">
          <AnimatePresence mode="wait">
            {/* LOGIN MODE */}
            {mode === 'login' && (
              <motion.form
                key="login"
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 10 }}
                onSubmit={handleLogin}
                className="space-y-5"
              >
                <div className="space-y-2">
                  <label className="block text-xs text-[#4a6a8a] font-semibold uppercase tracking-wider">
                    Secure Email Address
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#3a5a7a]">
                      <Mail className="h-4.5 w-4.5" />
                    </div>
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="agent@osint.pro"
                      className="w-full bg-black/40 border border-sky-500/15 rounded-xl py-3 pl-11 pr-4 text-[#e0e6f0] placeholder-[#3a4a5a] focus:outline-none focus:border-[#00ccff]/40 focus:ring-1 focus:ring-[#00ccff]/30 transition-all text-sm"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <label className="block text-xs text-[#4a6a8a] font-semibold uppercase tracking-wider">
                      Private Password
                    </label>
                    <button
                      type="button"
                      onClick={() => setMode('forgot-password')}
                      className="text-xs text-[#00ccff] hover:underline"
                    >
                      Forgot Key?
                    </button>
                  </div>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#3a5a7a]">
                      <Lock className="h-4.5 w-4.5" />
                    </div>
                    <input
                      type="password"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••••••"
                      className="w-full bg-black/40 border border-sky-500/15 rounded-xl py-3 pl-11 pr-4 text-[#e0e6f0] placeholder-[#3a4a5a] focus:outline-none focus:border-[#00ccff]/40 focus:ring-1 focus:ring-[#00ccff]/30 transition-all text-sm"
                    />
                  </div>
                </div>

                {/* Remember Me */}
                <div className="flex items-center">
                  <input
                    id="remember-me"
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="h-4 w-4 rounded bg-black/40 border-sky-500/15 text-sky-500 focus:ring-0 focus:ring-offset-0"
                  />
                  <label htmlFor="remember-me" className="ml-2 block text-xs text-[#708aa8] cursor-pointer">
                    Remember my terminal for 30 days
                  </label>
                </div>

                {/* Captcha */}
                <div className="bg-[#050b18]/60 p-4 rounded-2xl border border-sky-500/10">
                  <Captcha ref={captchaRef} onVerifyChange={setCaptchaVerified} />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-gradient-to-r from-blue-600 to-sky-500 hover:from-blue-500 hover:to-sky-400 text-white py-3.5 px-4 rounded-xl font-semibold text-sm shadow-lg shadow-blue-500/20 active:translate-y-px transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {loading ? (
                    <>
                      <Loader2 className="h-4.5 w-4.5 animate-spin" /> Authenticating...
                    </>
                  ) : (
                    <>
                      Sign In & Access Databases <ChevronRight className="h-4 w-4" />
                    </>
                  )}
                </button>

                <div className="pt-4 border-t border-sky-500/10 text-center">
                  <span className="text-xs text-[#4a6a8a]">Need premium access?</span>{' '}
                  <button
                    type="button"
                    onClick={() => setMode('request-access')}
                    className="text-xs text-[#00ccff] hover:underline font-semibold"
                  >
                    Enroll New Terminal
                  </button>
                </div>
              </motion.form>
            )}

            {/* REQUEST ACCESS MODE */}
            {mode === 'request-access' && (
              <motion.form
                key="request-access"
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                onSubmit={handleRequestAccess}
                className="space-y-4"
              >
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="block text-xs text-[#4a6a8a] font-semibold uppercase">Full Name</label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-[#3a5a7a]">
                        <User className="h-4 w-4" />
                      </div>
                      <input
                        type="text"
                        required
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        placeholder="John Doe"
                        className="w-full bg-black/40 border border-sky-500/15 rounded-xl py-2.5 pl-9 pr-3 text-[#e0e6f0] placeholder-[#3a4a5a] text-xs focus:outline-none focus:border-[#00ccff]/40 focus:ring-0 transition-all"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-xs text-[#4a6a8a] font-semibold uppercase">Email Address</label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-[#3a5a7a]">
                        <Mail className="h-4 w-4" />
                      </div>
                      <input
                        type="email"
                        required
                        value={reqEmail}
                        onChange={(e) => setReqEmail(e.target.value)}
                        placeholder="john@example.com"
                        className="w-full bg-black/40 border border-sky-500/15 rounded-xl py-2.5 pl-9 pr-3 text-[#e0e6f0] placeholder-[#3a4a5a] text-xs focus:outline-none focus:border-[#00ccff]/40 focus:ring-0 transition-all"
                      />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="block text-xs text-[#4a6a8a] font-semibold uppercase">Phone Number</label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-[#3a5a7a]">
                        <Phone className="h-4 w-4" />
                      </div>
                      <input
                        type="text"
                        required
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder="+919999999999"
                        className="w-full bg-black/40 border border-sky-500/15 rounded-xl py-2.5 pl-9 pr-3 text-[#e0e6f0] placeholder-[#3a4a5a] text-xs focus:outline-none focus:border-[#00ccff]/40 focus:ring-0 transition-all"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-xs text-[#4a6a8a] font-semibold uppercase">Organization</label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-[#3a5a7a]">
                        <Building2 className="h-4 w-4" />
                      </div>
                      <input
                        type="text"
                        required
                        value={organization}
                        onChange={(e) => setOrganization(e.target.value)}
                        placeholder="Threat Intel Corp"
                        className="w-full bg-black/40 border border-sky-500/15 rounded-xl py-2.5 pl-9 pr-3 text-[#e0e6f0] placeholder-[#3a4a5a] text-xs focus:outline-none focus:border-[#00ccff]/40 focus:ring-0 transition-all"
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs text-[#4a6a8a] font-semibold uppercase">Daily Search Limit</label>
                  <select
                    value={limitDropdown}
                    onChange={(e) => setLimitDropdown(e.target.value)}
                    className="w-full bg-black/50 border border-sky-500/15 rounded-xl py-2.5 px-3 text-[#e0e6f0] text-xs focus:outline-none focus:border-[#00ccff]/40 focus:ring-0 transition-all"
                  >
                    <option value="1000">1000 Searches / Day</option>
                    <option value="2000">2000 Searches / Day</option>
                    <option value="3000">3000 Searches / Day</option>
                    <option value="4000">4000 Searches / Day</option>
                    <option value="5000">5000 Searches / Day</option>
                    <option value="custom">Custom Limit Requested</option>
                  </select>
                </div>

                {limitDropdown === 'custom' && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    className="space-y-1.5"
                  >
                    <label className="block text-xs text-[#4a6a8a] font-semibold uppercase">Specify Custom Limit</label>
                    <input
                      type="number"
                      required
                      value={customLimit}
                      onChange={(e) => setCustomLimit(e.target.value)}
                      placeholder="e.g. 15000"
                      className="w-full bg-black/40 border border-sky-500/15 rounded-xl py-2.5 px-3 text-[#e0e6f0] placeholder-[#3a4a5a] text-xs focus:outline-none focus:border-[#00ccff]/40 focus:ring-0 transition-all"
                    />
                  </motion.div>
                )}

                <div className="space-y-1.5">
                  <label className="block text-xs text-[#4a6a8a] font-semibold uppercase">Reason for Request</label>
                  <textarea
                    required
                    rows={3}
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    placeholder="Provide detailed justification for system access..."
                    className="w-full bg-black/40 border border-sky-500/15 rounded-xl py-2.5 px-3 text-[#e0e6f0] placeholder-[#3a4a5a] text-xs focus:outline-none focus:border-[#00ccff]/40 focus:ring-0 transition-all resize-none"
                  />
                </div>

                <div className="bg-amber-500/5 border border-amber-500/20 p-3 rounded-xl flex items-start gap-2.5">
                  <AlertCircle className="h-4 w-4 text-amber-500 mt-0.5 flex-shrink-0" />
                  <p className="text-[10px] text-amber-500/80 leading-relaxed font-medium">
                    Note: Submitted requests will instantly propagate to the Admin Dashboard for review. Once approved, an active account will be generated.
                  </p>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-gradient-to-r from-blue-600 to-sky-500 hover:from-blue-500 hover:to-sky-400 text-white py-3 px-4 rounded-xl font-semibold text-xs shadow-md shadow-blue-500/10 transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  {loading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" /> Submitting Request...
                    </>
                  ) : (
                    <>
                      Submit Authorization Request <ChevronRight className="h-4 w-4" />
                    </>
                  )}
                </button>

                <div className="text-center pt-2">
                  <button
                    type="button"
                    onClick={() => setMode('login')}
                    className="text-xs text-[#708aa8] hover:text-[#00ccff] font-semibold flex items-center justify-center gap-1.5 mx-auto"
                  >
                    <CornerDownLeft className="h-3.5 w-3.5" /> Return to Login
                  </button>
                </div>
              </motion.form>
            )}

            {/* FORGOT PASSWORD MODE */}
            {mode === 'forgot-password' && (
              <motion.form
                key="forgot"
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                onSubmit={handleForgotPassword}
                className="space-y-5"
              >
                <div className="space-y-2">
                  <label className="block text-xs text-[#4a6a8a] font-semibold uppercase tracking-wider">
                    Enter Your Registered Email
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#3a5a7a]">
                      <Mail className="h-4.5 w-4.5" />
                    </div>
                    <input
                      type="email"
                      required
                      value={forgotEmail}
                      onChange={(e) => setForgotEmail(e.target.value)}
                      placeholder="investigator@osint.pro"
                      className="w-full bg-black/40 border border-sky-500/15 rounded-xl py-3 pl-11 pr-4 text-[#e0e6f0] placeholder-[#3a4a5a] focus:outline-none focus:border-[#00ccff]/40 focus:ring-1 focus:ring-[#00ccff]/30 transition-all text-sm"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-gradient-to-r from-blue-600 to-sky-500 hover:from-blue-500 hover:to-sky-400 text-white py-3.5 px-4 rounded-xl font-semibold text-sm shadow-lg shadow-blue-500/20 transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  {loading ? (
                    <>
                      <Loader2 className="h-4.5 w-4.5 animate-spin" /> Verifying Email...
                    </>
                  ) : (
                    <>
                      Generate Reset Credentials <KeyRound className="h-4.5 w-4.5" />
                    </>
                  )}
                </button>

                <div className="text-center">
                  <button
                    type="button"
                    onClick={() => setMode('login')}
                    className="text-xs text-[#708aa8] hover:text-[#00ccff] font-semibold flex items-center justify-center gap-1.5 mx-auto"
                  >
                    <CornerDownLeft className="h-3.5 w-3.5" /> Back to Login
                  </button>
                </div>
              </motion.form>
            )}

            {/* RESET PASSWORD MODE */}
            {mode === 'reset-password' && (
              <motion.form
                key="reset"
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                onSubmit={handleResetPassword}
                className="space-y-4"
              >
                <div className="space-y-1.5">
                  <label className="block text-xs text-[#4a6a8a] font-semibold uppercase">Email Address</label>
                  <input
                    type="email"
                    required
                    readOnly
                    value={forgotEmail}
                    className="w-full bg-black/60 border border-sky-500/10 rounded-xl py-2.5 px-3 text-[#4a6a8a] text-xs focus:outline-none cursor-not-allowed"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs text-[#4a6a8a] font-semibold uppercase">Security Recovery Code</label>
                  <input
                    type="text"
                    required
                    value={resetToken}
                    onChange={(e) => setResetToken(e.target.value)}
                    placeholder="Enter security token"
                    className="w-full bg-black/40 border border-sky-500/15 rounded-xl py-2.5 px-3 text-[#e0e6f0] placeholder-[#3a4a5a] text-xs focus:outline-none focus:border-[#00ccff]/40 transition-all"
                  />
                  <p className="text-[10px] text-emerald-400 font-medium">
                    * Simulated recovery code generated in server logs for testing.
                  </p>
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs text-[#4a6a8a] font-semibold uppercase">Create New Password</label>
                  <input
                    type="password"
                    required
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Enter new master password"
                    className="w-full bg-black/40 border border-sky-500/15 rounded-xl py-2.5 px-3 text-[#e0e6f0] placeholder-[#3a4a5a] text-xs focus:outline-none focus:border-[#00ccff]/40 transition-all"
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-gradient-to-r from-blue-600 to-sky-500 hover:from-blue-500 hover:to-sky-400 text-white py-3 px-4 rounded-xl font-semibold text-xs shadow-md shadow-blue-500/10 transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  {loading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" /> Restructuring Credentials...
                    </>
                  ) : (
                    <>
                      Update Credentials & Log In <ChevronRight className="h-4 w-4" />
                    </>
                  )}
                </button>
              </motion.form>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  );
}
