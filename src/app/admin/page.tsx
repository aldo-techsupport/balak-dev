'use client';

import React, { useState, useEffect } from 'react';
import { useAuthStore } from '@/stores/authStore';
import {
  Shield,
  Users,
  Trophy,
  Swords,
  Gamepad2,
  PlusCircle,
  Trash2,
  Edit3,
  Lock,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  LogOut,
  Key,
  Search,
  Star,
  Flame,
  X,
  Check,
  Server,
  Activity,
  Layers,
  Sparkles,
  Ban,
  Clock,
} from 'lucide-react';
import { getRankInfo, RANK_TIERS } from '@/lib/rank';

interface AdminStats {
  totalUsers: number;
  bannedUsers: number;
  totalMatches: number;
  activeRoomsCount: number;
  playingRoomsCount: number;
  activePlayersInRooms: number;
  tierCounts: Record<string, number>;
  serverTime: string;
  nodeVersion: string;
}

interface AdminUser {
  id: string;
  username: string;
  email: string;
  nickname: string;
  avatar: string;
  role: string;
  isBanned: boolean;
  rankTier: string;
  rankDivision: string;
  rankStars: number;
  rankScore: number;
  totalGames: number;
  wins: number;
  losses: number;
  createdAt: string;
}

interface AdminRoom {
  code: string;
  name: string;
  mode: string;
  isPublic: boolean;
  playerCount: number;
  maxPlayers: number;
  status: string;
  roundNumber: number;
  players: any[];
}

interface AdminMatch {
  id: string;
  roomCode: string;
  gameMode: string;
  playerCount: number;
  winnerNickname?: string;
  winningTeam?: string;
  endReason: string;
  createdAt: string;
  participants: any[];
}

const AVATAR_OPTIONS = [
  { id: 'avatar_1', icon: '🦁', name: 'Singa' },
  { id: 'avatar_2', icon: '🐯', name: 'Harimau' },
  { id: 'avatar_3', icon: '🦅', name: 'Elang' },
  { id: 'avatar_4', icon: '🐲', name: 'Naga' },
  { id: 'avatar_5', icon: '🐼', name: 'Panda' },
  { id: 'avatar_6', icon: '🐺', name: 'Serigala' },
  { id: 'avatar_7', icon: '🦊', name: 'Rubah' },
  { id: 'avatar_8', icon: '👑', name: 'Mahkota' },
];

