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
} from 'lucide-react';
import { AuthModal } from './AuthModal';

interface PublicRoom {
  code: string;
  name: string;
  mode: 'SOLO' | 'TEAM_BATTLE';
  playerCount: number;
  maxPlayers: number;
  status: string;
  hostNickname: string;
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
    const interval = setInterval(fetchRooms, 10000);
    return () => clearInterval(interval);
  }, []);

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

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-8">
      {/* HERO BANNER */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-emerald-950 via-slate-900 to-amber-950 border border-emerald-500/30 p-8 shadow-2xl">
        <div className="relative z-10 max-w-2xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-xs font-bold mb-3">
            <Flame className="w-3.5 h-3.5" />
            <span>Gaple 3D Real-time Multiplayer Authoritative</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-black text-white tracking-tight">
            Main Gaple Online Seru Bersama Teman!
          </h1>
          <p className="text-slate-300 text-sm mt-2 leading-relaxed">
            Nikmati sensasi meja domino 3D realistis dengan suara benturan balak otentik.
            Tersedia mode Solo klasik (2–4 pemain) dan mode Team Battle 2 vs 2 taktis.
          </p>

          <div className="flex flex-wrap items-center gap-4 mt-6">
            <button
              onClick={handleOpenCreateModal}
              className="flex items-center gap-2 px-6 py-3 rounded-2xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black text-sm shadow-[0_0_20px_rgba(245,158,11,0.4)] transition transform active:scale-95"
            >
              <PlusCircle className="w-5 h-5" />
              Buat Meja Baru
            </button>

            {/* Quick Join by Code */}
            <form onSubmit={handleJoinWithCode} className="flex items-center gap-2">
              <input
                type="text"
                placeholder="Masukkan Kode Room"
                value={joinCodeInput}
                onChange={(e) => setJoinCodeInput(e.target.value.toUpperCase())}
                maxLength={6}
                className="w-40 sm:w-48 bg-slate-950/80 border border-slate-700/80 rounded-2xl px-4 py-3 text-sm text-white font-mono uppercase placeholder-slate-500 focus:outline-none focus:border-amber-500"
              />
              <button
                type="submit"
                disabled={isJoining || !joinCodeInput.trim()}
                className="p-3 rounded-2xl bg-slate-800 hover:bg-slate-700 text-white disabled:opacity-50 transition"
                title="Gabung via Kode"
              >
                <ArrowRight className="w-5 h-5" />
              </button>
            </form>
          </div>
        </div>

        {/* Ambient decorative domino illustration */}
        <div className="absolute -right-8 -bottom-10 opacity-15 pointer-events-none transform rotate-12 scale-125 hidden md:block">
          <div className="w-72 h-96 bg-amber-200/20 rounded-3xl border-8 border-white/20" />
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

      {/* PUBLIC ROOMS BROWSER */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-6 shadow-xl backdrop-blur-xl">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-emerald-400" />
            <h2 className="text-lg font-bold text-white">Daftar Meja Publik Terbuka</h2>
            <span className="text-xs text-slate-400">({filteredRooms.length} Meja)</span>
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
                Solo
              </button>
              <button
                onClick={() => setFilterMode('TEAM_BATTLE')}
                className={`px-3 py-1 rounded-lg transition ${
                  filterMode === 'TEAM_BATTLE'
                    ? 'bg-purple-600 text-white'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Team Battle
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
          <div className="text-center py-12 border-2 border-dashed border-slate-800 rounded-2xl">
            <Users className="w-10 h-10 text-slate-600 mx-auto mb-2" />
            <p className="text-slate-400 font-medium text-sm">
              Belum ada meja publik yang menunggu pemain.
            </p>
            <p className="text-slate-500 text-xs mt-1">
              Buat meja pertama Anda dan ajak teman bergabung!
            </p>
            <button
              onClick={handleOpenCreateModal}
              className="mt-4 px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition"
            >
              Buat Meja Sekarang
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredRooms.map((room) => {
              const isFull = room.playerCount >= room.maxPlayers;
              const isPlaying = room.status === 'PLAYING';

              return (
                <div
                  key={room.code}
                  className="bg-slate-950/70 border border-slate-800/80 hover:border-slate-700 rounded-2xl p-4 transition shadow-lg flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="font-bold text-white text-sm truncate">{room.name}</h3>
                      <span
                        className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase shrink-0 ${
                          room.mode === 'TEAM_BATTLE'
                            ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                            : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                        }`}
                      >
                        {room.mode === 'TEAM_BATTLE' ? '2 vs 2' : 'Solo'}
                      </span>
                    </div>

                    <p className="text-xs text-slate-400 mt-1">Host: {room.hostNickname}</p>
                    <p className="text-[11px] font-mono text-amber-400/80 mt-0.5">
                      Kode: {room.code}
                    </p>
                  </div>

                  <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between">
                    <div className="flex items-center gap-1.5 text-xs text-slate-300">
                      <Users className="w-3.5 h-3.5 text-slate-400" />
                      <span>
                        {room.playerCount} / {room.maxPlayers} Pemain
                      </span>
                    </div>

                    <button
                      onClick={() => handleJoinClick(room.code)}
                      disabled={isFull || isPlaying || isJoining}
                      className={`px-4 py-1.5 rounded-xl text-xs font-bold transition ${
                        isFull || isPlaying
                          ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                          : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-md active:scale-95'
                      }`}
                    >
                      {isPlaying ? 'Sedang Main' : isFull ? 'Penuh' : 'Gabung'}
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
