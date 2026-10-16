'use client';

import React, { useState } from 'react';
import { useRoomStore, RoomPlayer } from '@/stores/roomStore';
import { useAuthStore } from '@/stores/authStore';
import {
  Users,
  Copy,
  Check,
  Crown,
  Play,
  LogOut,
  UserX,
  Shield,
  Swords,
  MessageSquare,
  Send,
  Sparkles,
} from 'lucide-react';

const AVATAR_MAP: Record<string, string> = {
  avatar_1: '🦁 Singa Emas',
  avatar_2: '🐯 Harimau Balak',
  avatar_3: '🦅 Rajawali Domino',
  avatar_4: '🐲 Naga Ceki',
  avatar_5: '🐼 Pendekar Bambu',
  avatar_6: '🐺 Serigala Malam',
  avatar_7: '🦊 Rubah Cerdik',
  avatar_8: '👑 Maharaja Gaple',
};

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

export const RoomLobby: React.FC = () => {
  const { user } = useAuthStore();
  const {
    currentRoom,
    leaveRoom,
    toggleReady,
    startGame,
    kickPlayer,
    sendChat,
    chatMessages,
    error,
    setError,
  } = useRoomStore();

  const [copied, setCopied] = useState(false);
  const [chatInput, setChatInput] = useState('');

  if (!currentRoom) return null;

  const isHost = currentRoom.hostId === user?.id;
  const mySlot = currentRoom.players.find((p) => p.userId === user?.id);
  const isTeamBattle = currentRoom.mode === 'TEAM_BATTLE';

  const copyCode = () => {
    navigator.clipboard.writeText(currentRoom.code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSendChat = (e: React.FormEvent) => {
    e.preventDefault();
    if (chatInput.trim()) {
      sendChat(chatInput.trim());
      setChatInput('');
    }
  };

  // Seating helpers
  const playersBySeat: Record<number, RoomPlayer | undefined> = {};
  currentRoom.players.forEach((p) => {
    playersBySeat[p.seatIndex] = p;
  });

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      {/* Top Banner */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 shadow-2xl backdrop-blur-xl mb-6">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-black text-white">{currentRoom.name}</h1>
              <span
                className={`px-3 py-1 rounded-full text-xs font-bold border ${
                  isTeamBattle
                    ? 'bg-purple-500/20 text-purple-300 border-purple-500/40'
                    : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                }`}
              >
                {isTeamBattle ? 'Team Battle 2 vs 2' : `Mode Solo (${currentRoom.maxPlayers} Pemain)`}
              </span>
              <span className="px-2.5 py-1 rounded-full text-xs bg-slate-800 text-slate-300 font-medium border border-slate-700">
                {currentRoom.isPublic ? 'Publik' : 'Privat'}
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Host: <span className="text-amber-400 font-semibold">{currentRoom.players.find(p => p.isHost)?.nickname}</span> •
              Waktu Giliran: <span className="text-slate-300 font-mono">20 Detik</span>
            </p>
          </div>

          {/* Room Code Badge */}
          <div className="flex items-center gap-3 bg-slate-950/70 border border-slate-800 px-4 py-2.5 rounded-2xl">
            <div>
              <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">
                Kode Undangan Room
              </p>
              <p className="text-xl font-mono font-black text-amber-400 tracking-widest">
                {currentRoom.code}
              </p>
            </div>
            <button
              onClick={copyCode}
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition"
              title="Salin Kode Room"
            >
              {copied ? <Check className="w-5 h-5 text-emerald-400" /> : <Copy className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {error && (
          <div className="mt-4 p-3 rounded-xl bg-red-950/80 border border-red-500/60 text-red-200 text-xs flex items-center justify-between">
            <span>{error}</span>
            <button onClick={() => setError(null)} className="text-red-400 hover:text-white font-bold ml-2">
              ✕
            </button>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* SEATING & PLAYERS DISPLAY (2 Columns) */}
        <div className="lg:col-span-2 space-y-6">
          {isTeamBattle ? (
            /* TEAM BATTLE 2v2 SEATING MATRIX */
            <div className="bg-slate-900/80 border border-purple-900/40 rounded-3xl p-6 shadow-xl backdrop-blur-xl">
              <div className="flex items-center gap-2 mb-4">
                <Swords className="w-5 h-5 text-purple-400" />
                <h2 className="text-base font-bold text-white">
                  Susunan Meja Team Battle (Duduk Berhadapan)
                </h2>
              </div>
              <p className="text-xs text-slate-400 mb-6">
                Pemain satu tim duduk berhadapan. Giliran berputar searah jarum jam secara bergantian antar tim.
              </p>

              {/* Table Seating Map */}
              <div className="relative w-full max-w-md mx-auto aspect-square rounded-3xl bg-gradient-to-b from-slate-950 to-slate-900 border-2 border-slate-800 p-6 flex flex-col justify-between items-center shadow-inner">
                {/* Center felt table representation */}
                <div className="absolute inset-20 rounded-2xl bg-emerald-950/60 border border-emerald-600/30 flex flex-col items-center justify-center p-4 text-center">
                  <div className="text-2xl font-black text-amber-400/70 font-mono">GAPLE 3D</div>
                  <div className="text-[10px] text-emerald-300/60 font-semibold mt-1">
                    Tim Merah (A) vs Tim Biru (B)
                  </div>
                </div>

                {/* Top Seat: Team A - Player 2 (Seat 2) */}
                <SeatSlotCard
                  slotIndex={2}
                  player={playersBySeat[2]}
                  teamName="TIM MERAH (TIM A)"
                  teamColor="red"
                  isHostUser={isHost}
                  onKick={kickPlayer}
                />

                {/* Middle Row: Left (Seat 1 - Team B) & Right (Seat 3 - Team B) */}
                <div className="w-full flex justify-between items-center z-10 px-2">
                  <SeatSlotCard
                    slotIndex={1}
                    player={playersBySeat[1]}
                    teamName="TIM BIRU (TIM B)"
                    teamColor="blue"
                    isHostUser={isHost}
                    onKick={kickPlayer}
                  />
                  <SeatSlotCard
                    slotIndex={3}
                    player={playersBySeat[3]}
                    teamName="TIM BIRU (TIM B)"
                    teamColor="blue"
                    isHostUser={isHost}
                    onKick={kickPlayer}
                  />
                </div>

                {/* Bottom Seat: Team A - Host / Player 1 (Seat 0) */}
                <SeatSlotCard
                  slotIndex={0}
                  player={playersBySeat[0]}
                  teamName="TIM MERAH (TIM A)"
                  teamColor="red"
                  isHostUser={isHost}
                  onKick={kickPlayer}
                />
              </div>
            </div>
          ) : (
            /* SOLO MODE SEATING (2-4 PLAYERS) */
            <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-6 shadow-xl backdrop-blur-xl">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Users className="w-5 h-5 text-emerald-400" />
                  <h2 className="text-base font-bold text-white">
                    Pemain di Meja ({currentRoom.players.length}/{currentRoom.maxPlayers})
                  </h2>
                </div>
                <span className="text-xs text-slate-400">Minimal 2 pemain untuk memulai</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {Array.from({ length: currentRoom.maxPlayers }).map((_, idx) => {
                  const player = playersBySeat[idx];
                  return (
                    <div
                      key={idx}
                      className={`rounded-2xl p-4 border transition-all ${
                        player
                          ? 'bg-slate-950/70 border-slate-700/60 shadow-lg'
                          : 'bg-slate-950/30 border-dashed border-slate-800 text-slate-600 flex flex-col items-center justify-center min-h-[120px]'
                      }`}
                    >
                      {player ? (
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-3">
                            <span className="text-3xl">
                              {AVATAR_ICONS[player.avatar] || '🦁'}
                            </span>
                            <div>
                              <div className="flex items-center gap-1.5">
                                <span className="font-bold text-white text-sm">
                                  {player.nickname}
                                </span>
                                {player.isHost && (
                                  <span title="Host Meja">
                                    <Crown className="w-4 h-4 text-amber-400" />
                                  </span>
                                )}
                              </div>
                              <p className="text-xs text-slate-400">Kursi #{idx + 1}</p>
                              <div className="mt-2">
                                {player.isHost ? (
                                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                                    Host Room
                                  </span>
                                ) : player.isReady ? (
                                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                                    Siap (Ready)
                                  </span>
                                ) : (
                                  <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-slate-800 text-slate-400 border border-slate-700">
                                    Menunggu Siap
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>

                          {isHost && !player.isHost && (
                            <button
                              onClick={() => kickPlayer(player.userId)}
                              title="Keluarkan dari Room"
                              className="p-1.5 rounded-lg bg-red-950/40 text-red-400 hover:bg-red-900/60 transition"
                            >
                              <UserX className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      ) : (
                        <div className="text-center py-4">
                          <Users className="w-6 h-6 mx-auto mb-1 opacity-40" />
                          <p className="text-xs font-semibold">Kursi Kosong #{idx + 1}</p>
                          <p className="text-[10px] text-slate-500">Menunggu pemain bergabung...</p>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ACTION BUTTONS (READY, START, LEAVE) */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-4 flex flex-wrap items-center justify-between gap-4 shadow-xl">
            <button
              onClick={leaveRoom}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs transition"
            >
              <LogOut className="w-4 h-4" />
              Keluar Room
            </button>

            <div className="flex items-center gap-3">
              {!isHost && (
                <button
                  onClick={toggleReady}
                  className={`flex items-center gap-2 px-6 py-2.5 rounded-xl font-bold text-xs transition shadow-lg ${
                    mySlot?.isReady
                      ? 'bg-amber-500 hover:bg-amber-400 text-slate-950'
                      : 'bg-emerald-600 hover:bg-emerald-500 text-white'
                  }`}
                >
                  <Sparkles className="w-4 h-4" />
                  {mySlot?.isReady ? 'Batalkan Siap' : 'Saya Siap (Ready)'}
                </button>
              )}

              {isHost && (
                <button
                  onClick={startGame}
                  className="flex items-center gap-2 px-8 py-3 rounded-xl bg-gradient-to-r from-emerald-500 via-emerald-400 to-teal-400 text-slate-950 font-black text-sm hover:brightness-110 active:scale-95 transition shadow-[0_0_20px_rgba(16,185,129,0.5)]"
                >
                  <Play className="w-5 h-5 fill-current" />
                  Mulai Pertandingan
                </button>
              )}
            </div>
          </div>
        </div>

        {/* IN-ROOM CHAT & ROSTER (1 Column) */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-5 flex flex-col h-[520px] shadow-xl backdrop-blur-xl">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-800">
            <MessageSquare className="w-4 h-4 text-emerald-400" />
            <h3 className="text-sm font-bold text-white">Obrolan Meja</h3>
          </div>

          {/* Messages container */}
          <div className="flex-1 overflow-y-auto py-3 space-y-2.5 text-xs">
            {chatMessages.length === 0 ? (
              <p className="text-slate-500 text-center py-12">
                Belum ada pesan di room. Mulai obrolan dengan pemain lain!
              </p>
            ) : (
              chatMessages.map((msg) => (
                <div key={msg.id} className="bg-slate-950/70 border border-slate-800/60 rounded-xl p-2.5">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-amber-400 text-[11px]">{msg.nickname}</span>
                    <span className="text-[9px] text-slate-500">
                      {new Date(msg.timestamp).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </div>
                  <p className="text-slate-200 mt-1">{msg.text}</p>
                </div>
              ))
            )}
          </div>

          {/* Chat Form */}
          <form onSubmit={handleSendChat} className="pt-3 border-t border-slate-800 flex gap-2">
            <input
              type="text"
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              placeholder="Kirim pesan..."
              maxLength={120}
              className="flex-1 bg-slate-950 border border-slate-700/80 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
            />
            <button
              type="submit"
              className="p-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white transition"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

// Sub-component for Team Battle Seat Display
function SeatSlotCard({
  slotIndex,
  player,
  teamName,
  teamColor,
  isHostUser,
  onKick,
}: {
  slotIndex: number;
  player?: RoomPlayer;
  teamName: string;
  teamColor: 'red' | 'blue';
  isHostUser: boolean;
  onKick: (id: string) => void;
}) {
  const isRed = teamColor === 'red';

  return (
    <div
      className={`relative z-10 w-44 rounded-2xl p-2.5 border backdrop-blur-md transition-all ${
        player
          ? isRed
            ? 'bg-red-950/70 border-red-700/60 shadow-[0_0_15px_rgba(239,68,68,0.2)]'
            : 'bg-blue-950/70 border-blue-700/60 shadow-[0_0_15px_rgba(59,130,246,0.2)]'
          : 'bg-slate-950/40 border-dashed border-slate-800 text-slate-600'
      }`}
    >
      <div className="flex items-center justify-between mb-1">
        <span
          className={`text-[9px] font-black uppercase tracking-wider ${
            isRed ? 'text-red-400' : 'text-blue-400'
          }`}
        >
          {teamName}
        </span>
        <span className="text-[9px] text-slate-500">Kursi #{slotIndex + 1}</span>
      </div>

      {player ? (
        <div className="flex items-center gap-2">
          <span className="text-2xl">{AVATAR_ICONS[player.avatar] || '🦁'}</span>
          <div className="overflow-hidden">
            <div className="flex items-center gap-1">
              <span className="font-bold text-white text-xs truncate">{player.nickname}</span>
              {player.isHost && <Crown className="w-3.5 h-3.5 text-amber-400 shrink-0" />}
            </div>
            <div className="mt-0.5">
              {player.isHost ? (
                <span className="text-[9px] text-amber-400 font-semibold">Host</span>
              ) : player.isReady ? (
                <span className="text-[9px] text-emerald-400 font-bold">Siap</span>
              ) : (
                <span className="text-[9px] text-slate-400 font-medium">Belum Siap</span>
              )}
            </div>
          </div>

          {isHostUser && !player.isHost && (
            <button
              onClick={() => onKick(player.userId)}
              title="Keluarkan"
              className="ml-auto text-red-400 hover:text-white"
            >
              <UserX className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      ) : (
        <div className="text-center py-2">
          <span className="text-xs text-slate-500">Kursi Kosong</span>
        </div>
      )}
    </div>
  );
}
