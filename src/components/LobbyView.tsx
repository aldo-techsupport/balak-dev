'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRoomStore } from '@/stores/roomStore';
import { useAuthStore } from '@/stores/authStore';
import { useVoiceStore } from '@/stores/voiceStore';
import {
  Play,
  Sliders,
  Info,
  Shield,
  Crown,
  Users,
  Swords,
  PlusCircle,
  ArrowRight,
  RefreshCw,
  Zap,
  LogIn,
  AlertCircle,
  Trophy,
  Mic,
  MicOff,
  UserPlus,
  BarChart3,
  LogOut,
  ChevronLeft,
  Flame,
  Sparkles,
} from 'lucide-react';
import { AuthModal } from './AuthModal';
import { ProfileModal } from './ProfileModal';
import { FriendModal } from './FriendModal';
import { OptionModal } from './OptionModal';
import { AboutModal } from './AboutModal';
import { getRankInfo } from '@/lib/rank';
import { getSocket } from '@/lib/socket';

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

interface PublicRoom {
  code: string;
  name: string;
  mode: 'SOLO' | 'TEAM_BATTLE';
  playerCount: number;
  maxPlayers: number;
  status: string;
  hostNickname: string;
  hostAvatar?: string;
  hostRankTier?: string;
  hostRankDivision?: string;
  roundNumber?: number;
}

