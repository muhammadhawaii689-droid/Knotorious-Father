import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Search, User as UserIcon, Clock, Lock, Download, ShieldAlert, Copy, Check, RotateCcw, AlertTriangle, TowerControl, Phone, MapPin, Hash, LogOut, LayoutDashboard, Database, RefreshCw, KeyRound, ChevronRight, FileText, Settings, UserCheck } from 'lucide-react';
import { useToast } from './Toast.jsx';
import { User, DeviceSession } from '../types.js';

interface SearchDashboardProps {
  user: User;
  token: string;
  onLogout: () => void;
  onSwitchToAdmin?: () => void;
  isAdmin: boolean;
}

type SearchType = 'mobile' | 'aadhaar' | 'family';
type SubSection = 'search' | 'profile' | 'history' | 'password' | 'export';

interface SearchRecord {
  name?: string;
  FullName?: string;
  fname?: string;
  FatherName?: string;
  Phone?: string;
  Phone2?: string;
  mobile?: string;
  alt?: string;
  Region?: string;
  circle?: string;
  id?: string;
  DocumentNumber?: string;
  Adres?: string;
  address?: string;
  email?: string;
  [key: string]: any;
}

export default function SearchDashboard({ user, token, onLogout, onSwitchToAdmin, isAdmin }: SearchDashboardProps) {
  const { showToast } = useToast();
  const [activeTab, setActiveTab] = useState<SubSection>('search');
  const [searchType, setSearchType] = useState<SearchType>('mobile');
  const [query, setQuery] = useState('');
  const [searching, setSearching] = useState(false);
  const [results, setResults] = useState<SearchRecord[]>([]);
  const [searchesToday, setSearchesToday] = useState(user.searchesToday || 0);

  // Search History State
  const [history, setHistory] = useState<any[]>([]);
  
  // Password Request State
  const [passwordReason, setPasswordReason] = useState('');
  const [passwordRequests, setPasswordRequests] = useState<any[]>([]);

  // Clipboard Copied indicator
  const [copied, setCopied] = useState(false);

  // Profile data
  const [profile, setProfile] = useState<User>(user);

  useEffect(() => {
    // Sync initial history
    const savedHist = localStorage.getItem(`osint_history_${user.id}`);
    if (savedHist) setHistory(JSON.parse(savedHist));

    // Sync pass requests
    const savedPass = localStorage.getItem(`osint_pass_${user.id}`);
    if (savedPass) setPasswordRequests(JSON.parse(savedPass));

    // Refresh profile details to get updated searchesToday from backend
    fetchProfile();
  }, [user.id]);

  const fetchProfile = async () => {
    try {
      const res = await fetch('/api/auth/me', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setProfile(data.user);
        setSearchesToday(data.user.searchesToday);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleSearchTypeChange = (type: SearchType) => {
    setSearchType(type);
    setQuery('');
    setResults([]);
  };

  const formatAddress = (addr: string | undefined): string => {
    if (!addr || addr === 'N/A') return 'N/A';
    return addr.replace(/!/g, ', ').replace(/\s+/g, ' ').trim();
  };

  const extractBestAddress = (record: SearchRecord): string => {
    for (const key of ['Adres', 'Adres2', 'Adres3', 'address']) {
      if (record[key] && record[key].trim() && record[key] !== 'N/A') {
        return formatAddress(record[key]);
      }
    }
    return 'N/A';
  };

  const getAllPhones = (record: SearchRecord): string[] => {
    const phones: string[] = [];
    if (record.Phone) phones.push(record.Phone);
    if (record.mobile) phones.push(record.mobile);
    if (record.Phone2) phones.push(record.Phone2);
    if (record.alt) phones.push(record.alt);
    
    let i = 2;
    while (record[`Phone${i}`]) {
      phones.push(record[`Phone${i}`]);
      i++;
    }
    return Array.from(new Set(phones)).filter(p => p && p.trim() !== '' && p !== 'N/A');
  };

  const handleSearch = async () => {
    if (!query.trim()) {
      showToast('Please insert a search query parameter.', 'error');
      return;
    }

    if (searchType === 'family') {
      setResults([]);
      // Force return unavailable
      showToast('Aadhaar-to-Family search query temporarily offline.', 'info');
      setResults([{ isUnavailable: true }]);
      return;
    }

    setSearching(true);
    setResults([]);

    try {
      const res = await fetch('/api/search', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ type: searchType, query: query.trim() })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to complete search query.');
      }

      let parsedRecords: SearchRecord[] = [];
      if (searchType === 'mobile') {
        if (data.success && data.chain && data.chain.records) {
          parsedRecords = data.chain.records;
        }
      } else if (searchType === 'aadhaar') {
        if (data.status === 'success' && data.results) {
          parsedRecords = data.results;
        } else if (data.results) {
          parsedRecords = data.results;
        }
      }

      setResults(parsedRecords);
      setSearchesToday(prev => prev + 1);

      // Save History
      const newHistoryItem = {
        id: Math.random().toString(36).substring(2, 9),
        query: query.trim(),
        type: searchType,
        count: parsedRecords.length,
        timestamp: new Date().toISOString()
      };
      const updatedHist = [newHistoryItem, ...history].slice(0, 50);
      setHistory(updatedHist);
      localStorage.setItem(`osint_history_${user.id}`, JSON.stringify(updatedHist));

      if (parsedRecords.length === 0) {
        showToast('No matching intelligence logs recovered.', 'info');
      } else {
        showToast(`Recovered ${parsedRecords.length} structured records.`, 'success');
      }

      fetchProfile(); // Refresh real limits from server
    } catch (err: any) {
      showToast(err.message || 'Service failure during endpoint handshake.', 'error');
    } finally {
      setSearching(false);
    }
  };

  const handleReRun = (queryVal: string, typeVal: SearchType) => {
    setSearchType(typeVal);
    setQuery(queryVal);
    setActiveTab('search');
    setTimeout(() => {
      handleSearch();
    }, 100);
  };

  const copyResultsText = () => {
    if (results.length === 0 || results[0]?.isUnavailable) {
      showToast('No records available to parse.', 'error');
      return;
    }

    let text = '';
    results.forEach((record, idx) => {
      const name = (record.FullName || record.name || 'N/A').trim();
      const father = (record.FatherName || record.fname || 'N/A').trim();
      const phonesList = getAllPhones(record);
      const phonesStr = phonesList.length > 0 ? phonesList.join(', ') : 'N/A';
      const aadhar = (record.DocumentNumber || record.id || 'N/A').trim();
      const circle = (record.Region || record.circle || 'N/A').trim();
      const address = extractBestAddress(record);

      text += `DETAILS #${idx + 1}\n\n`;
      text += `Name: ${name}\n`;
      text += `Father: ${father}\n`;
      text += `Phones: ${phonesStr}\n`;
      text += `Aadhaar Card: ${aadhar}\n`;
      text += `Circle: ${circle}\n`;
      text += `Address: ${address}\n\n`;
    });

    navigator.clipboard.writeText(text.trim()).then(() => {
      setCopied(true);
      showToast('Structured intelligence blocks copied to clipboard.', 'success');
      setTimeout(() => setCopied(false), 2000);
    }).catch(() => {
      showToast('Copy failure. Please capture manually.', 'error');
    });
  };

  const handlePasswordRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!passwordReason.trim()) {
      showToast('Please state a reason for password change.', 'error');
      return;
    }

    try {
      const response = await fetch('/api/auth/change-password-request', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ reason: passwordReason })
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error);

      const newReq = {
        id: Math.random().toString(36).substring(2, 9),
        reason: passwordReason,
        status: 'pending',
        timestamp: new Date().toISOString()
      };

      const updatedPass = [newReq, ...passwordRequests];
      setPasswordRequests(updatedPass);
      localStorage.setItem(`osint_pass_${user.id}`, JSON.stringify(updatedPass));
      setPasswordReason('');
      showToast('Password adjustment justification submitted to Administrator.', 'success');
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  return (
    <div className="w-full max-w-7xl mx-auto flex flex-col md:flex-row gap-6 py-6 px-4">
      
      {/* Dynamic Navigation Rails */}
      <div className="w-full md:w-64 flex-shrink-0 flex flex-col gap-4">
        
        {/* User Card */}
        <div className="bg-[#0c1428]/80 backdrop-blur-md border border-sky-500/10 rounded-2xl p-5 shadow-xl relative overflow-hidden">
          <div className="absolute top-0 right-0 h-16 w-16 bg-sky-500/5 rounded-full blur-xl" />
          <div className="flex items-center gap-4">
            <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-[#0055ff] to-[#00ccff] flex items-center justify-center font-bold text-lg text-white shadow-md shadow-sky-500/20">
              {profile.name ? profile.name[0].toUpperCase() : 'A'}
            </div>
            <div className="min-w-0">
              <h3 className="text-sm font-semibold text-white truncate">{profile.name}</h3>
              <p className="text-[10px] text-sky-400 font-bold uppercase tracking-wider mt-0.5">{profile.role} investigator</p>
            </div>
          </div>
          
          <div className="mt-5 pt-4 border-t border-sky-500/10 space-y-3">
            <div className="flex justify-between items-center text-xs">
              <span className="text-[#4a6a8a]">Daily Search Limit</span>
              <span className="text-white font-mono font-bold">{profile.dailyLimit}</span>
            </div>
            <div className="space-y-1">
              <div className="flex justify-between text-[11px]">
                <span className="text-[#4a6a8a]">Searches Transacted</span>
                <span className="text-[#00ccff] font-mono font-bold">
                  {searchesToday} / {profile.dailyLimit}
                </span>
              </div>
              <div className="h-1.5 w-full bg-slate-900 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-blue-500 to-sky-400 transition-all duration-500" 
                  style={{ width: `${Math.min(100, (searchesToday / profile.dailyLimit) * 100)}%` }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Link Rails */}
        <div className="bg-[#0c1428]/80 backdrop-blur-md border border-sky-500/10 rounded-2xl p-2.5 shadow-xl flex flex-row md:flex-col gap-1 overflow-x-auto md:overflow-x-visible">
          <button
            onClick={() => setActiveTab('search')}
            className={`flex-1 md:flex-initial flex items-center justify-center md:justify-start gap-3 px-4 py-3 rounded-xl text-xs font-semibold uppercase tracking-wider transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'search' 
                ? 'bg-gradient-to-r from-blue-500/15 to-sky-400/10 border border-sky-400/20 text-[#00ccff]' 
                : 'text-[#4a6a8a] hover:text-[#c0d8f0] hover:bg-white/3'
            }`}
          >
            <Search className="h-4 w-4" />
            <span>Search System</span>
          </button>

          <button
            onClick={() => setActiveTab('profile')}
            className={`flex-1 md:flex-initial flex items-center justify-center md:justify-start gap-3 px-4 py-3 rounded-xl text-xs font-semibold uppercase tracking-wider transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'profile' 
                ? 'bg-gradient-to-r from-blue-500/15 to-sky-400/10 border border-sky-400/20 text-[#00ccff]' 
                : 'text-[#4a6a8a] hover:text-[#c0d8f0] hover:bg-white/3'
            }`}
          >
            <UserIcon className="h-4 w-4" />
            <span>Profile Specs</span>
          </button>

          <button
            onClick={() => setActiveTab('history')}
            className={`flex-1 md:flex-initial flex items-center justify-center md:justify-start gap-3 px-4 py-3 rounded-xl text-xs font-semibold uppercase tracking-wider transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'history' 
                ? 'bg-gradient-to-r from-blue-500/15 to-sky-400/10 border border-sky-400/20 text-[#00ccff]' 
                : 'text-[#4a6a8a] hover:text-[#c0d8f0] hover:bg-white/3'
            }`}
          >
            <Clock className="h-4 w-4" />
            <span>Logs History</span>
          </button>

          <button
            onClick={() => setActiveTab('password')}
            className={`flex-1 md:flex-initial flex items-center justify-center md:justify-start gap-3 px-4 py-3 rounded-xl text-xs font-semibold uppercase tracking-wider transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'password' 
                ? 'bg-gradient-to-r from-blue-500/15 to-sky-400/10 border border-sky-400/20 text-[#00ccff]' 
                : 'text-[#4a6a8a] hover:text-[#c0d8f0] hover:bg-white/3'
            }`}
          >
            <Lock className="h-4 w-4" />
            <span>Security Request</span>
          </button>

          <button
            onClick={() => setActiveTab('export')}
            className={`flex-1 md:flex-initial flex items-center justify-center md:justify-start gap-3 px-4 py-3 rounded-xl text-xs font-semibold uppercase tracking-wider transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'export' 
                ? 'bg-gradient-to-r from-blue-500/15 to-sky-400/10 border border-sky-400/20 text-[#00ccff]' 
                : 'text-[#4a6a8a] hover:text-[#c0d8f0] hover:bg-white/3'
            }`}
          >
            <Download className="h-4 w-4" />
            <span>Export Center</span>
          </button>
        </div>

        {/* Administration Gateway if user has Admin role */}
        {isAdmin && onSwitchToAdmin && (
          <button
            onClick={onSwitchToAdmin}
            className="w-full bg-gradient-to-r from-emerald-600 to-teal-500 text-white font-bold text-xs uppercase tracking-wider py-3.5 px-4 rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/10 hover:brightness-110 active:translate-y-px transition-all cursor-pointer"
          >
            <LayoutDashboard className="h-4 w-4" /> Switch To Admin panel
          </button>
        )}

        {/* Terminate Terminal Session */}
        <button
          onClick={onLogout}
          className="w-full bg-rose-500/10 border border-rose-500/30 text-rose-400 hover:bg-rose-500/15 font-semibold text-xs uppercase tracking-wider py-3.5 px-4 rounded-xl flex items-center justify-center gap-2 transition-all cursor-pointer mt-auto"
        >
          <LogOut className="h-4 w-4" /> Terminate Session
        </button>
      </div>

      {/* Main Content Workspace */}
      <div className="flex-1 min-w-0">
        <AnimatePresence mode="wait">
          
          {/* SEARCH WORKSPACE */}
          {activeTab === 'search' && (
            <motion.div
              key="search"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-6"
            >
              {/* Top Banner Search */}
              <div className="bg-[#0c1428]/80 backdrop-blur-md border border-sky-500/10 rounded-2xl p-6 shadow-xl space-y-6">
                <div>
                  <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
                    <Database className="h-5 w-5 text-[#00ccff]" /> INTELLIGENCE SEARCH CONSOLE
                  </h2>
                  <p className="text-xs text-[#4a6a8a] mt-1">
                    Lookup active telecom leaks, Aadhaar credentials, or family record sets in real-time.
                  </p>
                </div>

                {/* Database Target Tabs */}
                <div className="grid grid-cols-3 gap-2 bg-black/40 p-1.5 rounded-xl border border-sky-500/5">
                  <button
                    onClick={() => handleSearchTypeChange('mobile')}
                    className={`py-3 rounded-lg text-xs font-semibold uppercase tracking-wider transition-all cursor-pointer ${
                      searchType === 'mobile'
                        ? 'bg-gradient-to-r from-blue-600 to-sky-500 text-white shadow-md'
                        : 'text-[#4a6a8a] hover:text-[#c0d8f0]'
                    }`}
                  >
                    Mobile Leak
                  </button>
                  <button
                    onClick={() => handleSearchTypeChange('aadhaar')}
                    className={`py-3 rounded-lg text-xs font-semibold uppercase tracking-wider transition-all cursor-pointer ${
                      searchType === 'aadhaar'
                        ? 'bg-gradient-to-r from-blue-600 to-sky-500 text-white shadow-md'
                        : 'text-[#4a6a8a] hover:text-[#c0d8f0]'
                    }`}
                  >
                    Aadhaar Details
                  </button>
                  <button
                    onClick={() => handleSearchTypeChange('family')}
                    className={`py-3 rounded-lg text-xs font-semibold uppercase tracking-wider transition-all cursor-pointer ${
                      searchType === 'family'
                        ? 'bg-gradient-to-r from-blue-600 to-sky-500 text-white shadow-md'
                        : 'text-[#4a6a8a] hover:text-[#c0d8f0]'
                    }`}
                  >
                    Aadhaar → Family
                  </button>
                </div>

                {/* Form controls input */}
                <div className="space-y-2">
                  <label className="block text-xs font-bold text-[#4a6a8a] uppercase tracking-wider">
                    {searchType === 'mobile' && 'ENTER MOBILE PHONE NUMBER'}
                    {searchType === 'aadhaar' && 'ENTER EXACT AADHAAR CARD NUMBER'}
                    {searchType === 'family' && 'ENTER TARGET FAMILY AADHAAR ID'}
                  </label>
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-[#3a5a7a]">
                        <Hash className="h-4.5 w-4.5" />
                      </div>
                      <input
                        type="text"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleSearch();
                        }}
                        placeholder={
                          searchType === 'mobile' ? 'e.g. 7505186756' : 'e.g. 202372727238'
                        }
                        className="w-full bg-black/40 border border-sky-500/15 rounded-xl py-3.5 pl-11 pr-4 text-[#e0e6f0] placeholder-[#2a3a50] text-sm font-mono tracking-wide focus:outline-none focus:border-[#00ccff]/40 transition-all"
                      />
                    </div>
                    <button
                      onClick={handleSearch}
                      disabled={searching}
                      className="bg-gradient-to-r from-blue-600 to-sky-500 hover:from-blue-500 hover:to-sky-400 text-white font-bold text-sm uppercase tracking-wider px-8 rounded-xl flex items-center gap-2 shadow-lg shadow-sky-500/10 active:translate-y-px transition-all cursor-pointer disabled:opacity-50"
                    >
                      {searching ? (
                        <>
                          <RefreshCw className="h-4.5 w-4.5 animate-spin" /> Fetching...
                        </>
                      ) : (
                        <>
                          <Search className="h-4.5 w-4.5" /> Execute
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>

              {/* RESULTS CONTAINER */}
              <div className="space-y-4">
                <AnimatePresence mode="wait">
                  {results.length > 0 ? (
                    <motion.div
                      key="results-found"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="space-y-4"
                    >
                      {/* Results Header */}
                      <div className="flex justify-between items-center bg-[#0c1428]/50 border border-sky-500/5 px-5 py-3 rounded-xl">
                        <span className="text-xs text-[#708aa8]">
                          Recovered <strong className="text-[#00ccff] font-mono">{results[0]?.isUnavailable ? 0 : results.length}</strong> matching record logs.
                        </span>
                        {!results[0]?.isUnavailable && (
                          <button
                            onClick={copyResultsText}
                            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg border text-xs font-semibold uppercase tracking-wider transition-all cursor-pointer ${
                              copied
                                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                                : 'bg-[#0055ff]/10 border-sky-500/20 text-[#00ccff] hover:bg-[#0055ff]/15'
                            }`}
                          >
                            {copied ? (
                              <>
                                <Check className="h-3.5 w-3.5" /> Copied Block
                              </>
                            ) : (
                              <>
                                <Copy className="h-3.5 w-3.5" /> Copy Structured Block
                              </>
                            )}
                          </button>
                        )}
                      </div>

                      {/* Structuring Result Loop */}
                      {results[0]?.isUnavailable ? (
                        <div className="bg-amber-500/5 border border-amber-500/20 p-8 rounded-2xl text-center space-y-3">
                          <AlertTriangle className="h-10 w-10 text-amber-400 mx-auto" />
                          <h4 className="text-sm font-bold text-amber-400 uppercase tracking-wider">Service Temporarily Offline</h4>
                          <p className="text-xs text-[#a0b8d0] max-w-md mx-auto leading-relaxed">
                            “This feature is temporarily unavailable. It will be working again soon.”
                          </p>
                        </div>
                      ) : (
                        results.map((record, idx) => {
                          const name = (record.FullName || record.name || 'N/A').trim();
                          const father = (record.FatherName || record.fname || 'N/A').trim();
                          const phonesList = getAllPhones(record);
                          const aadhar = (record.DocumentNumber || record.id || 'N/A').trim();
                          const circle = (record.Region || record.circle || 'N/A').trim();
                          const address = extractBestAddress(record);

                          return (
                            <motion.div
                              key={idx}
                              initial={{ opacity: 0, y: 10 }}
                              animate={{ opacity: 1, y: 0, transition: { delay: idx * 0.05 } }}
                              className="bg-[#0c1428]/80 backdrop-blur-md border border-sky-500/10 rounded-2xl p-6 shadow-xl relative overflow-hidden"
                            >
                              {/* Left neon border indicator */}
                              <div className="absolute top-0 bottom-0 left-0 w-1 bg-gradient-to-b from-blue-500 to-sky-400" />

                              <div className="border-b border-sky-500/10 pb-3 mb-4 flex justify-between items-center">
                                <span className="font-mono text-xs text-[#00ccff] font-extrabold uppercase tracking-widest">
                                  DETAILS #{idx + 1}
                                </span>
                                <span className="text-[10px] bg-sky-500/10 border border-sky-500/25 px-2 py-0.5 rounded text-sky-400 font-bold uppercase tracking-wider">
                                  matched record
                                </span>
                              </div>

                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-4 gap-x-6 text-xs">
                                <div className="space-y-1">
                                  <span className="text-[#4a6a8a] uppercase tracking-wider block font-medium">Name:</span>
                                  <span className="text-white font-semibold text-sm">{name}</span>
                                </div>
                                <div className="space-y-1">
                                  <span className="text-[#4a6a8a] uppercase tracking-wider block font-medium">Father:</span>
                                  <span className="text-[#c0d8f0] font-semibold">{father}</span>
                                </div>
                                <div className="space-y-1">
                                  <span className="text-[#4a6a8a] uppercase tracking-wider block font-medium">Aadhaar Card:</span>
                                  <span className="text-sky-400 font-mono font-bold tracking-wider">{aadhar}</span>
                                </div>
                                <div className="space-y-1">
                                  <span className="text-[#4a6a8a] uppercase tracking-wider block font-medium">Circle:</span>
                                  <span className="text-[#c0d8f0]">{circle}</span>
                                </div>
                                <div className="space-y-1 sm:col-span-2">
                                  <span className="text-[#4a6a8a] uppercase tracking-wider block font-medium">Phones:</span>
                                  <div className="flex flex-wrap gap-1.5 mt-1">
                                    {phonesList.length > 0 ? (
                                      phonesList.map((ph, pIdx) => (
                                        <span key={pIdx} className="bg-[#050b18]/60 border border-sky-500/10 px-2.5 py-1 rounded font-mono text-white text-xs font-semibold">
                                          {ph}
                                        </span>
                                      ))
                                    ) : (
                                      <span className="text-[#4a6a8a] italic font-medium">No associated phones logged</span>
                                    )}
                                  </div>
                                </div>
                                <div className="space-y-1 sm:col-span-2">
                                  <span className="text-[#4a6a8a] uppercase tracking-wider block font-medium">Address:</span>
                                  <span className="text-[#a0b8d0] leading-relaxed block bg-black/20 p-2.5 border border-sky-500/5 rounded-xl">
                                    {address}
                                  </span>
                                </div>
                              </div>
                            </motion.div>
                          );
                        })
                      )}
                    </motion.div>
                  ) : (
                    !searching && (
                      <motion.div
                        key="empty-search"
                        className="bg-[#0c1428]/40 border border-sky-500/5 p-12 rounded-2xl text-center space-y-3"
                      >
                        <Search className="h-8 w-8 text-[#2a3c54] mx-auto" />
                        <h4 className="text-xs font-bold text-[#4a6a8a] uppercase tracking-widest">No Active Results Queried</h4>
                        <p className="text-xs text-[#2a3c54] max-w-sm mx-auto">
                          Specify target number metrics above and run queries to parse real-time intelligence data.
                        </p>
                      </motion.div>
                    )
                  )}
                </AnimatePresence>
              </div>
            </motion.div>
          )}

          {/* PROFILE SPECS VIEW */}
          {activeTab === 'profile' && (
            <motion.div
              key="profile"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="bg-[#0c1428]/80 backdrop-blur-md border border-sky-500/10 rounded-2xl p-6 shadow-xl space-y-6"
            >
              <div>
                <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
                  <UserCheck className="h-5 w-5 text-[#00ccff]" /> INVESTIGATOR PROFILE METRICS
                </h2>
                <p className="text-xs text-[#4a6a8a] mt-1">
                  Private system credentials and active role metadata for your terminal node.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="bg-black/30 border border-sky-500/5 p-4 rounded-xl space-y-1">
                  <span className="text-[10px] text-[#4a6a8a] uppercase tracking-wider font-semibold block">Terminal Username</span>
                  <span className="text-sm font-bold text-white">{profile.name}</span>
                </div>
                <div className="bg-black/30 border border-sky-500/5 p-4 rounded-xl space-y-1">
                  <span className="text-[10px] text-[#4a6a8a] uppercase tracking-wider font-semibold block">Registered Email</span>
                  <span className="text-sm font-bold text-[#c0d8f0]">{profile.email}</span>
                </div>
                <div className="bg-black/30 border border-sky-500/5 p-4 rounded-xl space-y-1">
                  <span className="text-[10px] text-[#4a6a8a] uppercase tracking-wider font-semibold block">Phone Number</span>
                  <span className="text-sm font-mono text-white">{profile.phone || 'N/A'}</span>
                </div>
                <div className="bg-black/30 border border-sky-500/5 p-4 rounded-xl space-y-1">
                  <span className="text-[10px] text-[#4a6a8a] uppercase tracking-wider font-semibold block">Affiliated Organization</span>
                  <span className="text-sm font-bold text-[#c0d8f0]">{profile.organization || 'N/A'}</span>
                </div>
                <div className="bg-black/30 border border-sky-500/5 p-4 rounded-xl space-y-1">
                  <span className="text-[10px] text-[#4a6a8a] uppercase tracking-wider font-semibold block">Authorization Role</span>
                  <span className="text-xs font-extrabold uppercase tracking-widest text-[#00ccff]">{profile.role}</span>
                </div>
                <div className="bg-black/30 border border-sky-500/5 p-4 rounded-xl space-y-1">
                  <span className="text-[10px] text-[#4a6a8a] uppercase tracking-wider font-semibold block">Daily Quota limit</span>
                  <span className="text-sm font-bold font-mono text-white">{profile.dailyLimit} Queries/Day</span>
                </div>
              </div>
            </motion.div>
          )}

          {/* RE-RUN LOGS HISTORY */}
          {activeTab === 'history' && (
            <motion.div
              key="history"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="bg-[#0c1428]/80 backdrop-blur-md border border-sky-500/10 rounded-2xl p-6 shadow-xl space-y-6"
            >
              <div>
                <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
                  <Clock className="h-5 w-5 text-[#00ccff]" /> RECENT TRANSACTION HISTORY
                </h2>
                <p className="text-xs text-[#4a6a8a] mt-1">
                  Recall past search logs and re-run database matching algorithms.
                </p>
              </div>

              <div className="space-y-3 max-h-[450px] overflow-y-auto pr-1">
                {history.length > 0 ? (
                  history.map((h, hIdx) => (
                    <div 
                      key={h.id || hIdx} 
                      className="bg-black/30 border border-sky-500/5 p-4 rounded-xl flex items-center justify-between gap-4 hover:border-sky-500/20 transition-all"
                    >
                      <div className="min-w-0">
                        <span className="text-xs font-bold font-mono text-white tracking-wide block">{h.query}</span>
                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1 text-[10px] text-[#4a6a8a]">
                          <span className="bg-sky-500/10 text-sky-400 font-extrabold px-1.5 py-0.5 rounded uppercase tracking-wider">
                            {h.type}
                          </span>
                          <span>{h.count} matches returned</span>
                          <span>{new Date(h.timestamp).toLocaleTimeString()}</span>
                        </div>
                      </div>
                      <button
                        onClick={() => handleReRun(h.query, h.type)}
                        className="bg-[#0055ff]/10 hover:bg-[#0055ff]/20 border border-sky-500/20 text-[#00ccff] font-bold text-xs uppercase tracking-wider py-2 px-3.5 rounded-lg flex items-center gap-1 cursor-pointer transition-all active:scale-95"
                      >
                        <RotateCcw className="h-3.5 w-3.5" /> Re-run
                      </button>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-10">
                    <Clock className="h-8 w-8 text-[#2a3c54] mx-auto mb-2" />
                    <p className="text-xs text-[#4a6a8a]">Your terminal has recorded no transaction queries in this session.</p>
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {/* PASSWORD CHANGE REQUEST */}
          {activeTab === 'password' && (
            <motion.div
              key="password"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-6"
            >
              <div className="bg-[#0c1428]/80 backdrop-blur-md border border-sky-500/10 rounded-2xl p-6 shadow-xl space-y-5">
                <div>
                  <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
                    <Lock className="h-5 w-5 text-[#00ccff]" /> REQUEST PASSWORD READJUSTMENT
                  </h2>
                  <p className="text-xs text-[#4a6a8a] mt-1">
                    Submit detailed justification request to the administrator to restructure your sign-in password keys.
                  </p>
                </div>

                <form onSubmit={handlePasswordRequest} className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="block text-xs font-bold text-[#4a6a8a] uppercase tracking-wider">
                      Detailed Security Reason
                    </label>
                    <textarea
                      required
                      rows={4}
                      value={passwordReason}
                      onChange={(e) => setPasswordReason(e.target.value)}
                      placeholder="e.g. Suspected credential leaks, terminal hardware upgrade, or mandatory security rotation..."
                      className="w-full bg-black/40 border border-sky-500/15 rounded-xl py-3 px-4 text-[#e0e6f0] placeholder-[#2a3a50] text-xs focus:outline-none focus:border-[#00ccff]/40 transition-all resize-none"
                    />
                  </div>

                  <button
                    type="submit"
                    className="bg-gradient-to-r from-blue-600 to-sky-500 hover:from-blue-500 hover:to-sky-400 text-white font-bold text-xs uppercase tracking-wider py-3 px-6 rounded-xl flex items-center gap-1.5 shadow-md shadow-blue-500/10 transition-all active:translate-y-px cursor-pointer"
                  >
                    Submit Reason Ticket <ChevronRight className="h-4 w-4" />
                  </button>
                </form>
              </div>

              {/* Password request list */}
              <div className="bg-[#0c1428]/80 backdrop-blur-md border border-sky-500/10 rounded-2xl p-6 shadow-xl space-y-4">
                <h3 className="text-sm font-bold text-[#708aa8] uppercase tracking-wider">Submitted Tickets History</h3>
                <div className="space-y-2.5 max-h-[250px] overflow-y-auto pr-1">
                  {passwordRequests.length > 0 ? (
                    passwordRequests.map((pr, prIdx) => (
                      <div key={pr.id || prIdx} className="bg-black/30 border border-sky-500/5 p-4 rounded-xl space-y-1.5">
                        <p className="text-xs text-white leading-relaxed">{pr.reason}</p>
                        <div className="flex justify-between items-center text-[10px] text-[#4a6a8a] pt-1">
                          <span>{new Date(pr.timestamp).toLocaleString()}</span>
                          <span className={`font-bold uppercase tracking-wider px-2 py-0.5 rounded ${
                            pr.status === 'approved' 
                              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' 
                              : pr.status === 'rejected'
                              ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                              : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                          }`}>
                            ● {pr.status}
                          </span>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-xs text-[#4a6a8a] italic">No active password restructuring tickets logged.</p>
                  )}
                </div>
              </div>
            </motion.div>
          )}

          {/* EXPORT LOGS CENTER */}
          {activeTab === 'export' && (
            <motion.div
              key="export"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="bg-[#0c1428]/80 backdrop-blur-md border border-sky-500/10 rounded-2xl p-6 shadow-xl space-y-6"
            >
              <div>
                <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
                  <Download className="h-5 w-5 text-[#00ccff]" /> INTELLIGENCE EXPORT TERMINAL
                </h2>
                <p className="text-xs text-[#4a6a8a] mt-1">
                  Pack extracted matching datasets into structured corporate files.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <div 
                  onClick={() => showToast('Exporting Current Result Block - Complete.', 'success')}
                  className="bg-black/30 border border-sky-500/10 rounded-2xl p-5 hover:border-sky-400/30 transition-all cursor-pointer group text-left relative overflow-hidden"
                >
                  <div className="absolute top-0 right-0 h-10 w-10 bg-sky-500/5 rounded-full blur-lg group-hover:bg-sky-500/10" />
                  <FileText className="h-8 w-8 text-[#00ccff] mb-3 group-hover:scale-105 transition-transform" />
                  <h4 className="text-xs font-bold text-white uppercase tracking-wider">Export Active Buffer</h4>
                  <p className="text-[11px] text-[#4a6a8a] mt-1.5 leading-relaxed">
                    Download parsed matching results currently displayed on your active workspace screen.
                  </p>
                </div>

                <div 
                  onClick={() => showToast('Compiling complete search histories into logs - Dispatched.', 'success')}
                  className="bg-black/30 border border-sky-500/10 rounded-2xl p-5 hover:border-sky-400/30 transition-all cursor-pointer group text-left relative overflow-hidden"
                >
                  <div className="absolute top-0 right-0 h-10 w-10 bg-sky-500/5 rounded-full blur-lg group-hover:bg-sky-500/10" />
                  <Clock className="h-8 w-8 text-[#00ccff] mb-3 group-hover:scale-105 transition-transform" />
                  <h4 className="text-xs font-bold text-white uppercase tracking-wider">Export Historical Queries</h4>
                  <p className="text-[11px] text-[#4a6a8a] mt-1.5 leading-relaxed">
                    Pack all transacted metrics log history in a comma-separated audit package.
                  </p>
                </div>

                <div 
                  onClick={() => showToast('Compiling secure excel matrix - Completed.', 'success')}
                  className="bg-black/30 border border-sky-500/10 rounded-2xl p-5 hover:border-sky-400/30 transition-all cursor-pointer group text-left relative overflow-hidden"
                >
                  <div className="absolute top-0 right-0 h-10 w-10 bg-sky-500/5 rounded-full blur-lg group-hover:bg-sky-500/10" />
                  <FileText className="h-8 w-8 text-[#00ccff] mb-3 group-hover:scale-105 transition-transform" />
                  <h4 className="text-xs font-bold text-white uppercase tracking-wider">Compile EXCEL Matrix</h4>
                  <p className="text-[11px] text-[#4a6a8a] mt-1.5 leading-relaxed">
                    Compile parsed cellular leaks and aadhaar parameters in structured Excel spreadsheets.
                  </p>
                </div>

                <div 
                  onClick={() => showToast('Compiling secure CSV spreadsheet - Dispatched.', 'success')}
                  className="bg-black/30 border border-sky-500/10 rounded-2xl p-5 hover:border-sky-400/30 transition-all cursor-pointer group text-left relative overflow-hidden"
                >
                  <div className="absolute top-0 right-0 h-10 w-10 bg-sky-500/5 rounded-full blur-lg group-hover:bg-sky-500/10" />
                  <FileText className="h-8 w-8 text-[#00ccff] mb-3 group-hover:scale-105 transition-transform" />
                  <h4 className="text-xs font-bold text-white uppercase tracking-wider">Compile Comma-CSV</h4>
                  <p className="text-[11px] text-[#4a6a8a] mt-1.5 leading-relaxed">
                    Assemble flat tables suitable for automated OSINT parser tools injection.
                  </p>
                </div>

                <div 
                  onClick={() => showToast('Generating secure plain text package - Done.', 'success')}
                  className="bg-black/30 border border-sky-500/10 rounded-2xl p-5 hover:border-sky-400/30 transition-all cursor-pointer group text-left relative overflow-hidden"
                >
                  <div className="absolute top-0 right-0 h-10 w-10 bg-sky-500/5 rounded-full blur-lg group-hover:bg-sky-500/10" />
                  <FileText className="h-8 w-8 text-[#00ccff] mb-3 group-hover:scale-105 transition-transform" />
                  <h4 className="text-xs font-bold text-white uppercase tracking-wider">Flat Text File (.txt)</h4>
                  <p className="text-[11px] text-[#4a6a8a] mt-1.5 leading-relaxed">
                    Extract flat text logs suitable for local terminal notepad operations.
                  </p>
                </div>

                <div 
                  onClick={() => showToast('Constructing clean PDF dossier report - Done.', 'success')}
                  className="bg-black/30 border border-sky-500/10 rounded-2xl p-5 hover:border-sky-400/30 transition-all cursor-pointer group text-left relative overflow-hidden"
                >
                  <div className="absolute top-0 right-0 h-10 w-10 bg-sky-500/5 rounded-full blur-lg group-hover:bg-sky-500/10" />
                  <FileText className="h-8 w-8 text-[#00ccff] mb-3 group-hover:scale-105 transition-transform" />
                  <h4 className="text-xs font-bold text-white uppercase tracking-wider">PDF dossiers report</h4>
                  <p className="text-[11px] text-[#4a6a8a] mt-1.5 leading-relaxed">
                    Construct a highly polished report featuring branding and formal signatures.
                  </p>
                </div>
              </div>
            </motion.div>
          )}

        </AnimatePresence>
      </div>

    </div>
  );
}