export default function AdminPage() {
  const { user, login, logout, checkAuth } = useAuthStore();

  // Auth / Login State
  const [loginIdentifier, setLoginIdentifier] = useState('admin');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);

  // Active Tab
  const [activeTab, setActiveTab] = useState<'overview' | 'users' | 'rooms' | 'matches' | 'tiers'>('overview');

  // Stats State
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [loadingStats, setLoadingStats] = useState(false);

  // Users State
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [searchUser, setSearchUser] = useState('');
  const [filterTier, setFilterTier] = useState('ALL');
  const [filterRole, setFilterRole] = useState('ALL');

  // Edit / Create User Modal State
  const [editingUser, setEditingUser] = useState<AdminUser | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [formNickname, setFormNickname] = useState('');
  const [formUsername, setFormUsername] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formPassword, setFormPassword] = useState('');
  const [formAvatar, setFormAvatar] = useState('avatar_1');
  const [formRole, setFormRole] = useState('user');
  const [formIsBanned, setFormIsBanned] = useState(false);
  const [formRankTier, setFormRankTier] = useState('WARRIOR');
  const [formRankDivision, setFormRankDivision] = useState('III');
  const [formRankStars, setFormRankStars] = useState(0);
  const [formRankScore, setFormRankScore] = useState(0);
  const [formTotalGames, setFormTotalGames] = useState(0);
  const [formWins, setFormWins] = useState(0);
  const [formLosses, setFormLosses] = useState(0);
  const [actionLoading, setActionLoading] = useState(false);
  const [actionMsg, setActionMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Delete User Modal State
  const [userToDelete, setUserToDelete] = useState<AdminUser | null>(null);

  // Live Rooms State
  const [rooms, setRooms] = useState<AdminRoom[]>([]);
  const [loadingRooms, setLoadingRooms] = useState(false);

  // Matches State
  const [matches, setMatches] = useState<AdminMatch[]>([]);
  const [loadingMatches, setLoadingMatches] = useState(false);

  // Auto-fetch data when admin is authenticated
  const isAdmin = user && user.role === 'admin';

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  const fetchStats = async () => {
    try {
      setLoadingStats(true);
      const res = await fetch('/api/admin/stats');
      if (res.ok) {
        const data = await res.json();
        setStats(data.stats);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingStats(false);
    }
  };

  const fetchUsers = async () => {
    try {
      setLoadingUsers(true);
      const params = new URLSearchParams();
      if (searchUser) params.set('search', searchUser);
      if (filterTier !== 'ALL') params.set('tier', filterTier);
      if (filterRole !== 'ALL') params.set('role', filterRole);

      const res = await fetch(`/api/admin/users?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setUsers(data.users || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingUsers(false);
    }
  };

  const fetchRooms = async () => {
    try {
      setLoadingRooms(true);
      const res = await fetch('/api/admin/rooms');
      if (res.ok) {
        const data = await res.json();
        setRooms(data.rooms || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingRooms(false);
    }
  };

  const fetchMatches = async () => {
    try {
      setLoadingMatches(true);
      const res = await fetch('/api/admin/matches?limit=50');
      if (res.ok) {
        const data = await res.json();
        setMatches(data.matches || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingMatches(false);
    }
  };

  useEffect(() => {
    if (isAdmin) {
      if (activeTab === 'overview') fetchStats();
      if (activeTab === 'users') fetchUsers();
      if (activeTab === 'rooms') fetchRooms();
      if (activeTab === 'matches') fetchMatches();
    }
  }, [isAdmin, activeTab]);

  // Handle Admin Login
  const handleAdminLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError(null);
    setLoginLoading(true);
    try {
      const res = await login(loginIdentifier, loginPassword);
      if (!res.success) {
        setLoginError(res.error || 'Login gagal. Periksa username dan password.');
      } else {
        await checkAuth();
      }
    } catch (err: any) {
      setLoginError(err.message || 'Terjadi kesalahan sistem.');
    } finally {
      setLoginLoading(false);
    }
  };

  // Open Edit User Modal
  const handleOpenEditUser = (u: AdminUser) => {
    setEditingUser(u);
    setFormNickname(u.nickname);
    setFormUsername(u.username);
    setFormEmail(u.email);
    setFormPassword('');
    setFormAvatar(u.avatar || 'avatar_1');
    setFormRole(u.role || 'user');
    setFormIsBanned(Boolean(u.isBanned));
    setFormRankTier(u.rankTier || 'WARRIOR');
    setFormRankDivision(u.rankDivision || 'III');
    setFormRankStars(u.rankStars || 0);
    setFormRankScore(u.rankScore || 0);
    setFormTotalGames(u.totalGames || 0);
    setFormWins(u.wins || 0);
    setFormLosses(u.losses || 0);
    setActionMsg(null);
  };

  // Submit Edit User & Rank
  const handleSaveEditUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;
    setActionLoading(true);
    setActionMsg(null);

    try {
      const payload: any = {
        nickname: formNickname,
        avatar: formAvatar,
        role: formRole,
        isBanned: formIsBanned,
        rankTier: formRankTier,
        rankDivision: formRankDivision,
        rankStars: formRankStars,
        rankScore: formRankScore,
        totalGames: formTotalGames,
        wins: formWins,
        losses: formLosses,
      };
      if (formPassword.trim()) {
        payload.password = formPassword.trim();
      }

      const res = await fetch(`/api/admin/users/${editingUser.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setActionMsg({ type: 'success', text: 'Perubahan user & rank berhasil disimpan!' });
        setTimeout(() => {
          setEditingUser(null);
          fetchUsers();
          fetchStats();
        }, 1000);
      } else {
        setActionMsg({ type: 'error', text: data.error || 'Gagal menyimpan perubahan.' });
      }
    } catch (err: any) {
      setActionMsg({ type: 'error', text: err.message || 'Koneksi gagal.' });
    } finally {
      setActionLoading(false);
    }
  };

  // Submit Create New User
  const handleCreateNewUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionLoading(true);
    setActionMsg(null);

    try {
      const res = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: formUsername,
          email: formEmail,
          password: formPassword,
          nickname: formNickname,
          avatar: formAvatar,
          role: formRole,
          rankTier: formRankTier,
          rankDivision: formRankDivision,
          rankStars: formRankStars,
          rankScore: formRankScore,
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setActionMsg({ type: 'success', text: 'Akun baru berhasil didaftarkan!' });
        setTimeout(() => {
          setShowCreateModal(false);
          fetchUsers();
          fetchStats();
        }, 1000);
      } else {
        setActionMsg({ type: 'error', text: data.error || 'Gagal membuat user.' });
      }
    } catch (err: any) {
      setActionMsg({ type: 'error', text: err.message || 'Koneksi gagal.' });
    } finally {
      setActionLoading(false);
    }
  };

  // Delete User
  const handleConfirmDeleteUser = async () => {
    if (!userToDelete) return;
    setActionLoading(true);
    try {
      const res = await fetch(`/api/admin/users/${userToDelete.id}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setUserToDelete(null);
        fetchUsers();
        fetchStats();
      } else {
        alert(data.error || 'Gagal menghapus user.');
      }
    } catch (err: any) {
      alert(err.message || 'Koneksi gagal.');
    } finally {
      setActionLoading(false);
    }
  };

  // Close Live Room
  const handleCloseRoom = async (code: string) => {
    if (!confirm(`Tutup meja ${code} secara paksa?`)) return;
    try {
      const res = await fetch('/api/admin/rooms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ roomCode: code }),
      });
      if (res.ok) {
        fetchRooms();
        fetchStats();
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Delete Match History
  const handleDeleteMatch = async (id: string) => {
    if (!confirm('Hapus log riwayat pertandingan ini?')) return;
    try {
      const res = await fetch(`/api/admin/matches?id=${id}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        fetchMatches();
        fetchStats();
      }
    } catch (err) {
      console.error(err);
    }
  };

  // ==========================================
  // VIEW 1: ADMIN LOGIN FORM (IF NOT ADMIN)
  // ==========================================
  if (!isAdmin) {
    return (
      <div className="flex-1 flex items-center justify-center p-4 bg-[#05080f]">
        <div className="max-w-md w-full bg-slate-900/90 border border-slate-800 rounded-3xl p-8 shadow-2xl backdrop-blur-md">
          <div className="flex flex-col items-center text-center mb-6">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-amber-600 to-amber-400 flex items-center justify-center text-slate-950 shadow-lg shadow-amber-500/20 mb-3">
              <Shield className="w-8 h-8" />
            </div>
            <h1 className="text-2xl font-black text-white tracking-tight">Admin Control Center</h1>
            <p className="text-xs text-slate-400 mt-1">
              Portal administrasi internal server Balak 3D. Area terbatas.
            </p>
          </div>

          {user && user.role !== 'admin' && (
            <div className="mb-4 p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0 text-amber-400" />
              <span>
                Akun aktif: <strong>{user.nickname}</strong> bukan Administrator. Silakan login dengan akun admin.
              </span>
            </div>
          )}

          {loginError && (
            <div className="mb-4 p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-300 text-xs flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0 text-red-400" />
              <span>{loginError}</span>
            </div>
          )}

          <form onSubmit={handleAdminLogin} className="space-y-4">
            <div>
              <label className="text-xs font-bold text-slate-300 block mb-1">Username / Email</label>
              <input
                type="text"
                value={loginIdentifier}
                onChange={(e) => setLoginIdentifier(e.target.value)}
                placeholder="admin"
                required
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-amber-500"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-300 block mb-1">Password</label>
              <input
                type="password"
                value={loginPassword}
                onChange={(e) => setLoginPassword(e.target.value)}
                placeholder="••••••••"
                required
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-amber-500"
              />
            </div>

            <button
              type="submit"
              disabled={loginLoading}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black text-sm shadow-lg transition active:scale-95 disabled:opacity-50"
            >
              {loginLoading ? 'Memverifikasi...' : 'Masuk Panel Admin'}
            </button>
          </form>

          <div className="mt-6 pt-4 border-t border-slate-800 text-center">
            <span className="text-[11px] text-slate-500">
              Kredensial Default: <code className="text-amber-400 font-mono">admin</code> / <code className="text-amber-400 font-mono">admin123</code>
            </span>
          </div>
        </div>
      </div>
    );
  }

  // ==========================================
  // VIEW 2: FULL ENTERPRISE ADMIN DASHBOARD
  // ==========================================
  return (
    <div className="flex-1 bg-[#05080f] text-slate-100 pb-16">
      {/* Top Admin Sub-Header */}
      <header className="border-b border-slate-800 bg-slate-950/70 backdrop-blur-md sticky top-16 z-30 px-4 sm:px-8 py-3">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400 shadow-md">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base font-black text-white tracking-tight">Admin Control Center</h1>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-red-500/20 text-red-300 border border-red-500/40 font-bold uppercase tracking-wider">
                  Internal Only
                </span>
              </div>
              <p className="text-[11px] text-slate-400">
                Panel Manajemen & Pengaturan Game Balak
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-end">
            <div className="text-right hidden sm:block">
              <span className="text-xs font-bold text-white block">{user.nickname}</span>
              <span className="text-[10px] font-mono text-emerald-400">Role: {user.role?.toUpperCase()}</span>
            </div>
            <button
              onClick={() => logout()}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 hover:text-white text-xs font-bold transition"
            >
              <LogOut className="w-3.5 h-3.5 text-rose-400" />
              Keluar
            </button>
          </div>
        </div>

        {/* Tab Navigation Menu */}
        <div className="max-w-7xl mx-auto mt-4 flex items-center gap-2 overflow-x-auto pb-1 text-xs font-bold scrollbar-none">
          <button
            onClick={() => setActiveTab('overview')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl transition whitespace-nowrap ${
              activeTab === 'overview'
                ? 'bg-amber-500 text-slate-950 font-black shadow-lg shadow-amber-500/20'
                : 'bg-slate-900/60 hover:bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
            }`}
          >
            <Activity className="w-4 h-4" />
            Ringkasan Sistem
          </button>

          <button
            onClick={() => setActiveTab('users')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl transition whitespace-nowrap ${
              activeTab === 'users'
                ? 'bg-amber-500 text-slate-950 font-black shadow-lg shadow-amber-500/20'
                : 'bg-slate-900/60 hover:bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
            }`}
          >
            <Users className="w-4 h-4" />
            Manajemen User & Rank ({users.length || stats?.totalUsers || 0})
          </button>

          <button
            onClick={() => setActiveTab('rooms')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl transition whitespace-nowrap ${
              activeTab === 'rooms'
                ? 'bg-amber-500 text-slate-950 font-black shadow-lg shadow-amber-500/20'
                : 'bg-slate-900/60 hover:bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
            }`}
          >
            <Gamepad2 className="w-4 h-4" />
            Meja Game Aktif ({rooms.length || stats?.activeRoomsCount || 0})
          </button>

          <button
            onClick={() => setActiveTab('matches')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl transition whitespace-nowrap ${
              activeTab === 'matches'
                ? 'bg-amber-500 text-slate-950 font-black shadow-lg shadow-amber-500/20'
                : 'bg-slate-900/60 hover:bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
            }`}
          >
            <Clock className="w-4 h-4" />
            Log Riwayat Pertandingan
          </button>

          <button
            onClick={() => setActiveTab('tiers')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl transition whitespace-nowrap ${
              activeTab === 'tiers'
                ? 'bg-amber-500 text-slate-950 font-black shadow-lg shadow-amber-500/20'
                : 'bg-slate-900/60 hover:bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
            }`}
          >
            <Trophy className="w-4 h-4" />
            Struktur Rank Matrix
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="max-w-7xl mx-auto px-4 sm:px-8 pt-6">
        {/* ========================================================= */}
        {/* TAB 1: OVERVIEW & SERVER STATUS                           */}
        {/* ========================================================= */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* Top KPI Metric Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 shadow-xl">
                <div className="flex items-center justify-between text-slate-400 mb-2">
                  <span className="text-xs font-bold uppercase tracking-wider">Total Pemain</span>
                  <Users className="w-4 h-4 text-emerald-400" />
                </div>
                <div className="text-2xl sm:text-3xl font-black text-white font-mono">
                  {stats?.totalUsers ?? '...'}
                </div>
                <span className="text-[11px] text-slate-500 mt-1 block">
                  {stats?.bannedUsers ?? 0} akun dibekukan (banned)
                </span>
              </div>

              <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 shadow-xl">
                <div className="flex items-center justify-between text-slate-400 mb-2">
                  <span className="text-xs font-bold uppercase tracking-wider">Meja Aktif</span>
                  <Gamepad2 className="w-4 h-4 text-amber-400" />
                </div>
                <div className="text-2xl sm:text-3xl font-black text-amber-300 font-mono">
                  {stats?.activeRoomsCount ?? '...'}
                </div>
                <span className="text-[11px] text-slate-500 mt-1 block">
                  {stats?.playingRoomsCount ?? 0} meja sedang bertanding
                </span>
              </div>

              <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 shadow-xl">
                <div className="flex items-center justify-between text-slate-400 mb-2">
                  <span className="text-xs font-bold uppercase tracking-wider">Pemain di Meja</span>
                  <Activity className="w-4 h-4 text-cyan-400" />
                </div>
                <div className="text-2xl sm:text-3xl font-black text-cyan-300 font-mono">
                  {stats?.activePlayersInRooms ?? 0}
                </div>
                <span className="text-[11px] text-slate-500 mt-1 block">Pemain aktif di meja</span>
              </div>

              <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 shadow-xl">
                <div className="flex items-center justify-between text-slate-400 mb-2">
                  <span className="text-xs font-bold uppercase tracking-wider">Total Pertandingan</span>
                  <Trophy className="w-4 h-4 text-purple-400" />
                </div>
                <div className="text-2xl sm:text-3xl font-black text-purple-300 font-mono">
                  {stats?.totalMatches ?? '...'}
                </div>
                <span className="text-[11px] text-slate-500 mt-1 block">Pertandingan selesai</span>
              </div>
            </div>

            {/* Rank Distribution Section */}
            <div className="p-6 rounded-3xl bg-slate-900/80 border border-slate-800 shadow-xl">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Trophy className="w-5 h-5 text-amber-400" />
                  <h2 className="text-base font-bold text-white">Distribusi Rank Pemain Aktif</h2>
                </div>
                <button
                  onClick={fetchStats}
                  className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs flex items-center gap-1 transition"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${loadingStats ? 'animate-spin' : ''}`} />
                  Refresh
                </button>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
                {RANK_TIERS.map((tier) => {
                  const count = stats?.tierCounts?.[tier.tier] || 0;
                  return (
                    <div
                      key={tier.tier}
                      className={`p-3.5 rounded-2xl border ${tier.badgeBg} ${tier.badgeBorder} text-center`}
                    >
                      <span className="text-2xl block mb-1">{tier.icon}</span>
                      <span className={`text-xs font-black uppercase block ${tier.badgeText}`}>
                        {tier.name}
                      </span>
                      <span className="text-lg font-black text-white font-mono mt-1 block">
                        {count} <span className="text-[10px] text-slate-400 font-normal">user</span>
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* System Info Banner */}
            <div className="p-5 rounded-2xl bg-slate-950/80 border border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <Server className="w-6 h-6 text-emerald-400 shrink-0" />
                <div>
                  <h3 className="text-sm font-bold text-white">Status Layanan Game</h3>
                  <p className="text-xs text-slate-400">
                    Sistem Berjalan Normal • Semua Layanan Siap
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-xs font-bold text-emerald-400">Online</span>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* TAB 2: MANAJEMEN USER & RANK EDITOR                       */}
        {/* ========================================================= */}
        {activeTab === 'users' && (
          <div className="space-y-4">
            {/* Header / Filter Toolbar */}
            <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 shadow-xl">
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 flex-1">
                {/* Search Input */}
                <div className="relative flex-1">
                  <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Cari username, nickname, email..."
                    value={searchUser}
                    onChange={(e) => setSearchUser(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && fetchUsers()}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
                  />
                </div>

                {/* Tier Filter */}
                <select
                  value={filterTier}
                  onChange={(e) => setFilterTier(e.target.value)}
                  className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-300 focus:outline-none focus:border-amber-500"
                >
                  <option value="ALL">Semua Tier</option>
                  {RANK_TIERS.map((t) => (
                    <option key={t.tier} value={t.tier}>
                      {t.icon} {t.name}
                    </option>
                  ))}
                </select>

                {/* Role Filter */}
                <select
                  value={filterRole}
                  onChange={(e) => setFilterRole(e.target.value)}
                  className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-300 focus:outline-none focus:border-amber-500"
                >
                  <option value="ALL">Semua Role</option>
                  <option value="user">User Biasa</option>
                  <option value="admin">Administrator</option>
                </select>

                <button
                  onClick={fetchUsers}
                  disabled={loadingUsers}
                  className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold text-white transition flex items-center justify-center gap-1.5"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${loadingUsers ? 'animate-spin' : ''}`} />
                  Cari
                </button>
              </div>

              {/* Create User Button */}
              <button
                onClick={() => {
                  setFormNickname('');
                  setFormUsername('');
                  setFormEmail('');
                  setFormPassword('password123');
                  setFormAvatar('avatar_1');
                  setFormRole('user');
                  setFormRankTier('WARRIOR');
                  setFormRankDivision('III');
                  setFormRankStars(0);
                  setFormRankScore(0);
                  setActionMsg(null);
                  setShowCreateModal(true);
                }}
                className="px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-slate-950 text-xs font-black shadow-lg flex items-center justify-center gap-1.5 transition active:scale-95"
              >
                <PlusCircle className="w-4 h-4" />
                Tambah Pemain Baru
              </button>
            </div>

            {/* Users Data Table */}
            <div className="rounded-3xl bg-slate-900/80 border border-slate-800 overflow-hidden shadow-2xl">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-950/80 border-b border-slate-800 text-slate-400 uppercase font-black tracking-wider text-[10px]">
                    <tr>
                      <th className="py-3.5 px-4">Pemain</th>
                      <th className="py-3.5 px-4">Role</th>
                      <th className="py-3.5 px-4">Rank & Bintang (Editable)</th>
                      <th className="py-3.5 px-4">MMR Score</th>
                      <th className="py-3.5 px-4">Statistik (W/L)</th>
                      <th className="py-3.5 px-4">Status Akun</th>
                      <th className="py-3.5 px-4 text-right">Aksi Admin</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 font-medium">
                    {loadingUsers ? (
                      <tr>
                        <td colSpan={7} className="py-12 text-center text-slate-400">
                          Memuat data pemain dari database...
                        </td>
                      </tr>
                    ) : users.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="py-12 text-center text-slate-500">
                          Tidak ada pemain yang sesuai kriteria pencarian.
                        </td>
                      </tr>
                    ) : (
                      users.map((u) => {
                        const rankInfo = getRankInfo(u.rankTier, u.rankDivision, u.rankStars);
                        const winRate =
                          u.totalGames > 0 ? Math.round((u.wins / u.totalGames) * 100) : 0;
                        const isSelf = user?.id === u.id;

                        return (
                          <tr key={u.id} className="hover:bg-slate-800/40 transition">
                            {/* Player Info */}
                            <td className="py-3 px-4">
                              <div className="flex items-center gap-2.5">
                                <span className="text-xl">
                                  {AVATAR_OPTIONS.find((a) => a.id === u.avatar)?.icon || '🦁'}
                                </span>
                                <div>
                                  <div className="flex items-center gap-1.5">
                                    <span className="font-bold text-white text-sm">{u.nickname}</span>
                                    {isSelf && (
                                      <span className="text-[9px] px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 font-bold">
                                        (Anda)
                                      </span>
                                    )}
                                  </div>
                                  <span className="text-[11px] text-slate-400 font-mono block">
                                    @{u.username} • {u.email}
                                  </span>
                                </div>
                              </div>
                            </td>

                            {/* Role */}
                            <td className="py-3 px-4">
                              <span
                                className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${
                                  u.role === 'admin'
                                    ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                                    : 'bg-slate-800 text-slate-400 border border-slate-700'
                                }`}
                              >
                                {u.role === 'admin' ? '🛡️ Admin' : 'Pemain'}
                              </span>
                            </td>

                            {/* Rank & Stars */}
                            <td className="py-3 px-4">
                              <div className="flex items-center gap-2">
                                <span className="text-base">{rankInfo.icon}</span>
                                <div>
                                  <span className={`font-black text-xs block ${rankInfo.badgeText}`}>
                                    {rankInfo.title}
                                  </span>
                                  <span className="text-[11px] text-amber-400 font-mono tracking-wider font-bold">
                                    {rankInfo.starsDisplay}
                                  </span>
                                </div>
                              </div>
                            </td>

                            {/* MMR Score */}
                            <td className="py-3 px-4 font-mono font-bold text-slate-300">
                              {u.rankScore} pts
                            </td>

                            {/* Stats */}
                            <td className="py-3 px-4">
                              <span className="text-emerald-400 font-bold">{u.wins}M</span> /{' '}
                              <span className="text-rose-400 font-bold">{u.losses}K</span>
                              <span className="text-[11px] text-slate-400 block font-mono">
                                {winRate}% WR ({u.totalGames} game)
                              </span>
                            </td>

                            {/* Ban Status */}
                            <td className="py-3 px-4">
                              {u.isBanned ? (
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-red-950 text-red-400 border border-red-800 flex items-center gap-1 w-fit">
                                  <Ban className="w-3 h-3" /> Banned
                                </span>
                              ) : (
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-950/60 text-emerald-400 border border-emerald-800/60 flex items-center gap-1 w-fit">
                                  <Check className="w-3 h-3" /> Normal
                                </span>
                              )}
                            </td>

                            {/* Action Buttons */}
                            <td className="py-3 px-4 text-right">
                              <div className="flex items-center justify-end gap-1.5">
                                <button
                                  onClick={() => handleOpenEditUser(u)}
                                  className="p-1.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 transition"
                                  title="Edit Rank & Akun"
                                >
                                  <Edit3 className="w-3.5 h-3.5" />
                                </button>

                                <button
                                  onClick={() => setUserToDelete(u)}
                                  disabled={isSelf}
                                  className={`p-1.5 rounded-xl transition ${
                                    isSelf
                                      ? 'bg-slate-800 text-slate-600 cursor-not-allowed'
                                      : 'bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/40'
                                  }`}
                                  title="Hapus Akun"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* TAB 3: MEJA GAME AKTIF (LIVE ROOM MONITOR)                */}
        {/* ========================================================= */}
        {activeTab === 'rooms' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 rounded-2xl bg-slate-900/80 border border-slate-800 shadow-xl">
              <div>
                <h2 className="text-base font-bold text-white flex items-center gap-2">
                  <Gamepad2 className="w-5 h-5 text-amber-400" />
                  Live Room Monitor Server
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  Memantau meja dan pertandingan yang sedang berlangsung
                </p>
              </div>
              <button
                onClick={fetchRooms}
                disabled={loadingRooms}
                className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold text-white flex items-center gap-1.5 transition"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loadingRooms ? 'animate-spin' : ''}`} />
                Perbarui Meja
              </button>
            </div>

            {rooms.length === 0 ? (
              <div className="p-12 text-center bg-slate-900/60 border border-dashed border-slate-800 rounded-3xl">
                <Gamepad2 className="w-12 h-12 text-slate-600 mx-auto mb-2" />
                <h3 className="text-white font-bold text-sm">Tidak Ada Meja Aktif</h3>
                <p className="text-xs text-slate-400 mt-1">
                  Saat ini tidak ada pemain yang sedang berada di room atau meja permainan.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {rooms.map((room) => {
                  const isPlaying = room.status === 'PLAYING';
                  return (
                    <div
                      key={room.code}
                      className="p-5 rounded-2xl bg-slate-900/90 border border-slate-800 shadow-xl flex flex-col justify-between"
                    >
                      <div>
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <h3 className="font-bold text-white text-sm">{room.name}</h3>
                            <span className="text-[11px] font-mono text-amber-400 font-bold block mt-0.5">
                              Kode: {room.code}
                            </span>
                          </div>
                          <span
                            className={`text-[10px] px-2.5 py-0.5 rounded-full font-black uppercase border ${
                              room.mode === 'TEAM_BATTLE'
                                ? 'bg-purple-500/20 text-purple-300 border-purple-500/30'
                                : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                            }`}
                          >
                            {room.mode === 'TEAM_BATTLE' ? '2 vs 2' : 'Solo'}
                          </span>
                        </div>

                        {/* Room Meta */}
                        <div className="mt-3 flex items-center justify-between text-xs text-slate-300 pt-2 border-t border-slate-800">
                          <span>Status: <strong className={isPlaying ? 'text-amber-400' : 'text-emerald-400'}>{room.status}</strong></span>
                          <span>Ronde: <strong className="font-mono text-white">#{room.roundNumber}</strong></span>
                        </div>

                        {/* Players in Room */}
                        <div className="mt-3 space-y-1.5">
                          <span className="text-[10px] font-bold text-slate-400 uppercase block">
                            Daftar Kursi Pemain ({room.playerCount}/{room.maxPlayers}):
                          </span>
                          {room.players.map((p, idx) => (
                            <div
                              key={p.userId || idx}
                              className="flex items-center justify-between p-2 rounded-xl bg-slate-950/80 border border-slate-800 text-xs"
                            >
                              <div className="flex items-center gap-1.5 truncate">
                                <span>{AVATAR_OPTIONS.find((a) => a.id === p.avatar)?.icon || '🦁'}</span>
                                <span className="font-bold text-white truncate">{p.nickname}</span>
                                {p.isHost && <span className="text-[9px] text-amber-400 font-bold">👑 Host</span>}
                              </div>
                              <div className="flex items-center gap-1 text-[10px]">
                                {p.team && (
                                  <span className={`px-1 py-0.2 rounded font-black ${p.team === 'TEAM_A' ? 'bg-red-500/30 text-red-300' : 'bg-blue-500/30 text-blue-300'}`}>
                                    {p.team === 'TEAM_A' ? 'A' : 'B'}
                                  </span>
                                )}
                                <span className={p.isConnected ? 'text-emerald-400' : 'text-rose-400'}>
                                  {p.isConnected ? '● Online' : '○ DC'}
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="mt-4 pt-3 border-t border-slate-800">
                        <button
                          onClick={() => handleCloseRoom(room.code)}
                          className="w-full py-2 px-3 rounded-xl bg-rose-600/20 hover:bg-rose-600/30 text-rose-300 border border-rose-600/40 text-xs font-bold transition flex items-center justify-center gap-1.5"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          Paksa Tutup Meja Ini
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ========================================================= */}
        {/* TAB 4: RIWAYAT PERTANDINGAN (MATCH HISTORY LOGS)          */}
        {/* ========================================================= */}
        {activeTab === 'matches' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 rounded-2xl bg-slate-900/80 border border-slate-800 shadow-xl">
              <div>
                <h2 className="text-base font-bold text-white flex items-center gap-2">
                  <Clock className="w-5 h-5 text-amber-400" />
                  Log Riwayat Pertandingan
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  Menampilkan 50 pertandingan terakhir di server
                </p>
              </div>
              <button
                onClick={fetchMatches}
                disabled={loadingMatches}
                className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold text-white flex items-center gap-1.5 transition"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loadingMatches ? 'animate-spin' : ''}`} />
                Perbarui Log
              </button>
            </div>

            <div className="rounded-3xl bg-slate-900/80 border border-slate-800 overflow-hidden shadow-2xl">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-950/80 border-b border-slate-800 text-slate-400 uppercase font-black tracking-wider text-[10px]">
                    <tr>
                      <th className="py-3 px-4">Waktu</th>
                      <th className="py-3 px-4">Room</th>
                      <th className="py-3 px-4">Mode</th>
                      <th className="py-3 px-4">Juara / Hasil</th>
                      <th className="py-3 px-4">Detail Peserta & Balak</th>
                      <th className="py-3 px-4 text-right">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {loadingMatches ? (
                      <tr>
                        <td colSpan={6} className="py-12 text-center text-slate-400">
                          Memuat data log pertandingan...
                        </td>
                      </tr>
                    ) : matches.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="py-12 text-center text-slate-500">
                          Belum ada riwayat pertandingan tersimpan.
                        </td>
                      </tr>
                    ) : (
                      matches.map((m) => (
                        <tr key={m.id} className="hover:bg-slate-800/40 transition">
                          <td className="py-3 px-4 text-[11px] text-slate-400 font-mono">
                            {new Date(m.createdAt).toLocaleString('id-ID')}
                          </td>
                          <td className="py-3 px-4 font-mono font-bold text-amber-400">
                            {m.roomCode}
                          </td>
                          <td className="py-3 px-4">
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-800 text-slate-300">
                              {m.gameMode}
                            </span>
                          </td>
                          <td className="py-3 px-4">
                            {m.winningTeam ? (
                              <span className="font-bold text-amber-300 block">
                                {m.winningTeam === 'TEAM_A' ? '🛡️ Tim Merah' : '⚔️ Tim Biru'} Menang
                              </span>
                            ) : (
                              <span className="font-bold text-emerald-400 block">
                                🏆 {m.winnerNickname || 'Juara'}
                              </span>
                            )}
                            <span className="text-[10px] text-slate-500 uppercase">
                              {m.endReason === 'NORMAL_WIN' ? 'Normal Win' : 'Deadlock'}
                            </span>
                          </td>
                          <td className="py-3 px-4">
                            <div className="flex flex-wrap gap-1">
                              {m.participants?.map((p) => (
                                <span
                                  key={p.id}
                                  className={`text-[10px] px-2 py-0.5 rounded-md border ${
                                    p.isWinner
                                      ? 'bg-amber-950/60 border-amber-500/50 text-amber-200'
                                      : 'bg-slate-950 border-slate-800 text-slate-400'
                                  }`}
                                >
                                  {p.userNicknameSnapshot} ({p.remainingPips} balak)
                                </span>
                              ))}
                            </div>
                          </td>
                          <td className="py-3 px-4 text-right">
                            <button
                              onClick={() => handleDeleteMatch(m.id)}
                              className="p-1.5 rounded-lg bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 transition"
                              title="Hapus Log"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* TAB 5: STRUKTUR RANK MATRIX REFERENCE                     */}
        {/* ========================================================= */}
        {activeTab === 'tiers' && (
          <div className="space-y-4">
            <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 shadow-xl">
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <Trophy className="w-5 h-5 text-amber-400" />
                Daftar Hirarki Rank & Aturan Bintang
              </h2>
              <p className="text-xs text-slate-400 mt-1">
                Referensi struktur rank aktif: Menang +1 Bintang, Kalah -1 Bintang di semua tingkat.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {RANK_TIERS.map((tier, idx) => (
                <div
                  key={tier.tier}
                  className={`p-5 rounded-2xl border ${tier.badgeBg} ${tier.badgeBorder} shadow-lg`}
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2.5">
                      <span className="text-3xl">{tier.icon}</span>
                      <div>
                        <span className="text-[10px] text-slate-400 block uppercase font-bold">
                          Tier #{idx + 1}
                        </span>
                        <h3 className={`text-base font-black ${tier.badgeText}`}>{tier.name}</h3>
                      </div>
                    </div>
                    <span className="text-xs font-mono font-bold text-amber-400">
                      {tier.tier === 'MYTHIC' ? 'Endless ★' : `${tier.starsPerDivision}★ / Divisi`}
                    </span>
                  </div>

                  <div className="pt-3 border-t border-slate-800/80 text-xs text-slate-300">
                    <span className="text-[10px] font-bold text-slate-400 uppercase block mb-1">
                      Divisi:
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {tier.divisions.map((div) => (
                        <span
                          key={div}
                          className="px-2.5 py-0.5 rounded-lg bg-slate-950/80 border border-slate-800 font-mono font-bold text-white text-[11px]"
                        >
                          {tier.name} {div}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>

      {/* ========================================================= */}
      {/* MODAL: EDIT USER & EDIT RANK (FITUR UTAMA)                */}
      {/* ========================================================= */}
      {editingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 overflow-y-auto animate-fade-in">
          <div className="bg-slate-900 border border-slate-700/80 rounded-3xl max-w-lg w-full p-6 shadow-2xl relative my-8">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Edit3 className="w-5 h-5 text-amber-400" />
                <h3 className="text-base font-black text-white">
                  Edit User & Rank: {editingUser.nickname}
                </h3>
              </div>
              <button
                onClick={() => setEditingUser(null)}
                className="text-slate-400 hover:text-white text-lg font-bold"
              >
                ✕
              </button>
            </div>

            {actionMsg && (
              <div
                className={`my-3 p-3 rounded-xl text-xs font-bold flex items-center gap-2 ${
                  actionMsg.type === 'success'
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                    : 'bg-red-500/20 text-red-300 border border-red-500/40'
                }`}
              >
                {actionMsg.type === 'success' ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <AlertTriangle className="w-4 h-4 shrink-0" />}
                <span>{actionMsg.text}</span>
              </div>
            )}

            <form onSubmit={handleSaveEditUser} className="space-y-4 mt-4 text-xs">
              {/* SECTION: RANK SETTINGS */}
              <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 space-y-3">
                <span className="font-black text-amber-300 uppercase tracking-wider flex items-center gap-1.5 text-[11px]">
                  <Trophy className="w-4 h-4 text-amber-400" />
                  Pengaturan Rank Pemain
                </span>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] font-bold text-slate-300 block mb-1">Tier Rank</label>
                    <select
                      value={formRankTier}
                      onChange={(e) => {
                        const newTier = e.target.value;
                        setFormRankTier(newTier);
                        const tierDef = RANK_TIERS.find((t) => t.tier === newTier);
                        if (tierDef) {
                          setFormRankDivision(tierDef.divisions[0] || 'III');
                        }
                      }}
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white font-bold focus:border-amber-500"
                    >
                      {RANK_TIERS.map((t) => (
                        <option key={t.tier} value={t.tier}>
                          {t.icon} {t.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-slate-300 block mb-1">Divisi</label>
                    <select
                      value={formRankDivision}
                      onChange={(e) => setFormRankDivision(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white font-bold focus:border-amber-500"
                    >
                      {(RANK_TIERS.find((t) => t.tier === formRankTier)?.divisions || ['III']).map((d) => (
                        <option key={d} value={d}>
                          Divisi {d}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] font-bold text-slate-300 block mb-1">
                      Jumlah Bintang Saat Ini (★)
                    </label>
                    <input
                      type="number"
                      min={0}
                      max={formRankTier === 'MYTHIC' ? 9999 : 5}
                      value={formRankStars}
                      onChange={(e) => setFormRankStars(parseInt(e.target.value, 10) || 0)}
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white font-mono font-bold focus:border-amber-500"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-slate-300 block mb-1">
                      Total Poin MMR
                    </label>
                    <input
                      type="number"
                      min={0}
                      value={formRankScore}
                      onChange={(e) => setFormRankScore(parseInt(e.target.value, 10) || 0)}
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white font-mono font-bold focus:border-amber-500"
                    />
                  </div>
                </div>
              </div>

              {/* SECTION: PROFILE & ROLE */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-300 block mb-1">Nickname</label>
                  <input
                    type="text"
                    value={formNickname}
                    onChange={(e) => setFormNickname(e.target.value)}
                    required
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white font-bold focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-300 block mb-1">Avatar</label>
                  <select
                    value={formAvatar}
                    onChange={(e) => setFormAvatar(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white font-bold focus:border-amber-500"
                  >
                    {AVATAR_OPTIONS.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.icon} {a.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-300 block mb-1">Role Akun</label>
                  <select
                    value={formRole}
                    onChange={(e) => setFormRole(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white font-bold focus:border-amber-500"
                  >
                    <option value="user">User Biasa</option>
                    <option value="admin">Administrator</option>
                  </select>
                </div>

                <div>
                  <label className="font-bold text-slate-300 block mb-1">Status Blokir</label>
                  <select
                    value={formIsBanned ? 'banned' : 'active'}
                    onChange={(e) => setFormIsBanned(e.target.value === 'banned')}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white font-bold focus:border-amber-500"
                  >
                    <option value="active">Aktif (Normal)</option>
                    <option value="banned">Dibekukan (Banned)</option>
                  </select>
                </div>
              </div>

              {/* SECTION: RESET PASSWORD */}
              <div>
                <label className="font-bold text-slate-300 block mb-1">
                  Reset Password Baru (Opsional, kosongkan jika tidak diubah)
                </label>
                <input
                  type="text"
                  placeholder="Ketik password baru jika ingin mereset..."
                  value={formPassword}
                  onChange={(e) => setFormPassword(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white font-mono focus:border-amber-500"
                />
              </div>

              {/* SECTION: STATS OVERRIDE */}
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="font-bold text-slate-400 block mb-1">Total Game</label>
                  <input
                    type="number"
                    min={0}
                    value={formTotalGames}
                    onChange={(e) => setFormTotalGames(parseInt(e.target.value, 10) || 0)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white font-mono"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-400 block mb-1">Menang (Wins)</label>
                  <input
                    type="number"
                    min={0}
                    value={formWins}
                    onChange={(e) => setFormWins(parseInt(e.target.value, 10) || 0)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white font-mono"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-400 block mb-1">Kalah (Losses)</label>
                  <input
                    type="number"
                    min={0}
                    value={formLosses}
                    onChange={(e) => setFormLosses(parseInt(e.target.value, 10) || 0)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white font-mono"
                  />
                </div>
              </div>

              <div className="pt-3 border-t border-slate-800 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setEditingUser(null)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black shadow-lg transition active:scale-95 disabled:opacity-50"
                >
                  {actionLoading ? 'Menyimpan...' : 'Simpan Perubahan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL: CREATE NEW USER                                    */}
      {/* ========================================================= */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 overflow-y-auto animate-fade-in">
          <div className="bg-slate-900 border border-slate-700/80 rounded-3xl max-w-lg w-full p-6 shadow-2xl relative my-8">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <PlusCircle className="w-5 h-5 text-emerald-400" />
                <h3 className="text-base font-black text-white">Tambah Akun Pemain Baru</h3>
              </div>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-slate-400 hover:text-white text-lg font-bold"
              >
                ✕
              </button>
            </div>

            {actionMsg && (
              <div
                className={`my-3 p-3 rounded-xl text-xs font-bold flex items-center gap-2 ${
                  actionMsg.type === 'success'
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                    : 'bg-red-500/20 text-red-300 border border-red-500/40'
                }`}
              >
                {actionMsg.type === 'success' ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <AlertTriangle className="w-4 h-4 shrink-0" />}
                <span>{actionMsg.text}</span>
              </div>
            )}

            <form onSubmit={handleCreateNewUser} className="space-y-4 mt-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-300 block mb-1">Username</label>
                  <input
                    type="text"
                    placeholder="contoh: player_baru"
                    value={formUsername}
                    onChange={(e) => setFormUsername(e.target.value)}
                    required
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white font-mono focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-300 block mb-1">Email</label>
                  <input
                    type="email"
                    placeholder="player@example.com"
                    value={formEmail}
                    onChange={(e) => setFormEmail(e.target.value)}
                    required
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white font-mono focus:border-emerald-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-300 block mb-1">Nickname</label>
                  <input
                    type="text"
                    placeholder="Nama tampilan di game"
                    value={formNickname}
                    onChange={(e) => setFormNickname(e.target.value)}
                    required
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white font-bold focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-300 block mb-1">Password</label>
                  <input
                    type="text"
                    value={formPassword}
                    onChange={(e) => setFormPassword(e.target.value)}
                    required
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white font-mono focus:border-emerald-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-300 block mb-1">Tier Rank Awal</label>
                  <select
                    value={formRankTier}
                    onChange={(e) => {
                      const newTier = e.target.value;
                      setFormRankTier(newTier);
                      const tierDef = RANK_TIERS.find((t) => t.tier === newTier);
                      if (tierDef) {
                        setFormRankDivision(tierDef.divisions[0] || 'III');
                      }
                    }}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white font-bold focus:border-emerald-500"
                  >
                    {RANK_TIERS.map((t) => (
                      <option key={t.tier} value={t.tier}>
                        {t.icon} {t.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="font-bold text-slate-300 block mb-1">Divisi Awal</label>
                  <select
                    value={formRankDivision}
                    onChange={(e) => setFormRankDivision(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white font-bold focus:border-emerald-500"
                  >
                    {(RANK_TIERS.find((t) => t.tier === formRankTier)?.divisions || ['III']).map((d) => (
                      <option key={d} value={d}>
                        Divisi {d}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-300 block mb-1">Bintang Awal (★)</label>
                  <input
                    type="number"
                    min={0}
                    value={formRankStars}
                    onChange={(e) => setFormRankStars(parseInt(e.target.value, 10) || 0)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white font-mono"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-300 block mb-1">Role Akun</label>
                  <select
                    value={formRole}
                    onChange={(e) => setFormRole(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white font-bold"
                  >
                    <option value="user">User Biasa</option>
                    <option value="admin">Administrator</option>
                  </select>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-800 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-black shadow-lg transition active:scale-95 disabled:opacity-50"
                >
                  {actionLoading ? 'Mendaftarkan...' : 'Buat Akun Sekarang'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL: DELETE CONFIRMATION                                */}
      {/* ========================================================= */}
      {userToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fade-in">
          <div className="bg-slate-900 border border-rose-500/50 rounded-3xl max-w-sm w-full p-6 shadow-2xl text-center">
            <div className="w-12 h-12 rounded-full bg-rose-500/20 border border-rose-500/40 text-rose-400 flex items-center justify-center mx-auto mb-3">
              <Trash2 className="w-6 h-6" />
            </div>
            <h3 className="text-base font-black text-white">Hapus Akun Pengguna?</h3>
            <p className="text-xs text-slate-300 mt-2">
              Apakah Anda yakin ingin menghapus akun <strong className="text-rose-400">{userToDelete.nickname}</strong> (@{userToDelete.username})? Tindakan ini permanen.
            </p>

            <div className="mt-5 flex items-center justify-center gap-3">
              <button
                onClick={() => setUserToDelete(null)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition"
              >
                Batal
              </button>
              <button
                onClick={handleConfirmDeleteUser}
                disabled={actionLoading}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-black shadow-lg transition active:scale-95 disabled:opacity-50"
              >
                {actionLoading ? 'Menghapus...' : 'Ya, Hapus Akun'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
