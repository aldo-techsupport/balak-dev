'use client';

import React, { useState, useEffect } from 'react';
import { useAuthStore } from '@/stores/authStore';
import {
  User,
  Trophy,
  Swords,
  Clock,
  Sparkles,
  Check,
  AlertCircle,
  BarChart3,
  Calendar,
} from 'lucide-react';

interface ProfileModalProps {
  initialTab?: 'profile' | 'stats' | 'history';
  onClose: () => void;
}

const AVATAR_OPTIONS = [
  { id: 'avatar_1', icon: '🦁', name: 'Singa Emas' },
  { id: 'avatar_2', icon: '🐯', name: 'Harimau Balak' },
  { id: 'avatar_3', icon: '🦅', name: 'Rajawali Domino' },
  { id: 'avatar_4', icon: '🐲', name: 'Naga Ceki' },
  { id: 'avatar_5', icon: '🐼', name: 'Pendekar Bambu' },
  { id: 'avatar_6', icon: '🐺', name: 'Serigala Malam' },
  { id: 'avatar_7', icon: '🦊', name: 'Rubah Cerdik' },
  { id: 'avatar_8', icon: '👑', name: 'Maharaja Gaple' },
];

export const ProfileModal: React.FC<ProfileModalProps> = ({
  initialTab = 'profile',
  onClose,
}) => {
  const { user, updateProfile } = useAuthStore();
  const [tab, setTab] = useState<'profile' | 'stats' | 'history'>(initialTab);

  // Form states
  const [nickname, setNickname] = useState(user?.nickname || '');
  const [selectedAvatar, setSelectedAvatar] = useState(user?.avatar || 'avatar_1');
  const [loading, setLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Stats & History data
  const [statsData, setStatsData] = useState<any>(null);
  const [loadingStats, setLoadingStats] = useState(false);

  useEffect(() => {
    if (tab === 'stats' || tab === 'history') {
      fetchStats();
    }
  }, [tab]);

  const fetchStats = async () => {
    try {
      setLoadingStats(true);
      const res = await fetch('/api/user/stats');
      if (res.ok) {
        const data = await res.json();
        setStatsData(data.stats);
      }
    } catch (err) {
      console.error('Fetch stats error:', err);
    } finally {
      setLoadingStats(false);
    }
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    const cleanNick = nickname.trim();
    if (cleanNick.length < 3 || cleanNick.length > 20) {
      setErrorMsg('Panjang nickname harus antara 3 hingga 20 karakter.');
      return;
    }

    if (!/^[a-zA-Z0-9 _-]+$/.test(cleanNick)) {
      setErrorMsg('Nickname hanya boleh berisi huruf, angka, spasi, dash, dan underscore.');
      return;
    }

    setLoading(true);
    const res = await updateProfile(cleanNick, selectedAvatar);
    setLoading(false);

    if (res.success) {
      setSuccessMsg('Profil dan nickname berhasil diperbarui!');
      setTimeout(() => setSuccessMsg(null), 3000);
    } else {
      setErrorMsg(res.error || 'Gagal memperbarui profil.');
    }
  };

  if (!user) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-sm p-4 animate-fade-in">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-xl w-full p-6 shadow-2xl relative overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <span className="text-2xl">
              {AVATAR_OPTIONS.find((a) => a.id === user.avatar)?.icon || '🦁'}
            </span>
            <div>
              <h2 className="text-base font-bold text-white">{user.nickname}</h2>
              <p className="text-[11px] font-mono text-slate-400">
                User ID: {user.id.substring(0, 8)}... • @{user.username}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white">
            ✕
          </button>
        </div>

        {/* Tab switchers */}
        <div className="flex items-center gap-2 my-4 bg-slate-950 p-1 rounded-2xl border border-slate-800 text-xs font-semibold">
          <button
            onClick={() => setTab('profile')}
            className={`flex-1 py-2 rounded-xl transition ${
              tab === 'profile' ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:text-white'
            }`}
          >
            Ubah Profil & Avatar
          </button>
          <button
            onClick={() => setTab('stats')}
            className={`flex-1 py-2 rounded-xl transition ${
              tab === 'stats' ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:text-white'
            }`}
          >
            Statistik Akun
          </button>
          <button
            onClick={() => setTab('history')}
            className={`flex-1 py-2 rounded-xl transition ${
              tab === 'history' ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:text-white'
            }`}
          >
            Riwayat Pertandingan
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto pr-1">
          {/* TAB 1: EDIT PROFILE & AVATAR */}
          {tab === 'profile' && (
            <form onSubmit={handleUpdateProfile} className="space-y-4">
              {successMsg && (
                <div className="p-3 rounded-xl bg-emerald-950/80 border border-emerald-500/60 text-emerald-200 text-xs flex items-center gap-2">
                  <Check className="w-4 h-4 text-emerald-400" />
                  <span>{successMsg}</span>
                </div>
              )}

              {errorMsg && (
                <div className="p-3 rounded-xl bg-red-950/80 border border-red-500/60 text-red-200 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-red-400" />
                  <span>{errorMsg}</span>
                </div>
              )}

              {/* Nickname input */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Nickname Permainan (3–20 Karakter)
                </label>
                <input
                  type="text"
                  value={nickname}
                  onChange={(e) => setNickname(e.target.value)}
                  maxLength={20}
                  required
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
                />
                <p className="text-[10px] text-slate-400 mt-1">
                  Nama ini akan terlihat di lobby, kursi meja, dan riwayat pertandingan.
                </p>
              </div>

              {/* Avatar Selector */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-2">
                  Pilih Avatar Master Domino
                </label>
                <div className="grid grid-cols-4 gap-2.5">
                  {AVATAR_OPTIONS.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setSelectedAvatar(item.id)}
                      className={`p-2 rounded-2xl border text-center transition ${
                        selectedAvatar === item.id
                          ? 'bg-amber-500/20 border-amber-400 ring-2 ring-amber-400/40 shadow-lg'
                          : 'bg-slate-950 border-slate-800 hover:border-slate-700'
                      }`}
                    >
                      <span className="text-2xl block mb-1">{item.icon}</span>
                      <span className="text-[10px] font-bold text-slate-200 block truncate">
                        {item.name}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-bold text-sm shadow-lg transition active:scale-95 disabled:opacity-50"
              >
                {loading ? 'Menyimpan...' : 'Simpan Perubahan'}
              </button>
            </form>
          )}

          {/* TAB 2: DETAILED STATS */}
          {tab === 'stats' && (
            <div className="space-y-4">
              {loadingStats ? (
                <div className="py-12 text-center text-slate-400">Memuat statistik...</div>
              ) : (
                <>
                  {/* Overall Summary Cards */}
                  <div className="grid grid-cols-3 gap-3">
                    <div className="bg-slate-950 border border-slate-800 p-3 rounded-2xl text-center">
                      <span className="text-[10px] text-slate-400 font-semibold block uppercase">
                        Total Main
                      </span>
                      <span className="text-xl font-bold font-mono text-white mt-0.5 block">
                        {user.totalGames}
                      </span>
                    </div>

                    <div className="bg-slate-950 border border-slate-800 p-3 rounded-2xl text-center">
                      <span className="text-[10px] text-slate-400 font-semibold block uppercase">
                        Menang / Kalah
                      </span>
                      <span className="text-xl font-bold font-mono text-emerald-400 mt-0.5 block">
                        {user.wins} <span className="text-xs text-slate-500">/ {user.losses}</span>
                      </span>
                    </div>

                    <div className="bg-slate-950 border border-slate-800 p-3 rounded-2xl text-center">
                      <span className="text-[10px] text-slate-400 font-semibold block uppercase">
                        Win Rate
                      </span>
                      <span className="text-xl font-bold font-mono text-amber-300 mt-0.5 block">
                        {user.totalGames > 0
                          ? Math.round((user.wins / user.totalGames) * 100)
                          : 0}
                        %
                      </span>
                    </div>
                  </div>

                  {/* Mode Breakdown: Solo vs Team Battle */}
                  <div className="grid grid-cols-2 gap-3 mt-4">
                    <div className="bg-slate-950/70 border border-slate-800 rounded-2xl p-4">
                      <div className="flex items-center gap-1.5 mb-2">
                        <User className="w-4 h-4 text-emerald-400" />
                        <h4 className="text-xs font-bold text-white">Mode Solo</h4>
                      </div>
                      <p className="text-xs text-slate-400">
                        Pertandingan: <span className="font-bold text-white">{user.soloGames}</span>
                      </p>
                      <p className="text-xs text-slate-400 mt-0.5">
                        Menang: <span className="font-bold text-emerald-400">{user.soloWins}</span>
                      </p>
                      <p className="text-xs text-slate-400 mt-0.5">
                        Win Rate:{' '}
                        <span className="font-bold text-amber-300">
                          {user.soloGames > 0
                            ? Math.round((user.soloWins / user.soloGames) * 100)
                            : 0}
                          %
                        </span>
                      </p>
                    </div>

                    <div className="bg-slate-950/70 border border-purple-900/40 rounded-2xl p-4">
                      <div className="flex items-center gap-1.5 mb-2">
                        <Swords className="w-4 h-4 text-purple-400" />
                        <h4 className="text-xs font-bold text-white">Team Battle (2v2)</h4>
                      </div>
                      <p className="text-xs text-slate-400">
                        Pertandingan: <span className="font-bold text-white">{user.teamGames}</span>
                      </p>
                      <p className="text-xs text-slate-400 mt-0.5">
                        Menang: <span className="font-bold text-purple-400">{user.teamWins}</span>
                      </p>
                      <p className="text-xs text-slate-400 mt-0.5">
                        Win Rate:{' '}
                        <span className="font-bold text-amber-300">
                          {user.teamGames > 0
                            ? Math.round((user.teamWins / user.teamGames) * 100)
                            : 0}
                          %
                        </span>
                      </p>
                    </div>
                  </div>
                </>
              )}
            </div>
          )}

          {/* TAB 3: MATCH HISTORY */}
          {tab === 'history' && (
            <div className="space-y-3">
              {loadingStats ? (
                <div className="py-12 text-center text-slate-400">Memuat riwayat pertandingan...</div>
              ) : !statsData?.history || statsData.history.length === 0 ? (
                <div className="py-12 text-center border-2 border-dashed border-slate-800 rounded-2xl">
                  <Trophy className="w-8 h-8 text-slate-600 mx-auto mb-2" />
                  <p className="text-slate-400 text-xs">Belum ada riwayat pertandingan selesai.</p>
                  <p className="text-slate-500 text-[10px] mt-1">
                    Mainkan game di room untuk mencatat rekor Anda!
                  </p>
                </div>
              ) : (
                statsData.history.map((item: any) => (
                  <div
                    key={item.id}
                    className="bg-slate-950/80 border border-slate-800 rounded-2xl p-3 flex items-center justify-between gap-3 text-xs"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span
                          className={`font-bold ${
                            item.isWinner ? 'text-emerald-400' : 'text-slate-400'
                          }`}
                        >
                          {item.isWinner ? 'MENANG 🏆' : 'KALAH'}
                        </span>
                        <span className="text-[10px] px-2 py-0.5 rounded bg-slate-800 text-slate-300 font-mono">
                          {item.gameMode === 'TEAM_BATTLE' ? '2v2 Team' : 'Solo'}
                        </span>
                        <span className="text-[10px] text-slate-500 font-mono">#{item.roomCode}</span>
                      </div>
                      <p className="text-[11px] text-slate-400 mt-1">
                        Sisa Balak:{' '}
                        <span className="font-mono font-bold text-amber-300">
                          {item.remainingPips} poin
                        </span>{' '}
                        • Pemenang: {item.winnerNickname}
                      </p>
                      <p className="text-[9px] text-slate-500 mt-0.5">
                        {new Date(item.createdAt).toLocaleDateString('id-ID', {
                          day: 'numeric',
                          month: 'short',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </p>
                    </div>

                    <div className="text-right">
                      <span className="text-[10px] text-slate-500 block">Snapshot Nickname:</span>
                      <span className="font-semibold text-slate-300 block">{item.participants.find((p: any) => p.userId === user.id)?.nickname}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
