'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuthStore } from '@/stores/authStore';
import { useRoomStore } from '@/stores/roomStore';
import {
  Trophy,
  User as UserIcon,
  LogOut,
  Sparkles,
  BarChart3,
  Edit3,
  ChevronLeft,
  Gamepad2,
} from 'lucide-react';
import { AuthModal } from './AuthModal';
import { ProfileModal } from './ProfileModal';
import { getRankInfo } from '@/lib/rank';

export const Navbar: React.FC = () => {
  const pathname = usePathname();
  const { user, logout } = useAuthStore();
  const { currentRoom } = useRoomStore();
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [profileTab, setProfileTab] = useState<'profile' | 'stats' | 'history'>('profile');

  // Do not render global navbar if on main game page or when in an active room
  // (LobbyView, RoomLobby, and GameTable3D manage their own dedicated responsive HUDs)
  if (pathname === '/' || currentRoom !== null) {
    return null;
  }

  const winRate =
    user && user.totalGames > 0 ? Math.round((user.wins / user.totalGames) * 100) : 0;
  const rankInfo = getRankInfo(user?.rankTier, user?.rankDivision, user?.rankStars);

  return (
    <>
      <header className="sticky top-0 z-40 w-full bg-slate-950/80 backdrop-blur-xl border-b border-slate-800/80 select-none">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          {/* Logo & Return to Game */}
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 hover:border-amber-400 text-xs font-bold text-slate-300 hover:text-white transition"
            >
              <ChevronLeft className="w-4 h-4 text-amber-400" />
              <span>Ke Meja Game</span>
            </Link>

            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-amber-600 via-amber-400 to-yellow-300 flex items-center justify-center shadow-md transform -rotate-3">
                <span className="font-mono font-black text-slate-950 text-base">6:6</span>
              </div>
              <div>
                <span className="text-base font-black tracking-tight text-white flex items-center gap-1.5">
                  BALAK 3D
                  <span className="text-[10px] px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                    DOMINO
                  </span>
                </span>
              </div>
            </div>
          </div>

          {/* User Controls */}
          <div className="flex items-center gap-3">
            {user ? (
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2 bg-slate-900 border border-slate-800 px-3 py-1.5 rounded-2xl">
                  <span className="text-xs font-bold text-white">{user.nickname}</span>
                  <span className="text-[10px] text-amber-300 font-mono">({rankInfo.title})</span>
                </div>

                <button
                  onClick={() => logout()}
                  title="Keluar Akun"
                  className="p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-red-400 transition"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <button
                onClick={() => setShowAuthModal(true)}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 text-slate-950 font-bold text-xs shadow-md transition"
              >
                Masuk / Daftar
              </button>
            )}
          </div>
        </div>
      </header>

      {showAuthModal && <AuthModal onClose={() => setShowAuthModal(false)} />}
      {showProfileModal && (
        <ProfileModal initialTab={profileTab} onClose={() => setShowProfileModal(false)} />
      )}
    </>
  );
};
