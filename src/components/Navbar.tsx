'use client';

import React, { useState } from 'react';
import { useAuthStore } from '@/stores/authStore';
import { useRoomStore } from '@/stores/roomStore';
import {
  Trophy,
  User as UserIcon,
  LogOut,
  Sparkles,
  BarChart3,
  Edit3,
} from 'lucide-react';
import { AuthModal } from './AuthModal';
import { ProfileModal } from './ProfileModal';
import { getRankInfo } from '@/lib/rank';

const AVATAR_ICONS: Record<string, string> = {
  avatar_1: '🦁',
  avatar_2: '🐯',
  avatar_3: '🦅',
  avatar_4: '🐲',
  avatar_5: '🐼',
  avatar_6: '🐺',
  avatar_7: '🦊',
  avatar_8: '👑',
};

export const Navbar: React.FC = () => {
  const { user, logout } = useAuthStore();
  const { currentRoom } = useRoomStore();
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [profileTab, setProfileTab] = useState<'profile' | 'stats' | 'history'>('profile');

  const winRate =
    user && user.totalGames > 0 ? Math.round((user.wins / user.totalGames) * 100) : 0;
  const rankInfo = getRankInfo(user?.rankTier, user?.rankDivision, user?.rankStars);

  return (
    <>
      <header className="sticky top-0 z-40 w-full bg-slate-950/80 backdrop-blur-xl border-b border-slate-800/80">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          {/* Logo */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-600 via-amber-400 to-yellow-300 flex items-center justify-center shadow-[0_0_15px_rgba(251,191,36,0.5)] transform -rotate-6">
              <span className="font-mono font-black text-slate-950 text-xl tracking-tighter">
                6:6
              </span>
            </div>
            <div>
              <span className="text-lg font-black tracking-tight text-white flex items-center gap-1.5">
                BALAK 3D
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                  Online
                </span>
              </span>
              <p className="text-[10px] text-slate-400 font-medium">Gaple Real-time Multiplayer</p>
            </div>
          </div>

          {/* User Controls */}
          <div className="flex items-center gap-3">
            {user ? (
              <div className="flex items-center gap-3">
                {/* Rank Badge */}
                <div
                  onClick={() => {
                    setProfileTab('stats');
                    setShowProfileModal(true);
                  }}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-2xl border cursor-pointer hover:scale-105 transition shadow-sm ${rankInfo.badgeBg} ${rankInfo.badgeBorder}`}
                  title={`${rankInfo.title} • Klik untuk melihat detail rank`}
                >
                  <span className="text-lg">{rankInfo.icon}</span>
                  <div className="flex flex-col text-left">
                    <span className={`text-[11px] font-black tracking-tight leading-none ${rankInfo.badgeText}`}>
                      {rankInfo.title}
                    </span>
                    <span className="text-[10px] text-amber-300 font-mono tracking-wider leading-none mt-1">
                      {rankInfo.starsDisplay}
                    </span>
                  </div>
                </div>

                {/* Win rate pill */}
                <div
                  onClick={() => {
                    setProfileTab('stats');
                    setShowProfileModal(true);
                  }}
                  className="hidden md:flex items-center gap-2 bg-slate-900 border border-slate-800 px-3 py-1.5 rounded-full cursor-pointer hover:border-slate-700 transition"
                  title="Klik untuk melihat statistik"
                >
                  <Trophy className="w-3.5 h-3.5 text-amber-400" />
                  <span className="text-xs font-mono font-bold text-amber-300">
                    {user.wins} Menang
                  </span>
                  <span className="text-[10px] text-slate-400">({winRate}%)</span>
                </div>

                {/* Nickname & Avatar Card */}
                <button
                  onClick={() => {
                    setProfileTab('profile');
                    setShowProfileModal(true);
                  }}
                  className="flex items-center gap-2.5 bg-slate-900/90 border border-slate-800 hover:border-amber-500/60 px-3 py-1.5 rounded-2xl transition shadow-sm group"
                >
                  <span className="text-xl group-hover:scale-110 transition transform">
                    {AVATAR_ICONS[user.avatar] || '🦁'}
                  </span>
                  <div className="text-left">
                    <div className="flex items-center gap-1">
                      <span className="text-xs font-bold text-white group-hover:text-amber-400 transition">
                        {user.nickname}
                      </span>
                      <Edit3 className="w-3 h-3 text-slate-500 group-hover:text-amber-400" />
                    </div>
                    <span className="text-[10px] text-slate-400 block font-mono">
                      @{user.username}
                    </span>
                  </div>
                </button>

                {/* Match History button */}
                <button
                  onClick={() => {
                    setProfileTab('history');
                    setShowProfileModal(true);
                  }}
                  title="Riwayat Pertandingan"
                  className="p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 hover:text-white hover:bg-slate-800 transition"
                >
                  <BarChart3 className="w-4 h-4" />
                </button>

                {/* Logout button */}
                <button
                  onClick={() => logout()}
                  title="Keluar Akun"
                  className="p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-red-400 hover:bg-red-950/40 transition"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <button
                onClick={() => setShowAuthModal(true)}
                className="flex items-center gap-2 px-5 py-2 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-bold text-xs shadow-lg transition active:scale-95"
              >
                <Sparkles className="w-4 h-4" />
                Masuk / Daftar Akun
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Auth Modal */}
      {showAuthModal && <AuthModal onClose={() => setShowAuthModal(false)} />}

      {/* Profile & Stats Modal */}
      {showProfileModal && (
        <ProfileModal
          initialTab={profileTab}
          onClose={() => setShowProfileModal(false)}
        />
      )}
    </>
  );
};
