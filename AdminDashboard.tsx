import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Users, UserPlus, Shield, UserX, ToggleLeft, ToggleRight, Trash2, Key, Check, X, Edit2, 
  ShieldAlert, Radio, Laptop, Clock, Server, Eye, FileSpreadsheet, FileText, Settings, 
  Search, RefreshCw, ChevronRight, CheckCircle, Ban, ArrowDownToLine, Loader2, Info, Lock, Globe,
  ShieldCheck, AlertTriangle, Play, HelpCircle
} from 'lucide-react';
import { useToast } from './Toast.jsx';
import { User, AccessRequest, DeviceSession, AuditLog, SystemSettings, UserRole, UserStatus } from '../types.js';

interface AdminDashboardProps {
  token: string;
  onSwitchToSearch: () => void;
}

type AdminModule = 'users' | 'requests' | 'devices' | 'audit' | 'settings';

export default function AdminDashboard({ token, onSwitchToSearch }: AdminDashboardProps) {
  const { showToast } = useToast();
  const [activeModule, setActiveModule] = useState<AdminModule>('users');
  const [loading, setLoading] = useState(false);

  // States for Backend Data
  const [users, setUsers] = useState<User[]>([]);
  const [requests, setRequests] = useState<AccessRequest[]>([]);
  const [sessions, setSessions] = useState<DeviceSession[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [settings, setSettings] = useState<SystemSettings | null>(null);

  // UI Control States
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');

  // Modal / Form States
  const [showCreateUser, setShowCreateUser] = useState(false);
  const [newUserName, setNewUserName] = useState('');
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserPhone, setNewUserPhone] = useState('');
  const [newUserOrg, setNewUserOrg] = useState('');
  const [newUserRole, setNewUserRole] = useState<UserRole>('user');
  const [newUserLimit, setNewUserLimit] = useState(1000);
  const [newUserPass, setNewUserPass] = useState('');

  // Editing User Limit
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [editingUserLimit, setEditingUserLimit] = useState<number>(1000);

  // For request action
  const [selectedRequestId, setSelectedRequestId] = useState<string | null>(null);
  const [customRequestLimit, setCustomRequestLimit] = useState<number>(1000);

  useEffect(() => {
    fetchData();
  }, [activeModule]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const headers = { 'Authorization': `Bearer ${token}` };
      
      if (activeModule === 'users') {
        const res = await fetch('/api/admin/users', { headers });
        if (res.ok) setUsers(await res.json());
      } else if (activeModule === 'requests') {
        const res = await fetch('/api/admin/requests', { headers });
        if (res.ok) setRequests(await res.json());
      } else if (activeModule === 'devices') {
        const res = await fetch('/api/admin/sessions', { headers });
        if (res.ok) setSessions(await res.json());
      } else if (activeModule === 'audit') {
        const res = await fetch('/api/admin/audit-logs', { headers });
        if (res.ok) setAuditLogs(await res.json());
      } else if (activeModule === 'settings') {
        const res = await fetch('/api/admin/settings', { headers });
        if (res.ok) setSettings(await res.json());
      }
    } catch (err) {
      showToast('Error syncing administrative parameters from database.', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Create User
  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUserName || !newUserEmail) {
      showToast('Name and email are mandatory parameters.', 'error');
      return;
    }

    try {
      const res = await fetch('/api/admin/users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          name: newUserName,
          email: newUserEmail,
          phone: newUserPhone,
          organization: newUserOrg,
          role: newUserRole,
          dailyLimit: newUserLimit,
          password: newUserPass || undefined
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      showToast(`User account created: ${newUserEmail}`, 'success');
      setShowCreateUser(false);
      // Reset form
      setNewUserName('');
      setNewUserEmail('');
      setNewUserPhone('');
      setNewUserOrg('');
      setNewUserRole('user');
      setNewUserLimit(1000);
      setNewUserPass('');
      fetchData();
    } catch (err: any) {
      showToast(err.message || 'Failed to initialize account.', 'error');
    }
  };

  // Toggle user status
  const handleToggleUserStatus = async (user: User) => {
    const nextStatus: UserStatus = user.status === 'active' ? 'disabled' : 'active';
    try {
      const res = await fetch(`/api/admin/users/${user.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ status: nextStatus })
      });

      if (!res.ok) throw new Error();
      showToast(`Account status updated for ${user.email}`, 'success');
      fetchData();
    } catch (e) {
      showToast('Failed to modify user status.', 'error');
    }
  };

  // Save Limit Change
  const handleSaveUserLimit = async (userId: string) => {
    try {
      const res = await fetch(`/api/admin/users/${userId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ dailyLimit: editingUserLimit })
      });

      if (!res.ok) throw new Error();
      showToast('Investigator search quota restructured.', 'success');
      setEditingUserId(null);
      fetchData();
    } catch (e) {
      showToast('Failed to update query quota.', 'error');
    }
  };

  // Forced password reset
  const handleForcedPasswordReset = async (userId: string) => {
    const newPass = prompt("Enter new master password for investigator (Default: Reset123):");
    if (newPass === null) return; // cancelled

    try {
      const res = await fetch(`/api/admin/users/${userId}/reset-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ password: newPass || 'Reset123' })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      showToast(data.message, 'success');
    } catch (err: any) {
      showToast(err.message || 'Key alteration failure.', 'error');
    }
  };

  // Delete account
  const handleDeleteUser = async (user: User) => {
    if (!confirm(`Confirm absolute purge of account for: ${user.name} (${user.email})?`)) return;

    try {
      const res = await fetch(`/api/admin/users/${user.id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      showToast('Account credentials purged from database.', 'success');
      fetchData();
    } catch (err: any) {
      showToast(err.message || 'Failed to remove account.', 'error');
    }
  };

  // Force session logout
  const handleForceLogoutSession = async (sessionId: string) => {
    try {
      const res = await fetch(`/api/admin/sessions/${sessionId}/logout`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (!res.ok) throw new Error();
      showToast('Terminal session terminated successfully.', 'success');
      fetchData();
    } catch (e) {
      showToast('Terminal handshake termination failure.', 'error');
    }
  };

  // Force logout all sessions for user
  const handleForceLogoutAllUser = async (userId: string) => {
    try {
      const res = await fetch(`/api/admin/users/${userId}/logout-all`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (!res.ok) throw new Error();
      showToast('Terminated all active device sessions for this investigator.', 'success');
      fetchData();
    } catch (e) {
      showToast('Failed to disconnect user terminals.', 'error');
    }
  };

  // Resolve access request
  const handleResolveRequest = async (requestId: string, status: 'approved' | 'rejected') => {
    try {
      const limitVal = status === 'approved' ? customRequestLimit : undefined;
      const res = await fetch(`/api/admin/requests/${requestId}/action`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ status, limitAssigned: limitVal })
      });

      if (!res.ok) throw new Error();
      showToast(`Request enrollment resolving state: ${status}`, 'success');
      setSelectedRequestId(null);
      fetchData();
    } catch (e) {
      showToast('Request state updating failure.', 'error');
    }
  };

  // Save Settings
  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!settings) return;

    try {
      const res = await fetch('/api/admin/settings', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(settings)
      });

      if (!res.ok) throw new Error();
      showToast('Platform configurations updated and persistent.', 'success');
      fetchData();
    } catch (e) {
      showToast('Configuration saving failed.', 'error');
    }
  };

  // Reset daily search counters
  const handleResetSearchCounters = async () => {
    if (!confirm('Proceed with forcing administrative reset of daily transacted limits for all nodes?')) return;
    try {
      const res = await fetch('/api/admin/reset-daily-searches', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (!res.ok) throw new Error();
      showToast('Daily counters reset successfully.', 'success');
      fetchData();
    } catch (e) {
      showToast('Counter reset failed.', 'error');
    }
  };

  // Filter Users
  const filteredUsers = users.filter(u => {
    const matchesSearch = u.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          u.email.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          (u.phone && u.phone.includes(searchQuery)) ||
                          (u.organization && u.organization.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesRole = roleFilter === 'all' || u.role === roleFilter;
    const matchesStatus = statusFilter === 'all' || u.status === statusFilter;
    return matchesSearch && matchesRole && matchesStatus;
  });

  // Flat Export CSV simulation
  const exportToCSV = (dataType: string, dataArray: any[]) => {
    if (dataArray.length === 0) {
      showToast('Buffer has no elements.', 'error');
      return;
    }

    let csvContent = "data:text/csv;charset=utf-8,";
    const headers = Object.keys(dataArray[0]).join(",");
    csvContent += headers + "\r\n";

    dataArray.forEach(row => {
      const values = Object.values(row).map(v => `"${String(v).replace(/"/g, '""')}"`).join(",");
      csvContent += values + "\r\n";
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `OSINT_EXPORT_${dataType.toUpperCase()}_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast(`Compiled structured CSV for ${dataType}`, 'success');
  };

  return (
    <div className="w-full max-w-7xl mx-auto py-6 px-4 space-y-6">
      
      {/* Admin dashboard header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-[#0a1122]/90 border border-sky-500/10 rounded-2xl p-6 shadow-xl backdrop-blur-md relative overflow-hidden">
        <div className="absolute top-0 right-0 h-24 w-24 bg-sky-500/5 rounded-full blur-2xl" />
        <div>
          <h1 className="text-xl font-black text-white tracking-tight flex items-center gap-2">
            <Shield className="h-6 w-6 text-emerald-400" /> SYSTEMS SECURITY ADMINISTRATIVE CENTER
          </h1>
          <p className="text-xs text-[#4a6a8a] mt-1">
            Global governance controls, active terminals tracking, enrollment review, and deep security audit logging.
          </p>
        </div>
        
        <div className="flex flex-wrap gap-2">
          <button
            onClick={onSwitchToSearch}
            className="bg-gradient-to-r from-blue-600 to-sky-500 hover:from-blue-500 hover:to-sky-400 text-white font-extrabold text-xs uppercase tracking-wider py-2.5 px-4 rounded-xl flex items-center gap-1.5 shadow-md shadow-blue-500/10 active:translate-y-px transition-all cursor-pointer"
          >
            <Search className="h-4 w-4" /> Switch to OSINT Search Portal
          </button>
          
          <button
            onClick={fetchData}
            disabled={loading}
            className="bg-black/30 border border-sky-500/15 text-[#00ccff] hover:text-white font-semibold text-xs py-2.5 px-3.5 rounded-xl flex items-center gap-1.5 cursor-pointer transition-colors"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} /> Sync DB
          </button>
        </div>
      </div>

      {/* Modules Selector Tabs */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 bg-[#0c1428]/80 p-1.5 rounded-xl border border-sky-500/10 shadow-lg">
        <button
          onClick={() => setActiveModule('users')}
          className={`py-3.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all cursor-pointer flex items-center justify-center gap-2 ${
            activeModule === 'users'
              ? 'bg-gradient-to-r from-emerald-600 to-teal-500 text-white shadow-md'
              : 'text-[#4a6a8a] hover:text-[#c0d8f0]'
          }`}
        >
          <Users className="h-4 w-4" /> Users ({users.length})
        </button>
        <button
          onClick={() => setActiveModule('requests')}
          className={`py-3.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all cursor-pointer flex items-center justify-center gap-2 ${
            activeModule === 'requests'
              ? 'bg-gradient-to-r from-emerald-600 to-teal-500 text-white shadow-md'
              : 'text-[#4a6a8a] hover:text-[#c0d8f0]'
          }`}
        >
          <UserPlus className="h-4 w-4" /> Enrollments ({requests.filter(r => r.status==='pending').length})
        </button>
        <button
          onClick={() => setActiveModule('devices')}
          className={`py-3.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all cursor-pointer flex items-center justify-center gap-2 ${
            activeModule === 'devices'
              ? 'bg-gradient-to-r from-emerald-600 to-teal-500 text-white shadow-md'
              : 'text-[#4a6a8a] hover:text-[#c0d8f0]'
          }`}
        >
          <Laptop className="h-4 w-4" /> Active Nodes ({sessions.length})
        </button>
        <button
          onClick={() => setActiveModule('audit')}
          className={`py-3.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all cursor-pointer flex items-center justify-center gap-2 ${
            activeModule === 'audit'
              ? 'bg-gradient-to-r from-emerald-600 to-teal-500 text-white shadow-md'
              : 'text-[#4a6a8a] hover:text-[#c0d8f0]'
          }`}
        >
          <Radio className="h-4 w-4" /> Audit Logs
        </button>
        <button
          onClick={() => setActiveModule('settings')}
          className={`py-3.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all cursor-pointer col-span-2 sm:col-span-1 flex items-center justify-center gap-2 ${
            activeModule === 'settings'
              ? 'bg-gradient-to-r from-emerald-600 to-teal-500 text-white shadow-md'
              : 'text-[#4a6a8a] hover:text-[#c0d8f0]'
          }`}
        >
          <Settings className="h-4 w-4" /> Settings
        </button>
      </div>

      {/* MODULE OUTPUTS SPACE */}
      <div className="min-h-[400px]">
        <AnimatePresence mode="wait">
          
          {/* USER MANAGEMENT MODULE */}
          {activeModule === 'users' && (
            <motion.div
              key="module-users"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-4"
            >
              {/* Controls and Actions */}
              <div className="flex flex-col md:flex-row justify-between gap-4 bg-[#0c1428]/80 border border-sky-500/10 p-5 rounded-2xl shadow-xl">
                <div className="flex flex-wrap gap-2 flex-1 max-w-2xl">
                  {/* Search bar */}
                  <div className="relative flex-1 min-w-[200px]">
                    <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[#3a5a7a]" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Search accounts name, email, phone, organization..."
                      className="w-full bg-black/40 border border-sky-500/15 rounded-xl py-2.5 pl-10 pr-4 text-[#e0e6f0] placeholder-[#2a3a50] text-xs focus:outline-none focus:border-[#00ccff]/30 transition-all"
                    />
                  </div>
                  {/* Role filter */}
                  <select
                    value={roleFilter}
                    onChange={(e) => setRoleFilter(e.target.value)}
                    className="bg-black/40 border border-sky-500/15 rounded-xl py-2.5 px-3 text-[#e0e6f0] text-xs focus:outline-none cursor-pointer"
                  >
                    <option value="all">Roles: All</option>
                    <option value="admin">Administrator</option>
                    <option value="premium">Premium Investigator</option>
                    <option value="user">Standard User</option>
                  </select>
                  {/* Status filter */}
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="bg-black/40 border border-sky-500/15 rounded-xl py-2.5 px-3 text-[#e0e6f0] text-xs focus:outline-none cursor-pointer"
                  >
                    <option value="all">Status: All</option>
                    <option value="active">Active Accounts</option>
                    <option value="disabled">Disabled Accounts</option>
                  </select>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={handleResetSearchCounters}
                    className="bg-amber-500/10 border border-amber-500/30 text-amber-400 hover:bg-amber-500/20 font-semibold text-xs uppercase tracking-wider py-2.5 px-4 rounded-xl flex items-center gap-1.5 transition-all cursor-pointer"
                  >
                    <Clock className="h-4 w-4" /> Reset Counters
                  </button>
                  <button
                    onClick={() => setShowCreateUser(true)}
                    className="bg-gradient-to-r from-emerald-600 to-teal-500 text-white font-bold text-xs uppercase tracking-wider py-2.5 px-4 rounded-xl flex items-center gap-1.5 shadow-lg shadow-emerald-500/10 hover:brightness-110 transition-all cursor-pointer"
                  >
                    <UserPlus className="h-4 w-4" /> Create User Node
                  </button>
                  <button
                    onClick={() => exportToCSV('users_database', filteredUsers)}
                    className="bg-black/30 border border-sky-500/15 text-[#c0d8f0] hover:text-white font-semibold text-xs py-2.5 px-3.5 rounded-xl flex items-center gap-1.5 cursor-pointer transition-colors"
                  >
                    <ArrowDownToLine className="h-4 w-4" /> CSV Export
                  </button>
                </div>
              </div>

              {/* Create User Form Overlay Modal */}
              <AnimatePresence>
                {showCreateUser && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="bg-black/60 backdrop-blur-md fixed inset-0 z-50 flex items-center justify-center p-4"
                  >
                    <motion.div
                      initial={{ scale: 0.95, y: 15 }}
                      animate={{ scale: 1, y: 0 }}
                      exit={{ scale: 0.95, y: 15 }}
                      className="bg-[#0c1428] border border-sky-500/15 rounded-3xl max-w-lg w-full overflow-hidden shadow-2xl relative p-6 space-y-4"
                    >
                      <div className="flex justify-between items-center border-b border-sky-500/10 pb-3">
                        <h3 className="text-sm font-bold text-white uppercase tracking-wider">Initialize Investigator Node</h3>
                        <button onClick={() => setShowCreateUser(false)} className="text-[#4a6a8a] hover:text-white">
                          <X className="h-4 w-4" />
                        </button>
                      </div>

                      <form onSubmit={handleCreateUser} className="space-y-4 text-xs">
                        <div className="grid grid-cols-2 gap-3">
                          <div className="space-y-1">
                            <label className="text-[#4a6a8a] uppercase font-bold">Investigator Name</label>
                            <input
                              type="text"
                              required
                              value={newUserName}
                              onChange={(e) => setNewUserName(e.target.value)}
                              placeholder="e.g. Rahul Patil"
                              className="w-full bg-black/40 border border-sky-500/15 rounded-xl py-2 px-3 text-white focus:outline-none focus:border-[#00ccff]/30 transition-all"
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="text-[#4a6a8a] uppercase font-bold">Email Address</label>
                            <input
                              type="email"
                              required
                              value={newUserEmail}
                              onChange={(e) => setNewUserEmail(e.target.value)}
                              placeholder="e.g. rahul@osint.pro"
                              className="w-full bg-black/40 border border-sky-500/15 rounded-xl py-2 px-3 text-white focus:outline-none focus:border-[#00ccff]/30 transition-all"
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                          <div className="space-y-1">
                            <label className="text-[#4a6a8a] uppercase font-bold">Phone Connection</label>
                            <input
                              type="text"
                              value={newUserPhone}
                              onChange={(e) => setNewUserPhone(e.target.value)}
                              placeholder="e.g. +919876543210"
                              className="w-full bg-black/40 border border-sky-500/15 rounded-xl py-2 px-3 text-white focus:outline-none focus:border-[#00ccff]/30 transition-all"
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="text-[#4a6a8a] uppercase font-bold">Organization Affiliation</label>
                            <input
                              type="text"
                              value={newUserOrg}
                              onChange={(e) => setNewUserOrg(e.target.value)}
                              placeholder="e.g. Cyber Forensics Lab"
                              className="w-full bg-black/40 border border-sky-500/15 rounded-xl py-2 px-3 text-white focus:outline-none focus:border-[#00ccff]/30 transition-all"
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                          <div className="space-y-1">
                            <label className="text-[#4a6a8a] uppercase font-bold">Terminal Role Assignment</label>
                            <select
                              value={newUserRole}
                              onChange={(e) => setNewUserRole(e.target.value as UserRole)}
                              className="w-full bg-black/40 border border-sky-500/15 rounded-xl py-2 px-2 text-white focus:outline-none"
                            >
                              <option value="user">Standard User</option>
                              <option value="premium">Premium Investigator</option>
                              <option value="admin">Administrator Authority</option>
                            </select>
                          </div>
                          <div className="space-y-1">
                            <label className="text-[#4a6a8a] uppercase font-bold">Daily Query Quota</label>
                            <input
                              type="number"
                              value={newUserLimit}
                              onChange={(e) => setNewUserLimit(parseInt(e.target.value) || 1000)}
                              className="w-full bg-black/40 border border-sky-500/15 rounded-xl py-2 px-3 text-white focus:outline-none"
                            />
                          </div>
                        </div>

                        <div className="space-y-1">
                          <label className="text-[#4a6a8a] uppercase font-bold">Master password</label>
                          <input
                            type="text"
                            value={newUserPass}
                            onChange={(e) => setNewUserPass(e.target.value)}
                            placeholder="Defaults to: OSINTPassword123"
                            className="w-full bg-black/40 border border-sky-500/15 rounded-xl py-2 px-3 text-white focus:outline-none"
                          />
                        </div>

                        <button
                          type="submit"
                          className="w-full bg-gradient-to-r from-emerald-600 to-teal-500 text-white font-bold py-3.5 rounded-xl uppercase tracking-wider"
                        >
                          Initialize Authorized node
                        </button>
                      </form>
                    </motion.div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Users Grid */}
              <div className="bg-[#0c1428]/80 border border-sky-500/10 rounded-2xl overflow-hidden shadow-xl">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-slate-900/50 border-b border-sky-500/10 text-[#4a6a8a] font-bold uppercase tracking-wider">
                        <th className="py-3 px-4">Investigator Node</th>
                        <th className="py-3 px-4">Organization</th>
                        <th className="py-3 px-4">Role</th>
                        <th className="py-3 px-4">Daily quota consumed</th>
                        <th className="py-3 px-4">Status</th>
                        <th className="py-3 px-4 text-right">Administrative Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-sky-500/5">
                      {filteredUsers.length > 0 ? (
                        filteredUsers.map((u) => (
                          <tr key={u.id} className="hover:bg-sky-500/3 transition-colors">
                            <td className="py-3 px-4">
                              <div className="font-semibold text-white">{u.name}</div>
                              <div className="text-[10px] text-[#4a6a8a] mt-0.5">{u.email}</div>
                              {u.phone && <div className="text-[9px] text-[#3a5a7a] font-mono mt-0.5">{u.phone}</div>}
                            </td>
                            <td className="py-3 px-4 text-[#c0d8f0]">{u.organization || 'Independent'}</td>
                            <td className="py-3 px-4">
                              <span className={`font-extrabold text-[10px] uppercase px-1.5 py-0.5 rounded ${
                                u.role === 'admin' 
                                  ? 'bg-emerald-500/10 text-emerald-400' 
                                  : u.role === 'premium'
                                  ? 'bg-sky-500/10 text-[#00ccff]'
                                  : 'bg-slate-500/10 text-slate-400'
                              }`}>
                                {u.role}
                              </span>
                            </td>
                            <td className="py-3 px-4">
                              {editingUserId === u.id ? (
                                <div className="flex items-center gap-1.5">
                                  <input
                                    type="number"
                                    value={editingUserLimit}
                                    onChange={(e) => setEditingUserLimit(parseInt(e.target.value) || 1000)}
                                    className="w-20 bg-black border border-[#00bfff]/30 rounded px-1.5 py-0.5 text-center font-mono text-white"
                                  />
                                  <button onClick={() => handleSaveUserLimit(u.id)} className="text-emerald-400">
                                    <Check className="h-4.5 w-4.5" />
                                  </button>
                                  <button onClick={() => setEditingUserId(null)} className="text-[#4a6a8a]">
                                    <X className="h-4.5 w-4.5" />
                                  </button>
                                </div>
                              ) : (
                                <div className="flex items-center gap-2">
                                  <span className="font-mono text-white">
                                    {u.searchesToday} / <strong className="text-sky-300 font-extrabold">{u.dailyLimit}</strong>
                                  </span>
                                  <button
                                    onClick={() => {
                                      setEditingUserId(u.id);
                                      setEditingUserLimit(u.dailyLimit);
                                    }}
                                    className="text-[#4a6a8a] hover:text-[#00ccff] p-0.5 rounded"
                                  >
                                    <Edit2 className="h-3 w-3" />
                                  </button>
                                </div>
                              )}
                            </td>
                            <td className="py-3 px-4">
                              <span className={`font-bold uppercase text-[9px] ${u.status === 'active' ? 'text-emerald-400' : 'text-rose-400'}`}>
                                ● {u.status}
                              </span>
                            </td>
                            <td className="py-3 px-4 text-right">
                              <div className="flex justify-end gap-1">
                                {/* Toggle Active/Disabled */}
                                <button
                                  onClick={() => handleToggleUserStatus(u)}
                                  title={u.status === 'active' ? 'Disable Account' : 'Enable Account'}
                                  className="p-1.5 rounded-lg border border-sky-500/10 hover:border-sky-500/20 text-[#c0d8f0] transition-all hover:bg-white/3"
                                >
                                  {u.status === 'active' ? <Ban className="h-3.5 w-3.5 text-amber-500" /> : <CheckCircle className="h-3.5 w-3.5 text-emerald-400" />}
                                </button>
                                {/* Force Change Password */}
                                <button
                                  onClick={() => handleForcedPasswordReset(u.id)}
                                  title="Reset Password"
                                  className="p-1.5 rounded-lg border border-sky-500/10 hover:border-sky-500/20 text-[#00ccff] transition-all hover:bg-white/3"
                                >
                                  <Key className="h-3.5 w-3.5" />
                                </button>
                                {/* Terminate active connections */}
                                <button
                                  onClick={() => handleForceLogoutAllUser(u.id)}
                                  title="Disconnect Active Terminals"
                                  className="p-1.5 rounded-lg border border-sky-500/10 hover:border-sky-500/20 text-sky-400 transition-all hover:bg-white/3"
                                >
                                  <Laptop className="h-3.5 w-3.5 text-sky-300" />
                                </button>
                                {/* Delete Account */}
                                <button
                                  onClick={() => handleDeleteUser(u)}
                                  title="Purge Account credentials"
                                  className="p-1.5 rounded-lg border border-sky-500/10 hover:border-sky-500/20 hover:bg-rose-500/10 text-[#4a6a8a] hover:text-rose-400 transition-all"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={6} className="text-center py-10 text-[#4a6a8a]">
                            No matches found for user search parameters.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </motion.div>
          )}

          {/* REQUEST ENROLLMENTS MODULE */}
          {activeModule === 'requests' && (
            <motion.div
              key="module-requests"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-4"
            >
              <div className="flex justify-between items-center bg-[#0c1428]/80 border border-sky-500/10 p-5 rounded-2xl shadow-xl">
                <div>
                  <h3 className="text-sm font-bold text-white uppercase tracking-wider">Investigator Enrollment Queue</h3>
                  <p className="text-[11px] text-[#4a6a8a] mt-0.5">Approve, deny, or customize limits before generating terminal access keys.</p>
                </div>
                <button
                  onClick={() => exportToCSV('enrollment_requests', requests)}
                  className="bg-black/30 border border-sky-500/15 text-[#c0d8f0] hover:text-white font-semibold text-xs py-2 px-3 rounded-lg flex items-center gap-1 cursor-pointer"
                >
                  <ArrowDownToLine className="h-4 w-4" /> Export CSV
                </button>
              </div>

              {requests.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {requests.map((req) => {
                    const isPending = req.status === 'pending';
                    return (
                      <motion.div
                        key={req.id}
                        layout
                        className={`bg-[#0c1428]/80 border rounded-2xl p-5 shadow-lg relative overflow-hidden flex flex-col justify-between ${
                          req.status === 'approved' 
                            ? 'border-emerald-500/25' 
                            : req.status === 'rejected'
                            ? 'border-rose-500/25'
                            : 'border-sky-500/10'
                        }`}
                      >
                        <div className="space-y-3">
                          <div className="flex justify-between items-start">
                            <div>
                              <h4 className="text-sm font-bold text-white">{req.name}</h4>
                              <p className="text-[10px] text-[#4a6a8a] mt-0.5">{req.email} · {req.phone}</p>
                            </div>
                            <span className={`text-[9px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded ${
                              req.status === 'approved' 
                                ? 'bg-emerald-500/10 text-emerald-400' 
                                : req.status === 'rejected'
                                ? 'bg-rose-500/10 text-rose-400'
                                : 'bg-amber-500/10 text-amber-400'
                            }`}>
                              ● {req.status}
                            </span>
                          </div>

                          <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-[11px] bg-black/25 p-3 rounded-xl border border-sky-500/5">
                            <div>
                              <span className="text-[#4a6a8a] block uppercase text-[9px] font-bold">Organization</span>
                              <span className="text-white font-semibold">{req.organization}</span>
                            </div>
                            <div>
                              <span className="text-[#4a6a8a] block uppercase text-[9px] font-bold">Limit Requested</span>
                              <span className="text-[#00ccff] font-bold font-mono">
                                {req.limitRequested === 'custom' ? `${req.customLimit} (Custom)` : `${req.limitRequested} Qs`}
                              </span>
                            </div>
                            <div className="col-span-2 pt-1 border-t border-sky-500/5">
                              <span className="text-[#4a6a8a] block uppercase text-[9px] font-bold">Justification Reason</span>
                              <span className="text-[#c0d8f0] italic leading-relaxed block mt-0.5">"{req.reason}"</span>
                            </div>
                          </div>
                        </div>

                        {isPending && (
                          <div className="mt-5 pt-3 border-t border-sky-500/5 flex items-center justify-between gap-4">
                            {selectedRequestId === req.id ? (
                              <div className="flex items-center gap-2 w-full">
                                <div className="space-y-1 flex-1">
                                  <label className="text-[9px] text-[#4a6a8a] uppercase font-bold block">Assigned Limit</label>
                                  <input
                                    type="number"
                                    value={customRequestLimit}
                                    onChange={(e) => setCustomRequestLimit(parseInt(e.target.value) || 1000)}
                                    className="w-full bg-black border border-[#00bfff]/35 rounded px-2 py-1 font-mono text-white text-xs text-center"
                                  />
                                </div>
                                <div className="flex gap-1.5 pt-4">
                                  <button
                                    onClick={() => handleResolveRequest(req.id, 'approved')}
                                    className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs uppercase tracking-wider py-1.5 px-3 rounded-lg"
                                  >
                                    Confirm Approve
                                  </button>
                                  <button
                                    onClick={() => setSelectedRequestId(null)}
                                    className="bg-black/30 border border-sky-500/10 text-[#4a6a8a] font-bold text-xs uppercase tracking-wider py-1.5 px-3 rounded-lg"
                                  >
                                    Cancel
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <>
                                <span className="text-[10px] text-[#4a6a8a]">{new Date(req.timestamp).toLocaleDateString()}</span>
                                <div className="flex gap-1.5">
                                  <button
                                    onClick={() => {
                                      setSelectedRequestId(req.id);
                                      setCustomRequestLimit(req.limitRequested === 'custom' ? req.customLimit || 1000 : parseInt(req.limitRequested) || 1000);
                                    }}
                                    className="bg-emerald-600/10 border border-emerald-500/25 hover:bg-emerald-600/20 text-emerald-400 font-extrabold text-[10px] uppercase tracking-wider py-1.5 px-4 rounded-xl cursor-pointer"
                                  >
                                    Approve & Create Account
                                  </button>
                                  <button
                                    onClick={() => handleResolveRequest(req.id, 'rejected')}
                                    className="bg-rose-500/10 border border-rose-500/25 hover:bg-rose-500/20 text-rose-400 font-extrabold text-[10px] uppercase tracking-wider py-1.5 px-4 rounded-xl cursor-pointer"
                                  >
                                    Deny
                                  </button>
                                </div>
                              </>
                            )}
                          </div>
                        )}

                        {!isPending && (
                          <div className="mt-4 pt-2.5 border-t border-sky-500/5 flex justify-between items-center text-[10px] text-[#4a6a8a]">
                            <span>Closed: {new Date(req.timestamp).toLocaleDateString()}</span>
                            {req.status === 'approved' && (
                              <span>Assigned Limit: <strong className="text-emerald-400 font-mono font-bold">{req.limitAssigned}</strong></span>
                            )}
                          </div>
                        )}

                      </motion.div>
                    );
                  })}
                </div>
              ) : (
                <div className="bg-[#0c1428]/80 border border-sky-500/10 rounded-2xl p-10 text-center text-[#4a6a8a]">
                  Enrollments database is clean. No registrations pending administrator validation.
                </div>
              )}
            </motion.div>
          )}

          {/* ACTIVE DEVICES & TERMINAL SESSIONS */}
          {activeModule === 'devices' && (
            <motion.div
              key="module-devices"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-4"
            >
              <div className="flex justify-between items-center bg-[#0c1428]/80 border border-sky-500/10 p-5 rounded-2xl shadow-xl">
                <div>
                  <h3 className="text-sm font-bold text-white uppercase tracking-wider">Active Device sessions</h3>
                  <p className="text-[11px] text-[#4a6a8a] mt-0.5">Real-time telemetry and programmatic device fingerprint tracking.</p>
                </div>
                <button
                  onClick={() => exportToCSV('active_sessions', sessions)}
                  className="bg-black/30 border border-sky-500/15 text-[#c0d8f0] hover:text-white font-semibold text-xs py-2 px-3 rounded-lg flex items-center gap-1 cursor-pointer"
                >
                  <ArrowDownToLine className="h-4 w-4" /> Export CSV
                </button>
              </div>

              {sessions.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {sessions.map((s) => (
                    <div key={s.id} className="bg-[#0c1428]/80 border border-sky-500/10 rounded-2xl p-5 shadow-lg relative overflow-hidden flex flex-col justify-between">
                      <div className="space-y-3.5">
                        <div className="flex justify-between items-start">
                          <div className="flex items-center gap-2">
                            <Laptop className="h-5 w-5 text-[#00ccff]" />
                            <div>
                              <h4 className="text-xs font-extrabold text-white uppercase tracking-wider">{s.deviceName}</h4>
                              <p className="text-[10px] text-sky-400 font-semibold">{s.email}</p>
                            </div>
                          </div>
                          <span className="bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded text-[9px] font-bold text-emerald-400 uppercase tracking-widest animate-pulse">
                            Active Node
                          </span>
                        </div>

                        <div className="space-y-1.5 text-[11px] font-mono bg-black/25 p-3 rounded-xl border border-sky-500/5">
                          <div className="flex justify-between">
                            <span className="text-[#4a6a8a]">IP Target:</span>
                            <span className="text-[#c0d8f0]">{s.ip}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-[#4a6a8a]">Browser/OS:</span>
                            <span className="text-[#c0d8f0]">{s.browser} on {s.os}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-[#4a6a8a]">Geo Tracking:</span>
                            <span className="text-[#c0d8f0]">{s.location}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-[#4a6a8a]">Authorized:</span>
                            <span className="text-[#c0d8f0]">{new Date(s.loginTime).toLocaleTimeString()}</span>
                          </div>
                        </div>
                      </div>

                      <div className="mt-5 pt-3 border-t border-sky-500/5 flex justify-between items-center">
                        <span className="text-[9px] text-[#4a6a8a] font-bold uppercase">Id: {s.id}</span>
                        <button
                          onClick={() => handleForceLogoutSession(s.id)}
                          className="bg-rose-500/10 border border-rose-500/25 hover:bg-rose-500/20 text-rose-400 font-extrabold text-[10px] uppercase tracking-wider py-1.5 px-4 rounded-xl cursor-pointer transition-all"
                        >
                          Revoke authorization
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="bg-[#0c1428]/80 border border-sky-500/10 rounded-2xl p-10 text-center text-[#4a6a8a]">
                  No active telemetry signals found.
                </div>
              )}
            </motion.div>
          )}

          {/* AUDIT LOGGING MODULE */}
          {activeModule === 'audit' && (
            <motion.div
              key="module-audit"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-4"
            >
              <div className="flex justify-between items-center bg-[#0c1428]/80 border border-sky-500/10 p-5 rounded-2xl shadow-xl">
                <div>
                  <h3 className="text-sm font-bold text-white uppercase tracking-wider">Enterprise Security Audit Logs</h3>
                  <p className="text-[11px] text-[#4a6a8a] mt-0.5">Read-only immutable sequence logging all transacted intelligence operations.</p>
                </div>
                <button
                  onClick={() => exportToCSV('audit_security_logs', auditLogs)}
                  className="bg-black/30 border border-sky-500/15 text-[#c0d8f0] hover:text-white font-semibold text-xs py-2 px-3 rounded-lg flex items-center gap-1 cursor-pointer"
                >
                  <ArrowDownToLine className="h-4 w-4" /> Export logs CSV
                </button>
              </div>

              <div className="bg-[#0c1428]/80 border border-sky-500/10 rounded-2xl overflow-hidden shadow-xl">
                <div className="max-h-[500px] overflow-y-auto">
                  <table className="w-full text-left border-collapse text-xs font-mono">
                    <thead>
                      <tr className="bg-slate-900/50 border-b border-sky-500/10 text-[#4a6a8a] font-bold uppercase tracking-wider">
                        <th className="py-3 px-4">Event Id</th>
                        <th className="py-3 px-4">Timestamp</th>
                        <th className="py-3 px-4">Event Type</th>
                        <th className="py-3 px-4">Sign-In node</th>
                        <th className="py-3 px-4">Action Logging Description</th>
                        <th className="py-3 px-4">IP Target</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-sky-500/5 text-[#c0d8f0]">
                      {auditLogs.length > 0 ? (
                        auditLogs.map((log) => {
                          let typeBadge = 'bg-slate-500/10 text-slate-400 border border-slate-500/15';
                          if (log.type === 'login') typeBadge = 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/15';
                          else if (log.type === 'failed_login') typeBadge = 'bg-rose-500/10 text-rose-400 border border-rose-500/15';
                          else if (log.type === 'security') typeBadge = 'bg-purple-500/10 text-purple-400 border border-purple-500/15';
                          else if (log.type === 'admin_action') typeBadge = 'bg-blue-500/10 text-[#00ccff] border border-sky-500/15';
                          else if (log.type === 'search') typeBadge = 'bg-amber-500/10 text-amber-400 border border-amber-500/15';

                          return (
                            <tr key={log.id} className="hover:bg-white/1 transition-colors">
                              <td className="py-2.5 px-4 text-[10px] text-sky-400">{log.id}</td>
                              <td className="py-2.5 px-4 text-[10px] text-slate-500">
                                {new Date(log.timestamp).toISOString().replace('T', ' ').slice(0, 19)}
                              </td>
                              <td className="py-2.5 px-4">
                                <span className={`text-[9px] font-bold uppercase px-1.5 py-0.5 rounded ${typeBadge}`}>
                                  {log.type}
                                </span>
                              </td>
                              <td className="py-2.5 px-4 text-[#a0b8d0]">{log.email}</td>
                              <td className="py-2.5 px-4 max-w-sm truncate text-white" title={log.description}>
                                {log.description}
                                {log.details && <span className="text-[10px] text-[#4a6a8a] block truncate font-medium">{log.details}</span>}
                              </td>
                              <td className="py-2.5 px-4 text-slate-500 text-[10px]">{log.ip}</td>
                            </tr>
                          );
                        })
                      ) : (
                        <tr>
                          <td colSpan={6} className="text-center py-10 text-[#4a6a8a]">
                            No immutable security audit records logged.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </motion.div>
          )}

          {/* PLATFORM CONFIGURATION MODULE */}
          {activeModule === 'settings' && settings && (
            <motion.div
              key="module-settings"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="bg-[#0c1428]/80 border border-sky-500/10 rounded-2xl p-6 shadow-xl max-w-2xl mx-auto"
            >
              <div className="border-b border-sky-500/10 pb-4 mb-6">
                <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                  <Settings className="h-5 w-5 text-emerald-400" /> SYSTEM GATEWAY CONFIGURATION
                </h3>
                <p className="text-[11px] text-[#4a6a8a] mt-0.5">Tweak rate-limiting layers, active fingerprint thresholds, and login challenges.</p>
              </div>

              <form onSubmit={handleSaveSettings} className="space-y-5 text-xs">
                
                {/* App Name */}
                <div className="space-y-1.5">
                  <label className="text-[#4a6a8a] font-bold uppercase">System Branding Name</label>
                  <input
                    type="text"
                    value={settings.appName}
                    onChange={(e) => setSettings({ ...settings, appName: e.target.value })}
                    className="w-full bg-black/40 border border-sky-500/15 rounded-xl py-2.5 px-3.5 text-white text-xs focus:outline-none focus:border-[#00ccff]/30 transition-all"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  {/* Session Timeout */}
                  <div className="space-y-1.5">
                    <label className="text-[#4a6a8a] font-bold uppercase">Session expiration Inactivity (Mins)</label>
                    <input
                      type="number"
                      value={settings.sessionTimeoutMinutes}
                      onChange={(e) => setSettings({ ...settings, sessionTimeoutMinutes: parseInt(e.target.value) || 30 })}
                      className="w-full bg-black/40 border border-sky-500/15 rounded-xl py-2.5 px-3.5 text-white text-xs focus:outline-none"
                    />
                  </div>

                  {/* Max Devices per user */}
                  <div className="space-y-1.5">
                    <label className="text-[#4a6a8a] font-bold uppercase">Max Active devices per User</label>
                    <input
                      type="number"
                      value={settings.maxDevicesPerUser}
                      onChange={(e) => setSettings({ ...settings, maxDevicesPerUser: parseInt(e.target.value) || 3 })}
                      className="w-full bg-black/40 border border-sky-500/15 rounded-xl py-2.5 px-3.5 text-white text-xs focus:outline-none"
                    />
                  </div>
                </div>

                <div className="space-y-4 pt-3 border-t border-sky-500/5">
                  {/* Captcha Toggle */}
                  <div className="flex justify-between items-center">
                    <div>
                      <h4 className="text-xs font-bold text-white uppercase tracking-wider">CAPTCHA verification required</h4>
                      <p className="text-[10px] text-[#4a6a8a] mt-0.5">Force all login handshakes to clear mathematical CAPTCHA.</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setSettings({ ...settings, captchaEnabled: !settings.captchaEnabled })}
                      className="text-sky-400 focus:outline-none"
                    >
                      {settings.captchaEnabled ? (
                        <ToggleRight className="h-10 w-10 text-emerald-400" />
                      ) : (
                        <ToggleLeft className="h-10 w-10 text-[#4a6a8a]" />
                      )}
                    </button>
                  </div>

                  {/* Registration Allow */}
                  <div className="flex justify-between items-center">
                    <div>
                      <h4 className="text-xs font-bold text-white uppercase tracking-wider">Allow Terminal Registration</h4>
                      <p className="text-[10px] text-[#4a6a8a] mt-0.5">Allow public investigators to request terminal access keys.</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setSettings({ ...settings, allowSelfRegistration: !settings.allowSelfRegistration })}
                      className="text-sky-400 focus:outline-none"
                    >
                      {settings.allowSelfRegistration ? (
                        <ToggleRight className="h-10 w-10 text-emerald-400" />
                      ) : (
                        <ToggleLeft className="h-10 w-10 text-[#4a6a8a]" />
                      )}
                    </button>
                  </div>
                </div>

                <div className="pt-4 border-t border-sky-500/10 flex justify-end">
                  <button
                    type="submit"
                    className="bg-gradient-to-r from-emerald-600 to-teal-500 text-white font-bold py-2.5 px-6 rounded-xl uppercase tracking-wider shadow-lg shadow-emerald-500/10 transition-all cursor-pointer"
                  >
                    Save configurations
                  </button>
                </div>
              </form>
            </motion.div>
          )}

        </AnimatePresence>
      </div>

    </div>
  );
}
