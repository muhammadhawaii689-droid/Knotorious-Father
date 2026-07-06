import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ToastProvider, useToast } from './components/Toast.jsx';
import PublicAuth from './components/PublicAuth.jsx';
import SearchDashboard from './components/SearchDashboard.jsx';
import AdminDashboard from './components/AdminDashboard.jsx';
import { User, DeviceSession } from './types.js';
import { ShieldCheck, Database, LayoutDashboard, Search, KeyRound } from 'lucide-react';

function RootApp() {
  const { showToast } = useToast();
  
  // App Global Auth State
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<DeviceSession | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [sessionExpired, setSessionExpired] = useState(false);
  
  // Active Admin View State (allows admin to toggle search vs admin)
  const [adminView, setAdminView] = useState<'search' | 'admin'>('search');

  // Loading state during token validation on startup
  const [initializing, setInitializing] = useState(true);

  // Load session from localStorage on start
  useEffect(() => {
    const cachedToken = localStorage.getItem('osint_auth_token');
    const cachedUser = localStorage.getItem('osint_auth_user');
    const cachedSession = localStorage.getItem('osint_auth_session');

    if (cachedToken && cachedUser && cachedSession) {
      // Validate cached session against server
      validateSession(cachedToken, JSON.parse(cachedUser), JSON.parse(cachedSession));
    } else {
      setInitializing(false);
    }
  }, []);

  const validateSession = async (tkn: string, usr: User, sess: DeviceSession) => {
    try {
      const res = await fetch('/api/auth/me', {
        headers: { 'Authorization': `Bearer ${tkn}` }
      });
      const data = await res.json();

      if (res.ok) {
        setUser(data.user);
        setSession(data.session);
        setToken(tkn);
        // Default admin to the admin dashboard panel
        if (data.user.role === 'admin') {
          setAdminView('admin');
        } else {
          setAdminView('search');
        }
      } else {
        // Token stale or expired
        handleLogout(data.isExpired);
      }
    } catch (e) {
      // Offline fallback: keep cached for convenience, or clear safely
      setUser(usr);
      setSession(sess);
      setToken(tkn);
      if (usr.role === 'admin') setAdminView('admin');
    } finally {
      setInitializing(false);
    }
  };

  const handleAuthSuccess = (usr: User, sess: DeviceSession, tkn: string) => {
    setUser(usr);
    setSession(sess);
    setToken(tkn);
    setSessionExpired(false);

    localStorage.setItem('osint_auth_token', tkn);
    localStorage.setItem('osint_auth_user', JSON.stringify(usr));
    localStorage.setItem('osint_auth_session', JSON.stringify(sess));

    if (usr.role === 'admin') {
      setAdminView('admin');
    } else {
      setAdminView('search');
    }
  };

  const handleLogout = async (expired: boolean = false) => {
    if (token && !expired) {
      try {
        await fetch('/api/auth/logout', {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${token}` }
        });
      } catch (e) {
        console.error('Logout API failure', e);
      }
    }

    setUser(null);
    setSession(null);
    setToken(null);
    setAdminView('search');
    
    localStorage.removeItem('osint_auth_token');
    localStorage.removeItem('osint_auth_user');
    localStorage.removeItem('osint_auth_session');

    if (expired) {
      setSessionExpired(true);
      showToast('Programmatic Inactivity Session Timeout Triggered.', 'error');
    } else {
      showToast('Securely disconnected from intelligence networks.', 'success');
    }
  };

  if (initializing) {
    return (
      <div className="min-h-screen bg-[#0a0e1a] flex flex-col justify-center items-center">
        {/* Animated matrix loading state */}
        <div className="absolute inset-0 bg-[linear-gradient(rgba(0,180,255,0.015)_1px,transparent_1px),linear-gradient(90deg,rgba(0,180,255,0.015)_1px,transparent_1px)] bg-[size:40px_40px] pointer-events-none" />
        <div className="relative text-center space-y-4">
          <div className="inline-flex h-16 w-16 rounded-2xl bg-gradient-to-br from-blue-600 to-sky-400 items-center justify-center font-black text-2xl text-white shadow-lg shadow-sky-500/20 animate-pulse">
            OI
          </div>
          <h2 className="text-sm font-bold font-mono tracking-widest text-[#00ccff] uppercase">SYSTEM LOADING...</h2>
          <p className="text-xs text-[#4a6a8a] max-w-xs leading-relaxed uppercase">
            Establishing encrypted SSL tunnel to OSINT nodes...
          </p>
        </div>
      </div>
    );
  }

  const isUserAdmin = user?.role === 'admin';

  return (
    <div className="min-h-screen bg-[#060a14] text-[#e0e6f0] selection:bg-[#00ccff]/25 selection:text-white flex flex-col relative overflow-x-hidden">
      
      {/* Immersive Background Canvas */}
      <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
        {/* Ambient grids */}
        <div className="absolute inset-0 bg-[linear-gradient(rgba(0,180,255,0.01)_1px,transparent_1px),linear-gradient(90deg,rgba(0,180,255,0.01)_1px,transparent_1px)] bg-[size:50px_50px]" />
        
        {/* Cyber glowing blobs */}
        <div className="absolute top-[-10%] left-[-10%] w-[60%] h-[50%] rounded-full bg-blue-500/5 blur-[120px] animate-pulse" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[60%] h-[50%] rounded-full bg-cyan-500/3 blur-[120px] animate-pulse" />
      </div>

      {/* Global Navbar */}
      <header className="relative z-10 bg-[#0a0f1d]/80 backdrop-blur-md border-b border-sky-500/10 px-6 py-4 flex items-center justify-between shadow-lg shadow-black/20">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 bg-gradient-to-br from-blue-600 to-sky-400 text-white font-black text-lg flex items-center justify-center rounded-xl shadow-md shadow-sky-500/10">
            OI
          </div>
          <div>
            <h1 className="text-md font-bold tracking-tight text-white flex items-center gap-1.5">
              OSINT INVESTIGATION PORTAL <span className="text-[9px] bg-sky-500/10 border border-sky-500/30 px-1.5 py-0.5 rounded text-sky-400 font-bold uppercase tracking-wider">v2.4</span>
            </h1>
            <p className="text-[10px] text-[#4a6a8a] font-medium tracking-wider uppercase">SECURED THREAT INTELLIGENCE ACCESS</p>
          </div>
        </div>

        {/* Admin Navigation toggles */}
        {user && isUserAdmin && (
          <div className="hidden sm:flex bg-black/40 p-1 rounded-xl border border-sky-500/10">
            <button
              onClick={() => setAdminView('search')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all cursor-pointer ${
                adminView === 'search'
                  ? 'bg-gradient-to-r from-blue-600 to-sky-500 text-white shadow-md'
                  : 'text-[#4a6a8a] hover:text-[#c0d8f0]'
              }`}
            >
              <Search className="h-3.5 w-3.5" /> Search Portal
            </button>
            <button
              onClick={() => setAdminView('admin')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all cursor-pointer ${
                adminView === 'admin'
                  ? 'bg-gradient-to-r from-blue-600 to-sky-500 text-white shadow-md'
                  : 'text-[#4a6a8a] hover:text-[#c0d8f0]'
              }`}
            >
              <LayoutDashboard className="h-3.5 w-3.5" /> Admin Panel
            </button>
          </div>
        )}

        {/* Session Signal indicators */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 bg-[#66dd88]/5 border border-[#66dd88]/20 px-3 py-1.5 rounded-full text-[11px] text-[#66dd88] font-semibold tracking-wide">
            <span className="h-1.5 w-1.5 bg-[#66dd88] rounded-full animate-ping" />
            <span>Encrypted Tunnel</span>
          </div>
        </div>
      </header>

      {/* Main Container Views Router */}
      <main className="flex-1 relative z-10">
        <AnimatePresence mode="wait">
          {!user ? (
            <motion.div
              key="auth"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              className="py-6"
            >
              <PublicAuth
                onAuthSuccess={handleAuthSuccess}
                sessionExpired={sessionExpired}
                clearSessionExpired={() => setSessionExpired(false)}
              />
            </motion.div>
          ) : isUserAdmin && adminView === 'admin' ? (
            <motion.div
              key="admin"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <AdminDashboard 
                token={token!} 
                onSwitchToSearch={() => setAdminView('search')} 
              />
            </motion.div>
          ) : (
            <motion.div
              key="search-dashboard"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <SearchDashboard
                user={user}
                token={token!}
                onLogout={() => handleLogout(false)}
                isAdmin={isUserAdmin}
                onSwitchToAdmin={() => setAdminView('admin')}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Corporate footer footer */}
      <footer className="relative z-10 border-t border-sky-500/10 py-6 px-8 bg-[#040810]/60 text-center text-xs text-[#2a4a6c]">
        <div className="flex flex-col sm:flex-row justify-between items-center max-w-7xl mx-auto gap-4">
          <p>© 2026 OSINT INVESTIGATION SEARCH & Secure Portal. All rights reserved.</p>
          <div className="flex items-center gap-4 text-[11px]">
            <span className="flex items-center gap-1"><ShieldCheck className="h-4 w-4 text-emerald-400" /> SSL SECURE 256-BIT</span>
            <span className="text-[#3a5a7a] font-bold">●</span>
            <span className="text-[#00ccff] font-semibold">ROLE-BASED AUTHORIZATION ENABLED</span>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default function App() {
  return (
    <ToastProvider>
      <RootApp />
    </ToastProvider>
  );
}
