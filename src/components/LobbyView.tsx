'use client';

import React, { useState, useEffect } from 'react';
import { useRoomStore } from '@/stores/roomStore';
import { useAuthStore } from '@/stores/authStore';
import {
  PlusCircle,
  Users,
  Swords,
  RefreshCw,
  Flame,
  ArrowRight,
  LogIn,
  AlertCircle,
  Zap,
  Shield,
  Crown,
  Trophy,
  Sparkles,
  Gamepad2,
} from 'lucide-react';
import { AuthModal } from './AuthModal';
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
  const { user } = useAuthStore();
  const { createRoom, joinRoom, isCreating, isJoining, error, setError } = useRoomStore();

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [joinCodeInput, setJoinCodeInput] = useState('');
  const [publicRooms, setPublicRooms] = useState<PublicRoom[]>([]);
  const [isLoadingRooms, setIsLoadingRooms] = useState(false);
  const [filterMode, setFilterMode] = useState<'ALL' | 'SOLO' | 'TEAM_BATTLE'>('ALL');

  // Create room form state
  const [roomName, setRoomName] = useState(`Meja ${user?.nickname || 'Gaple'}`);
  const [roomMode, setRoomMode] = useState<'SOLO' | 'TEAM_BATTLE'>('SOLO');
  const [soloMaxPlayers, setSoloMaxPlayers] = useState<number>(4);
  const [isPublic, setIsPublic] = useState<boolean>(true);
  const [turnTimeout, setTurnTimeout] = useState<number>(20);

  // Update room name default when user changes
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
    const interval = setInterval(fetchRooms, 3000);

    try {
      const socket = getSocket();
      socket.on('rooms:list-updated', (rooms: PublicRoom[]) => {
        if (Array.isArray(rooms)) {
          setPublicRooms(rooms);
        }
      });
      socket.emit('rooms:request', (rooms: PublicRoom[]) => {
        if (Array.isArray(rooms)) {
          setPublicRooms(rooms);
        }
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

  const handleOpenCreateModal = () => {
    if (!user) {
      setShowAuthModal(true);
      return;
    }
    setRoomName(`Meja ${user.nickname}`);
    setShowCreateModal(true);
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

  const rankInfo = getRankInfo(user?.rankTier, user?.rankDivision, user?.rankStars);
  const winRate =
    user && user.totalGames > 0 ? Math.round((user.wins / user.totalGames) * 100) : 0;

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-8">
      {/* RANK SEKARANG FULL (Pengganti Hero Text) */}
      <div
        className={`relative overflow-hidden rounded-3xl border-2 p-6 sm:p-8 shadow-2xl ${rankInfo.badgeBg} ${rankInfo.badgeBorder} bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950`}
      >
        {/* Glow & Backdrop decorative effects */}
        <div className="absolute top-0 right-0 -mt-8 -mr-8 w-80 h-80 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-1/3 -mb-8 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-6">
          {/* LEFT: Rank Emblem, Title, Stars, & Division Status */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5">
            {/* Big Rank Emblem */}
            <div className="relative flex items-center justify-center w-24 h-24 sm:w-28 sm:h-28 rounded-3xl bg-slate-900/90 border-2 border-amber-400/40 shadow-[0_0_30px_rgba(245,158,11,0.25)] shrink-0">
              <span className="text-5xl sm:text-6xl select-none filter drop-shadow-[0_4px_10px_rgba(0,0,0,0.8)]">
                {rankInfo.icon}
              </span>
              <div className="absolute -bottom-2 px-2.5 py-0.5 rounded-full bg-slate-950 border border-amber-400/50 text-[10px] font-black tracking-widest text-amber-300 uppercase shadow-md">
                {rankInfo.tier}
              </div>
            </div>

            {/* Rank Details */}
            <div className="space-y-1.5">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[10px] font-black uppercase tracking-widest px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 flex items-center gap-1">
                  <Trophy className="w-3 h-3 text-amber-400" />
                  RANK SEKARANG (SEASON AKTIF)
                </span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30 flex items-center gap-1">
                  <Sparkles className="w-3 h-3 text-purple-400" />
                  Tier {rankInfo.name}
                </span>
              </div>

              <h1 className={`text-3xl sm:text-4xl font-black tracking-tight ${rankInfo.badgeText}`}>
                {rankInfo.title}
              </h1>

              {/* Stars Display Row */}
              <div className="flex items-center gap-2 pt-1">
                <div className="flex items-center gap-1 text-2xl sm:text-3xl text-amber-400 filter drop-shadow-[0_0_8px_rgba(245,158,11,0.6)] font-mono">
                  {rankInfo.tier === 'MYTHIC' ? (
                    <span className="text-xl font-black text-amber-300 font-mono">
                      ⭐ {rankInfo.stars} Bintang
                    </span>
                  ) : (
                    Array.from({ length: rankInfo.maxStars }).map((_, i) => (
                      <span
                        key={i}
                        className={i < rankInfo.stars ? 'text-amber-400' : 'text-slate-700'}
                      >
                        ★
                      </span>
                    ))
                  )}
                </div>
                {rankInfo.tier !== 'MYTHIC' && (
                  <span className="text-xs font-mono font-bold text-amber-300 ml-1">
                    ({rankInfo.stars} / {rankInfo.maxStars} Bintang)
                  </span>
                )}
              </div>

              {/* Rank Progression info */}
              <p className="text-xs text-slate-400">
                {rankInfo.tier === 'MYTHIC'
                  ? '🌌 Tier Mythic: Kumpulkan bintang sebanyak-banyaknya menuju Mythical Glory & Immortal!'
                  : rankInfo.stars >= rankInfo.maxStars
                  ? '⭐ Bintang penuh! Raih 1 kemenangan lagi untuk naik rank/divisi!'
                  : `🎯 Butuh ${rankInfo.maxStars - rankInfo.stars} bintang lagi menuju divisi berikutnya.`}
              </p>
            </div>
          </div>

          {/* RIGHT: Live Player Stats & Action Buttons */}
          <div className="flex flex-col justify-between gap-4 bg-slate-950/70 border border-slate-800/80 rounded-2xl p-4 sm:p-5 lg:min-w-[340px] backdrop-blur-md">
            {/* Player Stats Grid */}
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-2.5">
                <span className="text-[10px] font-bold text-slate-400 uppercase block">Win Rate</span>
                <span className="text-base font-black text-emerald-400 font-mono">{winRate}%</span>
              </div>
              <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-2.5">
                <span className="text-[10px] font-bold text-slate-400 uppercase block">Menang</span>
                <span className="text-base font-black text-amber-300 font-mono">{user?.wins || 0}</span>
              </div>
              <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-2.5">
                <span className="text-[10px] font-bold text-slate-400 uppercase block">Total Game</span>
                <span className="text-base font-black text-white font-mono">{user?.totalGames || 0}</span>
              </div>
            </div>

            {/* Quick Action: Buat Meja Baru & Join by Code */}
            <div className="flex flex-col sm:flex-row items-center gap-2 pt-1">
              <button
                onClick={handleOpenCreateModal}
                className="w-full sm:w-auto flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black text-xs shadow-lg transition active:scale-95"
              >
                <PlusCircle className="w-4 h-4" />
                Buat Meja Baru
              </button>

              <form onSubmit={handleJoinWithCode} className="w-full sm:w-auto flex items-center gap-1.5">
                <input
                  type="text"
                  placeholder="KODE ROOM"
                  value={joinCodeInput}
                  onChange={(e) => setJoinCodeInput(e.target.value.toUpperCase())}
                  maxLength={6}
                  className="w-28 bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white font-mono uppercase text-center placeholder-slate-500 focus:outline-none focus:border-amber-500"
                />
                <button
                  type="submit"
                  disabled={isJoining || !joinCodeInput.trim()}
                  className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white disabled:opacity-50 transition"
                  title="Gabung via Kode"
                >
                  <ArrowRight className="w-4 h-4" />
                </button>
              </form>
            </div>
          </div>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-2xl bg-red-950/80 border border-red-500/60 text-red-200 text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
            <span>{error}</span>
          </div>
          <button onClick={() => setError(null)} className="font-bold text-red-400 hover:text-white ml-2">
            ✕
          </button>
        </div>
      )}

      {/* PUBLIC ROOMS BROWSER — JOIN LANGSUNG */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-6 shadow-xl backdrop-blur-xl">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
          <div>
            <div className="flex items-center gap-2">
              <Gamepad2 className="w-5 h-5 text-emerald-400" />
              <h2 className="text-lg font-bold text-white">Daftar Meja Game (Join Langsung)</h2>
              <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-bold">
                {filteredRooms.length} Meja
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-1 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              Pilih meja di bawah untuk langsung masuk dan bermain bersama pemain lain.
            </p>
          </div>

          <div className="flex items-center gap-3">
            {/* Filter buttons */}
            <div className="flex items-center gap-1 bg-slate-950/80 p-1 rounded-xl border border-slate-800 text-xs font-semibold">
              <button
                onClick={() => setFilterMode('ALL')}
                className={`px-3 py-1 rounded-lg transition ${
                  filterMode === 'ALL' ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                Semua
              </button>
              <button
                onClick={() => setFilterMode('SOLO')}
                className={`px-3 py-1 rounded-lg transition ${
                  filterMode === 'SOLO' ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                Solo (4P)
              </button>
              <button
                onClick={() => setFilterMode('TEAM_BATTLE')}
                className={`px-3 py-1 rounded-lg transition ${
                  filterMode === 'TEAM_BATTLE'
                    ? 'bg-purple-600 text-white'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Team Battle (2v2)
              </button>
            </div>

            {/* Refresh button */}
            <button
              onClick={fetchRooms}
              disabled={isLoadingRooms}
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition"
              title="Perbarui Daftar Meja"
            >
              <RefreshCw className={`w-4 h-4 ${isLoadingRooms ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {filteredRooms.length === 0 ? (
          <div className="text-center py-10 px-4 border-2 border-dashed border-slate-800 rounded-2xl bg-slate-950/40">
            <Users className="w-12 h-12 text-slate-600 mx-auto mb-3" />
            <h3 className="text-white font-bold text-base">Belum Ada Meja Terbuka Saat Ini</h3>
            <p className="text-slate-400 text-xs mt-1 max-w-md mx-auto">
              Saat ini semua meja sudah penuh atau belum ada meja terbuka. Buat meja baru secara instan di bawah ini agar pemain lain dapat langsung join!
            </p>

            {/* Quick 1-click room creation presets */}
            <div className="flex flex-wrap items-center justify-center gap-3 mt-5">
              <button
                onClick={() => handleQuickCreate('TEAM_BATTLE')}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white text-xs font-black shadow-lg transition active:scale-95"
              >
                <Swords className="w-4 h-4" />
                Buat Meja Team Battle (2 vs 2)
              </button>

              <button
                onClick={() => handleQuickCreate('SOLO')}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-black shadow-lg transition active:scale-95"
              >
                <Gamepad2 className="w-4 h-4" />
                Buat Meja Solo (4 Pemain)
              </button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredRooms.map((room) => {
              const isFull = room.playerCount >= room.maxPlayers;
              const isPlaying = room.status === 'PLAYING';
              const isTeam = room.mode === 'TEAM_BATTLE';
              const hostRank = getRankInfo(room.hostRankTier, room.hostRankDivision);

              return (
                <div
                  key={room.code}
                  className={`bg-slate-950/80 border rounded-2xl p-5 transition shadow-xl flex flex-col justify-between hover:border-slate-600 ${
                    isPlaying ? 'border-slate-800 opacity-80' : 'border-slate-800'
                  }`}
                >
                  <div>
                    {/* Header: Name & Mode Badge */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="truncate">
                        <h3 className="font-bold text-white text-sm truncate">{room.name}</h3>
                        <p className="text-[11px] font-mono text-amber-400 font-bold mt-0.5">
                          Kode: {room.code}
                        </p>
                      </div>
                      <span
                        className={`text-[10px] px-2.5 py-0.5 rounded-full font-black uppercase shrink-0 border ${
                          isTeam
                            ? 'bg-purple-500/20 text-purple-300 border-purple-500/30'
                            : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                        }`}
                      >
                        {isTeam ? '⚔️ 2 vs 2' : '🎲 Solo 4P'}
                      </span>
                    </div>

                    {/* Host Info */}
                    <div className="flex items-center gap-2 mt-3 p-2 rounded-xl bg-slate-900/70 border border-slate-800">
                      <span className="text-xl">{room.hostAvatar ? AVATAR_ICONS[room.hostAvatar] || '🦁' : '🦁'}</span>
                      <div className="truncate">
                        <span className="text-[10px] text-slate-400 block font-medium">Host Meja:</span>
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-bold text-white truncate">{room.hostNickname}</span>
                          <span className="text-[9px] text-amber-300 font-mono">({hostRank.title})</span>
                        </div>
                      </div>
                    </div>

                    {/* Slots status dots */}
                    <div className="flex items-center justify-between text-xs text-slate-300 mt-3 pt-2 border-t border-slate-800/80">
                      <div className="flex items-center gap-1">
                        {Array.from({ length: room.maxPlayers }).map((_, i) => (
                          <span
                            key={i}
                            className={`w-2.5 h-2.5 rounded-full ${
                              i < room.playerCount ? 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.6)]' : 'bg-slate-700'
                            }`}
                          />
                        ))}
                        <span className="ml-1.5 font-bold font-mono text-xs">
                          {room.playerCount} / {room.maxPlayers} Pemain
                        </span>
                      </div>

                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          isPlaying
                            ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                            : isFull
                            ? 'bg-slate-800 text-slate-400'
                            : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                        }`}
                      >
                        {isPlaying ? 'Sedang Main' : isFull ? 'Penuh' : 'Menunggu'}
                      </span>
                    </div>
                  </div>

                  {/* Direct Join Action Button */}
                  <div className="mt-4 pt-3 border-t border-slate-800/80">
                    <button
                      onClick={() => handleJoinClick(room.code)}
                      disabled={isFull || isPlaying || isJoining}
                      className={`w-full py-2.5 px-4 rounded-xl text-xs font-black transition flex items-center justify-center gap-1.5 ${
                        isFull || isPlaying
                          ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                          : 'bg-gradient-to-r from-emerald-500 to-teal-400 hover:from-emerald-400 hover:to-teal-300 text-slate-950 shadow-[0_0_15px_rgba(16,185,129,0.3)] active:scale-95'
                      }`}
                    >
                      <Zap className="w-3.5 h-3.5" />
                      {isPlaying ? 'Sedang Bertanding' : isFull ? 'Meja Penuh' : '⚡ JOIN LANGSUNG'}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* CREATE ROOM MODAL */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fade-in">
          <div className="bg-slate-900 border border-slate-700/80 rounded-3xl max-w-md w-full p-6 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <PlusCircle className="w-5 h-5 text-amber-400" />
                Buat Meja Baru
              </h3>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            {!user ? (
              <div className="py-6 text-center">
                <p className="text-sm text-slate-300 mb-4">
                  Anda harus login terlebih dahulu untuk membuat meja permainan.
                </p>
                <button
                  onClick={() => {
                    setShowCreateModal(false);
                    setShowAuthModal(true);
                  }}
                  className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs inline-flex items-center gap-2"
                >
                  <LogIn className="w-4 h-4" />
                  Masuk / Daftar Akun
                </button>
              </div>
            ) : (
              <form onSubmit={handleCreateRoomSubmit} className="space-y-4 mt-4">
                {/* Room Name */}
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Nama Meja
                  </label>
                  <input
                    type="text"
                    value={roomName}
                    onChange={(e) => setRoomName(e.target.value)}
                    maxLength={30}
                    required
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-400"
                  />
                </div>

                {/* Game Mode */}
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Mode Pertandingan
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setRoomMode('SOLO')}
                      className={`p-3 rounded-xl border text-left transition ${
                        roomMode === 'SOLO'
                          ? 'bg-emerald-950/60 border-emerald-500 text-white'
                          : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:text-white'
                      }`}
                    >
                      <p className="font-bold text-xs flex items-center gap-1.5">
                        <Users className="w-3.5 h-3.5 text-emerald-400" />
                        Mode Solo
                      </p>
                      <p className="text-[10px] text-slate-400 mt-1">2 hingga 4 pemain bebas.</p>
                    </button>

                    <button
                      type="button"
                      onClick={() => setRoomMode('TEAM_BATTLE')}
                      className={`p-3 rounded-xl border text-left transition ${
                        roomMode === 'TEAM_BATTLE'
                          ? 'bg-purple-950/60 border-purple-500 text-white'
                          : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:text-white'
                      }`}
                    >
                      <p className="font-bold text-xs flex items-center gap-1.5">
                        <Swords className="w-3.5 h-3.5 text-purple-400" />
                        Team Battle
                      </p>
                      <p className="text-[10px] text-slate-400 mt-1">Tepat 4 pemain (2 vs 2).</p>
                    </button>
                  </div>
                </div>

                {/* Solo Player Count (if Solo mode) */}
                {roomMode === 'SOLO' && (
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      Kapasitas Pemain
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                      {[2, 3, 4].map((count) => (
                        <button
                          key={count}
                          type="button"
                          onClick={() => setSoloMaxPlayers(count)}
                          className={`py-2 rounded-xl border text-xs font-bold transition ${
                            soloMaxPlayers === count
                              ? 'bg-amber-500/20 border-amber-400 text-amber-300'
                              : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                          }`}
                        >
                          {count} Pemain
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Public vs Private */}
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Akses Room
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setIsPublic(true)}
                      className={`py-2 rounded-xl border text-xs font-semibold transition ${
                        isPublic
                          ? 'bg-slate-800 border-emerald-500 text-emerald-300'
                          : 'bg-slate-950 border-slate-800 text-slate-400'
                      }`}
                    >
                      Publik (Muncul di List)
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsPublic(false)}
                      className={`py-2 rounded-xl border text-xs font-semibold transition ${
                        !isPublic
                          ? 'bg-slate-800 border-amber-500 text-amber-300'
                          : 'bg-slate-950 border-slate-800 text-slate-400'
                      }`}
                    >
                      Privat (Hanya Kode)
                    </button>
                  </div>
                </div>

                {/* Turn timer */}
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Batas Waktu Giliran (Detik)
                  </label>
                  <select
                    value={turnTimeout}
                    onChange={(e) => setTurnTimeout(Number(e.target.value))}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-400"
                  >
                    <option value={15}>15 Detik (Cepat / Blitz)</option>
                    <option value={20}>20 Detik (Standar)</option>
                    <option value={30}>30 Detik (Santai)</option>
                  </select>
                </div>

                <div className="pt-2 flex items-center justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setShowCreateModal(false)}
                    className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    disabled={isCreating}
                    className="px-6 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition shadow-lg disabled:opacity-50"
                  >
                    {isCreating ? 'Membuat Meja...' : 'Buat Meja'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Auth Modal Trigger */}
      {showAuthModal && <AuthModal onClose={() => setShowAuthModal(false)} />}
    </div>
  );
};