export const LobbyView: React.FC = () => {
  const { user, logout } = useAuthStore();
  const { createRoom, joinRoom, isCreating, isJoining, error, setError } = useRoomStore();
  const { isMicOn, isSpeaking, toggleMic } = useVoiceStore();

  // Navigation states
  const [activeScreen, setActiveScreen] = useState<'MAIN_MENU' | 'START_TABLES'>('MAIN_MENU');
  const [showOptionModal, setShowOptionModal] = useState(false);
  const [showAboutModal, setShowAboutModal] = useState(false);
  const [showFriendModal, setShowFriendModal] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);

  // Table rooms state
  const [publicRooms, setPublicRooms] = useState<PublicRoom[]>([]);
  const [isLoadingRooms, setIsLoadingRooms] = useState(false);
  const [filterMode, setFilterMode] = useState<'ALL' | 'SOLO' | 'TEAM_BATTLE'>('ALL');
  const [joinCodeInput, setJoinCodeInput] = useState('');

  // Create room form
  const [roomName, setRoomName] = useState(`Meja ${user?.nickname || 'Gaple'}`);
  const [roomMode, setRoomMode] = useState<'SOLO' | 'TEAM_BATTLE'>('SOLO');
  const [soloMaxPlayers, setSoloMaxPlayers] = useState<number>(4);
  const [isPublic, setIsPublic] = useState<boolean>(true);
  const [turnTimeout, setTurnTimeout] = useState<number>(20);

  // Table theme
  const [tableTheme, setTableTheme] = useState<'EMERALD' | 'SAPPHIRE' | 'CRIMSON'>('EMERALD');

  const isAdmin = user && (user.role === 'admin' || user.role === 'ADMIN');
  const rankInfo = getRankInfo(user?.rankTier, user?.rankDivision, user?.rankStars);
  const winRate =
    user && user.totalGames > 0 ? Math.round((user.wins / user.totalGames) * 100) : 0;

  useEffect(() => {
    if (user?.nickname) {
      setRoomName(`Meja ${user.nickname}`);
    }
  }, [user?.nickname]);



  // Fetch public rooms
  const fetchRooms = async () => {
    try {
      setIsLoadingRooms(true);
      const res = await fetch('/api/rooms');
      if (res.ok) {
        const data = await res.json();
        setPublicRooms(data.rooms || []);
      }
    } catch (err) {
      console.error('Fetch rooms error:', err);
    } finally {
      setIsLoadingRooms(false);
    }
  };

  useEffect(() => {
    fetchRooms();
    const interval = setInterval(fetchRooms, 3500);

    try {
      const socket = getSocket();
      socket.on('rooms:list-updated', (rooms: PublicRoom[]) => {
        if (Array.isArray(rooms)) setPublicRooms(rooms);
      });
      socket.emit('rooms:request', (rooms: PublicRoom[]) => {
        if (Array.isArray(rooms)) setPublicRooms(rooms);
      });
      return () => {
        socket.off('rooms:list-updated');
        clearInterval(interval);
      };
    } catch {
      return () => clearInterval(interval);
    }
  }, []);

  const handleQuickCreate = async (mode: 'SOLO' | 'TEAM_BATTLE') => {
    if (!user) {
      setShowAuthModal(true);
      return;
    }
    await createRoom({
      name: `Meja ${mode === 'TEAM_BATTLE' ? '2v2' : 'Solo'} ${user.nickname}`,
      mode,
      isPublic: true,
      maxPlayers: 4,
      turnTimeout: 20,
    });
  };

  const handleCreateRoomSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      setShowAuthModal(true);
      return;
    }

    const res = await createRoom({
      name: roomName,
      mode: roomMode,
      isPublic,
      maxPlayers: roomMode === 'TEAM_BATTLE' ? 4 : soloMaxPlayers,
      turnTimeout,
    });

    if (res.success) {
      setShowCreateModal(false);
    }
  };

  const handleJoinWithCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      setShowAuthModal(true);
      return;
    }
    if (!joinCodeInput.trim()) return;
    await joinRoom(joinCodeInput.trim());
  };

  const handleJoinClick = async (code: string) => {
    if (!user) {
      setShowAuthModal(true);
      return;
    }
    await joinRoom(code);
  };

  const filteredRooms = publicRooms.filter((r) => {
    if (filterMode === 'SOLO') return r.mode === 'SOLO';
    if (filterMode === 'TEAM_BATTLE') return r.mode === 'TEAM_BATTLE';
    return true;
  });

  return (
    <div className="relative min-h-screen bg-[#070b12] text-slate-100 flex flex-col select-none overflow-x-hidden">
      {/* Background Ambience: Luxury Domino Felt Table Gradient */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-emerald-950/30 via-slate-950 to-[#05080e] pointer-events-none" />
      <div className="absolute -top-32 left-1/2 -translate-x-1/2 w-[700px] h-[350px] bg-emerald-500/10 blur-[130px] pointer-events-none rounded-full" />

      {/* TOP BAR / PLAYER CONSOLE STATUS */}
      <header className="relative z-20 w-full bg-slate-950/80 backdrop-blur-xl border-b border-slate-800/80 px-3 sm:px-6 py-2.5">
        <div className="max-w-6xl mx-auto flex items-center justify-between gap-3">
          {/* Logo & Game Title */}
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-amber-600 via-amber-400 to-yellow-300 flex items-center justify-center shadow-[0_0_20px_rgba(251,191,36,0.4)] transform -rotate-3 shrink-0">
              <span className="font-mono font-black text-slate-950 text-xl tracking-tighter">
                6:6
              </span>
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-base sm:text-lg font-black tracking-tight text-white">
                  BALAK 3D
                </span>
                <span className="text-[10px] px-1.5 py-0.2 rounded font-black bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  DOMINO
                </span>
              </div>
              <p className="text-[10px] text-slate-400 font-medium hidden sm:block">
                Meja Gaple Tradisional
              </p>
            </div>
          </div>

          {/* Quick Player Bar & Utilities */}
          <div className="flex items-center gap-2">
            {user ? (
              <>
                {/* ON MIC Quick Toggle Pill */}
                <button
                  onClick={() => toggleMic()}
                  title={isMicOn ? 'Mikrofon Aktif (Klik untuk Mute)' : 'Mikrofon Mati (Klik untuk ON MIC)'}
                  className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-2xl border text-xs font-bold transition shadow-sm ${
                    isMicOn
                      ? isSpeaking
                        ? 'bg-emerald-500 text-slate-950 border-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.8)] animate-pulse'
                        : 'bg-emerald-950/80 text-emerald-300 border-emerald-500/50'
                      : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  {isMicOn ? (
                    <Mic className={`w-3.5 h-3.5 ${isSpeaking ? 'animate-bounce' : ''}`} />
                  ) : (
                    <MicOff className="w-3.5 h-3.5" />
                  )}
                  <span className="text-[10px] font-black hidden sm:inline">
                    {isMicOn ? (isSpeaking ? 'NGOMONG' : 'ON MIC') : 'MIC OFF'}
                  </span>
                </button>

                {/* Friend List Button */}
                <button
                  onClick={() => setShowFriendModal(true)}
                  title="Daftar Teman"
                  className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-2xl bg-slate-900 border border-slate-800 hover:border-amber-400/50 text-slate-200 hover:text-amber-300 transition shadow-sm"
                >
                  <Users className="w-3.5 h-3.5 text-amber-400" />
                  <span className="text-[11px] font-bold hidden sm:inline">Teman</span>
                </button>

                {/* Player Profile Card */}
                <button
                  onClick={() => setShowProfileModal(true)}
                  className="flex items-center gap-2 bg-slate-900/90 border border-slate-800 hover:border-amber-500/50 px-2.5 py-1.5 rounded-2xl transition group"
                >
                  <div className="relative">
                    <span className="text-xl group-hover:scale-110 transition inline-block">
                      {AVATAR_ICONS[user.avatar] || '🦁'}
                    </span>
                    {isMicOn && isSpeaking && (
                      <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-emerald-400 rounded-full animate-ping" />
                    )}
                  </div>
                  <div className="text-left hidden xs:block">
                    <div className="flex items-center gap-1">
                      <span className="text-xs font-bold text-white group-hover:text-amber-300 truncate max-w-[80px] sm:max-w-[110px]">
                        {user.nickname}
                      </span>
                    </div>
                    <span className="text-[9px] text-amber-300 font-mono block">
                      {rankInfo.title}
                    </span>
                  </div>
                </button>

                {/* Logout Button */}
                <button
                  onClick={() => logout()}
                  title="Keluar Akun"
                  className="p-2 rounded-2xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-red-400 transition"
                >
                  <LogOut className="w-3.5 h-3.5" />
                </button>
              </>
            ) : (
              <button
                onClick={() => setShowAuthModal(true)}
                className="flex items-center gap-1.5 px-4 py-2 rounded-2xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black text-xs shadow-lg transition active:scale-95"
              >
                <LogIn className="w-3.5 h-3.5" />
                <span>Masuk Akun</span>
              </button>
            )}
          </div>
        </div>
      </header>

      {/* ERROR TOAST */}
      {error && (
        <div className="max-w-xl mx-auto w-full px-4 pt-3">
          <div className="p-3 rounded-2xl bg-red-950/80 border border-red-500/60 text-red-200 text-xs flex items-center justify-between shadow-lg">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
              <span>{error}</span>
            </div>
            <button onClick={() => setError(null)} className="font-bold text-red-400 hover:text-white ml-2">
              ✕
            </button>
          </div>
        </div>
      )}

      {/* MAIN CONTENT AREA */}
      <main className="relative z-10 flex-1 flex flex-col items-center justify-center px-4 py-6 sm:py-10 max-w-5xl mx-auto w-full">
        {activeScreen === 'MAIN_MENU' ? (
          /* ========================================================
             SCREEN 1: GAME MAIN MENU (START, OPTION, ABOUTME, ADMIN)
             ======================================================== */
          <div className="w-full max-w-md sm:max-w-lg flex flex-col items-center text-center space-y-6">
            {/* Center Felt Table Emblem */}
            <div className="relative flex flex-col items-center justify-center p-6 sm:p-8 rounded-3xl bg-gradient-to-b from-slate-900/90 via-slate-950/90 to-black border-2 border-amber-500/40 shadow-[0_0_50px_rgba(245,158,11,0.15)] w-full">
              {/* Decorative Domino Tiles */}
              <div className="flex items-center justify-center gap-3 mb-3">
                <div className="w-12 h-20 rounded-xl bg-gradient-to-b from-[#fffff7] via-[#faf6ea] to-[#eee5ce] border-2 border-[#c5b593] shadow-xl flex flex-col items-center justify-between p-1.5 transform -rotate-12 hover:rotate-0 transition duration-300">
                  <div className="grid grid-cols-3 grid-rows-3 w-full h-8 items-center justify-items-center">
                    <span className="w-2 h-2 rounded-full bg-slate-900 col-start-1 row-start-1" />
                    <span className="w-2 h-2 rounded-full bg-slate-900 col-start-3 row-start-1" />
                    <span className="w-2 h-2 rounded-full bg-slate-900 col-start-1 row-start-2" />
                    <span className="w-2 h-2 rounded-full bg-slate-900 col-start-3 row-start-2" />
                    <span className="w-2 h-2 rounded-full bg-slate-900 col-start-1 row-start-3" />
                    <span className="w-2 h-2 rounded-full bg-slate-900 col-start-3 row-start-3" />
                  </div>
                  <div className="w-full h-[2px] bg-[#ab9875] my-0.5" />
                  <div className="grid grid-cols-3 grid-rows-3 w-full h-8 items-center justify-items-center">
                    <span className="w-2 h-2 rounded-full bg-red-600 col-start-1 row-start-1" />
                    <span className="w-2 h-2 rounded-full bg-red-600 col-start-3 row-start-1" />
                    <span className="w-2 h-2 rounded-full bg-red-600 col-start-1 row-start-2" />
                    <span className="w-2 h-2 rounded-full bg-red-600 col-start-3 row-start-2" />
                    <span className="w-2 h-2 rounded-full bg-red-600 col-start-1 row-start-3" />
                    <span className="w-2 h-2 rounded-full bg-red-600 col-start-3 row-start-3" />
                  </div>
                </div>

                <div className="w-12 h-20 rounded-xl bg-gradient-to-b from-[#fffff7] via-[#faf6ea] to-[#eee5ce] border-2 border-[#c5b593] shadow-xl flex flex-col items-center justify-between p-1.5 transform rotate-12 hover:rotate-0 transition duration-300">
                  <div className="grid grid-cols-3 grid-rows-3 w-full h-8 items-center justify-items-center">
                    <span className="w-2 h-2 rounded-full bg-red-600 col-start-2 row-start-2" />
                  </div>
                  <div className="w-full h-[2px] bg-[#ab9875] my-0.5" />
                  <div className="grid grid-cols-3 grid-rows-3 w-full h-8 items-center justify-items-center">
                    <span className="w-2 h-2 rounded-full bg-slate-900 col-start-1 row-start-1" />
                    <span className="w-2 h-2 rounded-full bg-slate-900 col-start-3 row-start-3" />
                  </div>
                </div>
              </div>

              <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-white flex items-center justify-center gap-2">
                <span>BALAK</span>
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-400 via-yellow-300 to-amber-500">
                  DOMINO
                </span>
              </h1>
              <p className="text-xs text-amber-300 font-mono tracking-widest uppercase mt-1">
                GAPLE INDONESIA • MEJA 3D
              </p>
            </div>

            {/* ========================================================
                THE 4 CORE GAME MENU BUTTONS
                ======================================================== */}
            <div className="w-full space-y-3">
              {/* 1. START */}
              <button
                onClick={() => setActiveScreen('START_TABLES')}
                className="w-full py-4 px-6 rounded-2xl bg-gradient-to-r from-emerald-500 via-teal-400 to-emerald-500 hover:from-emerald-400 hover:to-teal-300 text-slate-950 font-black text-lg tracking-wide uppercase shadow-[0_0_30px_rgba(16,185,129,0.4)] flex items-center justify-between transition-all transform hover:scale-[1.02] active:scale-[0.98] group"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-slate-950/20 flex items-center justify-center">
                    <Play className="w-6 h-6 fill-current text-slate-950 group-hover:scale-110 transition" />
                  </div>
                  <div className="text-left">
                    <span className="block font-black text-lg sm:text-xl leading-none">START</span>
                    <span className="text-[10px] text-slate-900 font-bold">
                      Mulai Main & Pilih Meja
                    </span>
                  </div>
                </div>
                <ArrowRight className="w-5 h-5 text-slate-950 group-hover:translate-x-1 transition" />
              </button>

              {/* 2. OPTION */}
              <button
                onClick={() => setShowOptionModal(true)}
                className="w-full py-3.5 px-6 rounded-2xl bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 hover:from-slate-800 hover:to-slate-700 border border-slate-700/80 hover:border-amber-400/60 text-white font-black text-base tracking-wide uppercase shadow-lg flex items-center justify-between transition-all transform hover:scale-[1.01] active:scale-[0.98] group"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
                    <Sliders className="w-5 h-5 group-hover:rotate-45 transition" />
                  </div>
                  <div className="text-left">
                    <span className="block font-black text-base leading-none">OPTION</span>
                    <span className="text-[10px] text-slate-400 font-medium">
                      Suara • ON MIC • Tema Meja
                    </span>
                  </div>
                </div>
                <span className="text-xs text-amber-400 font-bold group-hover:translate-x-1 transition">
                  Pengaturan ▶
                </span>
              </button>

              {/* 3. ABOUTME */}
              <button
                onClick={() => setShowAboutModal(true)}
                className="w-full py-3.5 px-6 rounded-2xl bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 hover:from-slate-800 hover:to-slate-700 border border-slate-700/80 hover:border-blue-400/60 text-white font-black text-base tracking-wide uppercase shadow-lg flex items-center justify-between transition-all transform hover:scale-[1.01] active:scale-[0.98] group"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
                    <Info className="w-5 h-5 group-hover:scale-110 transition" />
                  </div>
                  <div className="text-left">
                    <span className="block font-black text-base leading-none">ABOUT ME</span>
                    <span className="text-[10px] text-slate-400 font-medium">
                      Aturan Gaple • Cara Bermain
                    </span>
                  </div>
                </div>
                <span className="text-xs text-blue-400 font-bold group-hover:translate-x-1 transition">
                  Info ▶
                </span>
              </button>

              {/* 4. ADMIN-PANEL (HANYA MUNCUL JIKA ROLE DIA ADMIN) */}
              {isAdmin && (
                <Link
                  href="/admin"
                  className="w-full py-3.5 px-6 rounded-2xl bg-gradient-to-r from-amber-950/80 via-red-950/80 to-amber-950/80 hover:from-amber-900/90 hover:to-red-900/90 border-2 border-amber-400 text-amber-200 font-black text-base tracking-wide uppercase shadow-[0_0_25px_rgba(251,191,36,0.3)] flex items-center justify-between transition-all transform hover:scale-[1.01] active:scale-[0.98] group"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-amber-400 text-slate-950 flex items-center justify-center shadow-md">
                      <Shield className="w-5 h-5 fill-current" />
                    </div>
                    <div className="text-left">
                      <span className="block font-black text-base text-amber-300 leading-none flex items-center gap-1.5">
                        ADMIN-PANEL
                        <Crown className="w-4 h-4 text-amber-400 fill-amber-400" />
                      </span>
                      <span className="text-[10px] text-amber-200/80 font-medium">
                        Kelola Meja, User, & Server
                      </span>
                    </div>
                  </div>
                  <span className="text-xs text-amber-400 font-black group-hover:translate-x-1 transition">
                    Buka Panel 🛡️
                  </span>
                </Link>
              )}
            </div>

            {/* Quick Rank Snapshot at bottom */}
            {user && (
              <div className="w-full flex items-center justify-between p-3 rounded-2xl bg-slate-950/80 border border-slate-800 text-xs">
                <div className="flex items-center gap-2">
                  <span className="text-2xl">{rankInfo.icon}</span>
                  <div className="text-left">
                    <span className="font-bold text-white block">{rankInfo.title}</span>
                    <span className="text-[10px] text-amber-300 font-mono">
                      {rankInfo.starsDisplay}
                    </span>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-[10px] text-slate-400 block">Menang</span>
                  <span className="font-black text-emerald-400 font-mono text-sm">
                    {user.wins} ({winRate}%)
                  </span>
                </div>
              </div>
            )}
          </div>
        ) : (
          /* ========================================================
             SCREEN 2: START / MEJA PERTANDINGAN HUB
             ======================================================== */
          <div className="w-full space-y-6">
            {/* Navigation Header */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
              <button
                onClick={() => setActiveScreen('MAIN_MENU')}
                className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-800 hover:border-amber-400/50 text-slate-300 hover:text-white text-xs font-bold transition active:scale-95"
              >
                <ChevronLeft className="w-4 h-4 text-amber-400" />
                <span>Kembali ke Menu Utama</span>
              </button>

              <div className="flex items-center gap-2 w-full sm:w-auto">
                {/* Join Code Input Form */}
                <form onSubmit={handleJoinWithCode} className="flex-1 sm:flex-initial flex items-center gap-1.5">
                  <input
                    type="text"
                    placeholder="KODE MEJA"
                    value={joinCodeInput}
                    onChange={(e) => setJoinCodeInput(e.target.value.toUpperCase())}
                    maxLength={6}
                    className="w-full sm:w-32 bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white font-mono uppercase text-center placeholder-slate-500 focus:outline-none focus:border-amber-400"
                  />
                  <button
                    type="submit"
                    disabled={isJoining || !joinCodeInput.trim()}
                    className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 text-slate-950 font-black text-xs hover:brightness-110 disabled:opacity-50 transition"
                  >
                    Gabung
                  </button>
                </form>

                <button
                  onClick={() => setShowCreateModal(true)}
                  className="px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 font-black text-xs hover:brightness-110 transition flex items-center gap-1.5 shrink-0"
                >
                  <PlusCircle className="w-4 h-4" />
                  <span>Buat Meja</span>
                </button>
              </div>
            </div>

            {/* Quick Play Presets */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Preset Solo */}
              <div
                onClick={() => handleQuickCreate('SOLO')}
                className="p-5 rounded-3xl bg-gradient-to-br from-emerald-950/70 to-slate-950 border border-emerald-500/40 hover:border-emerald-400 transition cursor-pointer shadow-xl flex items-center justify-between group"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                      <Users className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="font-black text-white text-base">Main Solo (4 Pemain)</h3>
                      <p className="text-[11px] text-slate-400">Pertandingan individu klasik</p>
                    </div>
                  </div>
                  <span className="inline-block mt-3 px-3 py-1 rounded-xl bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[10px] font-black uppercase">
                    ⚡ Buat Meja Solo Instan
                  </span>
                </div>
                <ArrowRight className="w-5 h-5 text-emerald-400 group-hover:translate-x-1.5 transition" />
              </div>

              {/* Preset 2v2 Team Battle */}
              <div
                onClick={() => handleQuickCreate('TEAM_BATTLE')}
                className="p-5 rounded-3xl bg-gradient-to-br from-purple-950/70 to-slate-950 border border-purple-500/40 hover:border-purple-400 transition cursor-pointer shadow-xl flex items-center justify-between group"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <div className="w-10 h-10 rounded-2xl bg-purple-500/20 text-purple-400 flex items-center justify-center">
                      <Swords className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="font-black text-white text-base">Team Battle (2 vs 2)</h3>
                      <p className="text-[11px] text-slate-400">Kerja sama tim Merah vs Biru</p>
                    </div>
                  </div>
                  <span className="inline-block mt-3 px-3 py-1 rounded-xl bg-purple-500/20 text-purple-300 border border-purple-500/40 text-[10px] font-black uppercase">
                    ⚔️ Buat Meja 2v2 Instan
                  </span>
                </div>
                <ArrowRight className="w-5 h-5 text-purple-400 group-hover:translate-x-1.5 transition" />
              </div>
            </div>

            {/* LIVE TABLES BROWSER */}
            <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-4 sm:p-6 shadow-xl">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-4">
                <div className="flex items-center gap-2">
                  <h2 className="text-base font-bold text-white">Daftar Meja Terbuka</h2>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-bold">
                    {filteredRooms.length} Meja
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  {/* Filter Mode */}
                  <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs font-semibold">
                    <button
                      onClick={() => setFilterMode('ALL')}
                      className={`px-2.5 py-1 rounded-lg transition ${
                        filterMode === 'ALL' ? 'bg-emerald-600 text-white' : 'text-slate-400'
                      }`}
                    >
                      Semua
                    </button>
                    <button
                      onClick={() => setFilterMode('SOLO')}
                      className={`px-2.5 py-1 rounded-lg transition ${
                        filterMode === 'SOLO' ? 'bg-emerald-600 text-white' : 'text-slate-400'
                      }`}
                    >
                      Solo
                    </button>
                    <button
                      onClick={() => setFilterMode('TEAM_BATTLE')}
                      className={`px-2.5 py-1 rounded-lg transition ${
                        filterMode === 'TEAM_BATTLE' ? 'bg-purple-600 text-white' : 'text-slate-400'
                      }`}
                    >
                      2v2
                    </button>
                  </div>

                  <button
                    onClick={fetchRooms}
                    disabled={isLoadingRooms}
                    className="p-2 rounded-xl bg-slate-800 text-slate-300 hover:text-white transition"
                    title="Segarkan Meja"
                  >
                    <RefreshCw className={`w-4 h-4 ${isLoadingRooms ? 'animate-spin' : ''}`} />
                  </button>
                </div>
              </div>

              {filteredRooms.length === 0 ? (
                <div className="text-center py-10 px-4 border border-dashed border-slate-800 rounded-2xl bg-slate-950/40">
                  <p className="text-white font-bold text-sm">Belum Ada Meja Terbuka</p>
                  <p className="text-slate-400 text-xs mt-1">
                    Buat meja baru dengan tombol di atas agar pemain lain dapat langsung bergabung.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {filteredRooms.map((room) => {
                    const isFull = room.playerCount >= room.maxPlayers;
                    const isPlaying = room.status === 'PLAYING';
                    const isTeam = room.mode === 'TEAM_BATTLE';

                    return (
                      <div
                        key={room.code}
                        className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800 hover:border-slate-700 transition flex flex-col justify-between"
                      >
                        <div>
                          <div className="flex items-start justify-between gap-2">
                            <div className="truncate">
                              <h4 className="font-bold text-white text-xs sm:text-sm truncate">
                                {room.name}
                              </h4>
                              <p className="text-[11px] font-mono text-amber-400 font-bold">
                                #{room.code}
                              </p>
                            </div>
                            <span
                              className={`text-[9px] px-2 py-0.5 rounded-full font-black uppercase shrink-0 border ${
                                isTeam
                                  ? 'bg-purple-500/20 text-purple-300 border-purple-500/30'
                                  : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                              }`}
                            >
                              {isTeam ? '2v2' : 'Solo'}
                            </span>
                          </div>

                          <div className="flex items-center justify-between text-xs text-slate-300 mt-3 pt-2 border-t border-slate-800/80">
                            <span className="text-[11px] text-slate-400">
                              {room.playerCount} / {room.maxPlayers} Pemain
                            </span>
                            <span
                              className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${
                                isPlaying
                                  ? 'bg-amber-500/20 text-amber-300'
                                  : isFull
                                  ? 'bg-slate-800 text-slate-400'
                                  : 'bg-emerald-500/20 text-emerald-300'
                              }`}
                            >
                              {isPlaying ? 'Sedang Main' : isFull ? 'Penuh' : 'Menunggu'}
                            </span>
                          </div>
                        </div>

                        <button
                          onClick={() => handleJoinClick(room.code)}
                          disabled={isFull || isPlaying || isJoining}
                          className={`mt-3 w-full py-2 px-3 rounded-xl text-xs font-black transition flex items-center justify-center gap-1.5 ${
                            isFull || isPlaying
                              ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                              : 'bg-gradient-to-r from-emerald-500 to-teal-400 text-slate-950 hover:brightness-110 active:scale-95 shadow-md'
                          }`}
                        >
                          <Zap className="w-3.5 h-3.5" />
                          <span>{isPlaying ? 'Sedang Main' : isFull ? 'Meja Penuh' : 'Gabung Meja'}</span>
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}
      </main>

      {/* CREATE ROOM MODAL */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fade-in">
          <div className="bg-slate-900 border border-slate-700/80 rounded-3xl max-w-md w-full p-5 sm:p-6 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
                <PlusCircle className="w-5 h-5 text-amber-400" />
                Buat Meja Baru
              </h3>
              <button onClick={() => setShowCreateModal(false)} className="text-slate-400 hover:text-white">
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateRoomSubmit} className="space-y-3.5 mt-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-300 mb-1">Nama Meja</label>
                <input
                  type="text"
                  value={roomName}
                  onChange={(e) => setRoomName(e.target.value)}
                  maxLength={30}
                  required
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-amber-400"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-300 mb-1">Mode Pertandingan</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setRoomMode('SOLO')}
                    className={`p-2.5 rounded-xl border text-left transition ${
                      roomMode === 'SOLO'
                        ? 'bg-emerald-950/60 border-emerald-500 text-white'
                        : 'bg-slate-950/60 border-slate-800 text-slate-400'
                    }`}
                  >
                    <p className="font-bold flex items-center gap-1.5">
                      <Users className="w-3.5 h-3.5 text-emerald-400" />
                      Solo (2-4P)
                    </p>
                  </button>

                  <button
                    type="button"
                    onClick={() => setRoomMode('TEAM_BATTLE')}
                    className={`p-2.5 rounded-xl border text-left transition ${
                      roomMode === 'TEAM_BATTLE'
                        ? 'bg-purple-950/60 border-purple-500 text-white'
                        : 'bg-slate-950/60 border-slate-800 text-slate-400'
                    }`}
                  >
                    <p className="font-bold flex items-center gap-1.5">
                      <Swords className="w-3.5 h-3.5 text-purple-400" />
                      2 vs 2 (Team)
                    </p>
                  </button>
                </div>
              </div>

              {roomMode === 'SOLO' && (
                <div>
                  <label className="block font-semibold text-slate-300 mb-1">Kapasitas Pemain</label>
                  <div className="grid grid-cols-3 gap-2">
                    {[2, 3, 4].map((count) => (
                      <button
                        key={count}
                        type="button"
                        onClick={() => setSoloMaxPlayers(count)}
                        className={`py-1.5 rounded-xl border font-bold transition ${
                          soloMaxPlayers === count
                            ? 'bg-amber-500/20 border-amber-400 text-amber-300'
                            : 'bg-slate-950 border-slate-800 text-slate-400'
                        }`}
                      >
                        {count} Pemain
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div>
                <label className="block font-semibold text-slate-300 mb-1">Batas Waktu Giliran</label>
                <select
                  value={turnTimeout}
                  onChange={(e) => setTurnTimeout(Number(e.target.value))}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-amber-400"
                >
                  <option value={15}>15 Detik (Cepat / Blitz)</option>
                  <option value={20}>20 Detik (Standar)</option>
                  <option value={30}>30 Detik (Santai)</option>
                </select>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 font-semibold"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isCreating}
                  className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold transition disabled:opacity-50"
                >
                  {isCreating ? 'Membuat...' : 'Buat Meja'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* POPUP MODALS */}
      {showAuthModal && <AuthModal onClose={() => setShowAuthModal(false)} />}
      {showProfileModal && <ProfileModal onClose={() => setShowProfileModal(false)} />}
      {showFriendModal && <FriendModal onClose={() => setShowFriendModal(false)} />}
      {showOptionModal && (
        <OptionModal
          onClose={() => setShowOptionModal(false)}
          tableTheme={tableTheme}
          onThemeChange={(theme) => setTableTheme(theme)}
        />
      )}
      {showAboutModal && <AboutModal onClose={() => setShowAboutModal(false)} />}
    </div>
  );
};
