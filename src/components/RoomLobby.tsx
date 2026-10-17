'use client';

import React, { useState, useEffect } from 'react';
import { useRoomStore, RoomPlayer } from '@/stores/roomStore';
import { useAuthStore } from '@/stores/authStore';
import { useVoiceStore } from '@/stores/voiceStore';
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
  Bot,
  Mic,
  MicOff,
  UserPlus,
  Volume2,
} from 'lucide-react';
import { getRankInfo } from '@/lib/rank';
import { FriendModal } from './FriendModal';

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
    addBot,
  } = useRoomStore();

  const {
    isMicOn,
    isSpeaking,
    isAudioBlocked,
    unlockAudio,
    speakingUsers,
    mutedUsers,
    toggleMic,
  } = useVoiceStore();

  const [copied, setCopied] = useState(false);
  const [chatInput, setChatInput] = useState('');
  const [addingBot, setAddingBot] = useState(false);
  const [showFriendModal, setShowFriendModal] = useState(false);

  if (!currentRoom) return null;

  const isHost = currentRoom.hostId === user?.id;
  const mySlot = currentRoom.players.find((p) => p.userId === user?.id);
  const isTeamBattle = currentRoom.mode === 'TEAM_BATTLE';

  const handleAddBot = async () => {
    if (addingBot) return;
    setAddingBot(true);
    try {
      const res = await addBot();
      if (!res.success && res.error) {
        setError(res.error);
      }
    } finally {
      setAddingBot(false);
    }
  };

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

  const playersBySeat: Record<number, RoomPlayer | undefined> = {};
  currentRoom.players.forEach((p) => {
    playersBySeat[p.seatIndex] = p;
  });

  return (
    <div className="max-w-6xl mx-auto px-3 sm:px-4 py-4 sm:py-8 select-none w-full relative">
      {/* Audio Unlock Banner */}
      {isAudioBlocked && (
        <div className="mb-4 flex justify-center animate-bounce">
          <button
            onClick={() => unlockAudio()}
            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-amber-500 via-orange-500 to-emerald-500 text-slate-950 font-black text-xs rounded-full shadow-[0_0_30px_rgba(245,158,11,0.6)] border border-yellow-200 active:scale-95 transition"
          >
            <Volume2 className="w-4 h-4 animate-pulse text-slate-950" />
            <span>🔊 Browser Menahan Suara Teman — Klik Di Sini untuk Mengaktifkan</span>
          </button>
        </div>
      )}

      {/* Top Banner */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-4 sm:p-6 shadow-2xl backdrop-blur-xl mb-6">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <div className="flex flex-wrap items-center gap-2 sm:gap-3">
              <h1 className="text-xl sm:text-2xl font-black text-white">{currentRoom.name}</h1>
              <span
                className={`px-2.5 py-0.5 rounded-full text-xs font-bold border ${
                  isTeamBattle
                    ? 'bg-purple-500/20 text-purple-300 border-purple-500/40'
                    : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                }`}
              >
                {isTeamBattle ? 'Team Battle 2 vs 2' : `Mode Solo (${currentRoom.maxPlayers}P)`}
              </span>
              <span className="px-2 py-0.5 rounded-full text-xs bg-slate-800 text-slate-300 font-medium border border-slate-700">
                {currentRoom.isPublic ? 'Publik' : 'Privat'}
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-1 flex flex-wrap items-center gap-2">
              <span>Host: <strong className="text-amber-400">{currentRoom.players.find(p => p.isHost)?.nickname}</strong></span> •
              <span className="px-2 py-0.5 rounded bg-amber-500/10 text-amber-300 font-bold border border-amber-500/20 font-mono">
                Ronde #{currentRoom.roundNumber || 1}
              </span> •
              <span className="text-emerald-400 font-medium">
                Start: {(!currentRoom.roundNumber || currentRoom.roundNumber === 1 || !currentRoom.lastWinnerUserId) ? 'Balak Kosong (0-0)' : 'Pemenang Sebelumnya'}
              </span>
            </p>
          </div>

          {/* Quick Actions: ON MIC Toggle + Invite Friend + Room Code */}
          <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
            {/* ON MIC Button */}
            <button
              onClick={() => toggleMic(currentRoom.code)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-2xl border text-xs font-bold transition shadow-sm ${
                isMicOn
                  ? isSpeaking
                    ? 'bg-emerald-500 text-slate-950 border-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.8)] animate-pulse'
                    : 'bg-emerald-950/80 text-emerald-300 border-emerald-500/50'
                  : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-white'
              }`}
            >
              {isMicOn ? (
                <Mic className={`w-4 h-4 ${isSpeaking ? 'animate-bounce' : ''}`} />
              ) : (
                <MicOff className="w-4 h-4 text-red-400" />
              )}
              <span>{isMicOn ? (isSpeaking ? 'NGOMONG' : 'ON MIC') : 'MIC OFF'}</span>
            </button>

            {/* Ajak Teman Button */}
            <button
              onClick={() => setShowFriendModal(true)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-2xl bg-slate-950 border border-slate-800 hover:border-amber-400/50 text-slate-200 hover:text-amber-300 text-xs font-bold transition shadow-sm"
            >
              <UserPlus className="w-4 h-4 text-amber-400" />
              <span className="hidden sm:inline">Ajak Teman</span>
            </button>

            {/* Room Code Badge */}
            <div className="flex items-center gap-2 bg-slate-950/70 border border-slate-800 px-3 py-1.5 rounded-2xl">
              <div>
                <p className="text-[9px] text-slate-400 font-semibold uppercase">Kode Room</p>
                <p className="text-base sm:text-lg font-mono font-black text-amber-400 tracking-wider">
                  {currentRoom.code}
                </p>
              </div>
              <button
                onClick={copyCode}
                className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition"
                title="Salin Kode Meja"
              >
                {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
              </button>
            </div>
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
            <div className="bg-slate-900/80 border border-purple-900/40 rounded-3xl p-4 sm:p-6 shadow-xl backdrop-blur-xl">
              <div className="flex items-center gap-2 mb-2">
                <Swords className="w-5 h-5 text-purple-400" />
                <h2 className="text-base font-bold text-white">
                  Susunan Meja Team Battle (Duduk Berhadapan)
                </h2>
              </div>
              <p className="text-xs text-slate-400 mb-6">
                Pemain satu tim duduk berhadapan. Giliran berputar bergantian antar tim.
              </p>

              {/* Table Seating Map */}
              <div className="relative w-full max-w-md mx-auto aspect-square rounded-3xl bg-gradient-to-b from-slate-950 to-slate-900 border-2 border-slate-800 p-4 sm:p-6 flex flex-col justify-between items-center shadow-inner">
                {/* Center felt table representation */}
                <div className="absolute inset-16 sm:inset-20 rounded-2xl bg-emerald-950/60 border border-emerald-600/30 flex flex-col items-center justify-center p-3 text-center">
                  <div className="text-xl sm:text-2xl font-black text-amber-400/80 font-mono">BALAK 3D</div>
                  <div className="text-[10px] text-emerald-300/70 font-semibold mt-1">
                    Tim Merah vs Tim Biru
                  </div>
                </div>

                {/* Top Seat: Team A - Player 2 (Seat 2) */}
                <SeatSlotCard
                  slotIndex={2}
                  player={playersBySeat[2]}
                  currentUserId={user?.id}
                  isMicOn={isMicOn}
                  isSpeaking={isSpeaking}
                  speakingUsers={speakingUsers}
                  mutedUsers={mutedUsers}
                  teamName="TIM MERAH (TIM A)"
                  teamColor="red"
                  isHostUser={isHost}
                  onKick={kickPlayer}
                  onAddBot={handleAddBot}
                  addingBot={addingBot}
                />

                {/* Middle Row: Left (Seat 1 - Team B) & Right (Seat 3 - Team B) */}
                <div className="w-full flex justify-between items-center z-10 px-1 sm:px-2">
                  <SeatSlotCard
                    slotIndex={1}
                    player={playersBySeat[1]}
                    currentUserId={user?.id}
                    isMicOn={isMicOn}
                    isSpeaking={isSpeaking}
                    speakingUsers={speakingUsers}
                    mutedUsers={mutedUsers}
                    teamName="TIM BIRU (TIM B)"
                    teamColor="blue"
                    isHostUser={isHost}
                    onKick={kickPlayer}
                    onAddBot={handleAddBot}
                    addingBot={addingBot}
                  />
                  <SeatSlotCard
                    slotIndex={3}
                    player={playersBySeat[3]}
                    currentUserId={user?.id}
                    isMicOn={isMicOn}
                    isSpeaking={isSpeaking}
                    speakingUsers={speakingUsers}
                    mutedUsers={mutedUsers}
                    teamName="TIM BIRU (TIM B)"
                    teamColor="blue"
                    isHostUser={isHost}
                    onKick={kickPlayer}
                    onAddBot={handleAddBot}
                    addingBot={addingBot}
                  />
                </div>

                {/* Bottom Seat: Team A - Host / Player 1 (Seat 0) */}
                <SeatSlotCard
                  slotIndex={0}
                  player={playersBySeat[0]}
                  currentUserId={user?.id}
                  isMicOn={isMicOn}
                  isSpeaking={isSpeaking}
                  speakingUsers={speakingUsers}
                  mutedUsers={mutedUsers}
                  teamName="TIM MERAH (TIM A)"
                  teamColor="red"
                  isHostUser={isHost}
                  onKick={kickPlayer}
                  onAddBot={handleAddBot}
                  addingBot={addingBot}
                />
              </div>
            </div>
          ) : (
            /* SOLO MODE SEATING (2-4 PLAYERS) */
            <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-4 sm:p-6 shadow-xl backdrop-blur-xl">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Users className="w-5 h-5 text-emerald-400" />
                  <h2 className="text-base font-bold text-white">
                    Pemain di Meja ({currentRoom.players.length}/{currentRoom.maxPlayers})
                  </h2>
                </div>
                <span className="text-xs text-slate-400">Minimal 2 pemain untuk mulai</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {Array.from({ length: currentRoom.maxPlayers }).map((_, idx) => {
                  const player = playersBySeat[idx];
                  const isMe = player?.userId === user?.id;
                  const playerSpeaking = isMe
                    ? isSpeaking
                    : player
                    ? Boolean(speakingUsers[player.userId])
                    : false;
                  const playerMuted = isMe
                    ? !isMicOn
                    : player
                    ? Boolean(mutedUsers[player.userId])
                    : false;

                  return (
                    <div
                      key={idx}
                      className={`p-3.5 rounded-2xl border transition-all ${
                        player
                          ? playerSpeaking
                            ? 'bg-slate-900 border-emerald-400 shadow-[0_0_20px_rgba(16,185,129,0.3)] ring-1 ring-emerald-400'
                            : 'bg-slate-950/80 border-slate-800'
                          : 'bg-slate-950/40 border-dashed border-slate-800'
                      }`}
                    >
                      {player ? (
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="relative">
                              <span
                                className={`text-3xl inline-block transition-transform ${
                                  playerSpeaking ? 'scale-110 drop-shadow-[0_0_10px_rgba(52,211,153,0.8)]' : ''
                                }`}
                              >
                                {AVATAR_ICONS[player.avatar] || '🦁'}
                              </span>

                              {/* Speaking / Mic Pill */}
                              <div className="absolute -bottom-1 -right-1">
                                {playerSpeaking ? (
                                  <span className="w-4 h-4 rounded-full bg-emerald-500 text-slate-950 flex items-center justify-center text-[9px] shadow-md animate-bounce">
                                    <Mic className="w-2.5 h-2.5" />
                                  </span>
                                ) : playerMuted ? (
                                  <span className="w-4 h-4 rounded-full bg-red-950 border border-red-500 text-red-400 flex items-center justify-center text-[9px]">
                                    <MicOff className="w-2.5 h-2.5" />
                                  </span>
                                ) : (
                                  <span className="w-4 h-4 rounded-full bg-slate-800 border border-emerald-500/50 text-emerald-400 flex items-center justify-center text-[9px]">
                                    <Mic className="w-2.5 h-2.5" />
                                  </span>
                                )}
                              </div>
                            </div>

                            <div>
                              <div className="flex items-center gap-1.5">
                                <span className="font-bold text-white text-xs sm:text-sm">
                                  {player.nickname}
                                </span>
                                {player.isHost && (
                                  <Crown className="w-3.5 h-3.5 text-amber-400" />
                                )}
                              </div>

                              {(() => {
                                const pRank = getRankInfo(
                                  player.rankTier,
                                  player.rankDivision,
                                  player.rankStars
                                );
                                return (
                                  <div className="flex items-center gap-1 mt-0.5">
                                    <span className="text-[11px]">{pRank.icon}</span>
                                    <span className="text-[10px] font-bold text-amber-300">
                                      {pRank.title}
                                    </span>
                                  </div>
                                );
                              })()}

                              <div className="mt-1 flex items-center gap-1.5">
                                <span className="text-[9px] text-slate-500">Kursi #{idx + 1}</span>
                                {player.isHost ? (
                                  <span className="px-2 py-0.2 rounded-full text-[9px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                                    Host Meja
                                  </span>
                                ) : player.isBot ? (
                                  <span className="px-2 py-0.2 rounded-full text-[9px] font-bold bg-purple-500/20 text-purple-300 border border-purple-500/30">
                                    Bot Siap
                                  </span>
                                ) : player.isReady ? (
                                  <span className="px-2 py-0.2 rounded-full text-[9px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                                    Siap
                                  </span>
                                ) : (
                                  <span className="px-2 py-0.2 rounded-full text-[9px] font-medium bg-slate-800 text-slate-400">
                                    Menunggu
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>

                          {isHost && !player.isHost && (
                            <button
                              onClick={() => kickPlayer(player.userId)}
                              title="Keluarkan dari Meja"
                              className="p-1.5 rounded-lg bg-red-950/40 text-red-400 hover:bg-red-900/60 transition"
                            >
                              <UserX className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      ) : (
                        <div className="text-center py-3">
                          <Users className="w-5 h-5 mx-auto mb-1 opacity-40 text-slate-400" />
                          <p className="text-xs font-semibold text-slate-400 mb-1.5">
                            Kursi Kosong #{idx + 1}
                          </p>
                          {isHost ? (
                            <button
                              onClick={handleAddBot}
                              disabled={addingBot}
                              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-purple-950/70 hover:bg-purple-900/90 border border-purple-500/40 text-purple-200 text-xs font-bold transition active:scale-95 shadow"
                            >
                              <Bot className="w-3.5 h-3.5 text-purple-400" />
                              + Tambah Bot
                            </button>
                          ) : (
                            <p className="text-[10px] text-slate-500">Menunggu pemain...</p>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ACTION BUTTONS (READY, START, LEAVE) */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-4 flex flex-wrap items-center justify-between gap-3 shadow-xl">
            <button
              onClick={leaveRoom}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs transition"
            >
              <LogOut className="w-4 h-4" />
              Keluar Meja
            </button>

            <div className="flex items-center gap-2.5">
              {isHost && currentRoom.players.length < currentRoom.maxPlayers && (
                <button
                  onClick={handleAddBot}
                  disabled={addingBot}
                  className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-purple-950/80 hover:bg-purple-900 border border-purple-500/50 text-purple-200 font-bold text-xs transition active:scale-95 shadow-md"
                >
                  <Bot className="w-4 h-4 text-purple-400" />
                  + Bot
                </button>
              )}

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
                  className="flex items-center gap-2 px-6 sm:px-8 py-2.5 sm:py-3 rounded-xl bg-gradient-to-r from-emerald-500 via-emerald-400 to-teal-400 text-slate-950 font-black text-xs sm:text-sm hover:brightness-110 active:scale-95 transition shadow-[0_0_20px_rgba(16,185,129,0.5)]"
                >
                  <Play className="w-4 sm:w-5 h-4 sm:h-5 fill-current" />
                  Mulai Pertandingan
                </button>
              )}
            </div>
          </div>
        </div>

        {/* IN-ROOM CHAT (1 Column) */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-4 sm:p-5 flex flex-col h-[480px] shadow-xl backdrop-blur-xl">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-800">
            <MessageSquare className="w-4 h-4 text-emerald-400" />
            <h3 className="text-sm font-bold text-white">Obrolan Meja</h3>
          </div>

          <div className="flex-1 overflow-y-auto py-3 space-y-2 text-xs">
            {chatMessages.length === 0 ? (
              <p className="text-slate-500 text-center py-12">Belum ada obrolan.</p>
            ) : (
              chatMessages.map((msg) => (
                <div key={msg.id} className="bg-slate-950/70 border border-slate-800/60 rounded-xl p-2.5">
                  <span className="font-bold text-amber-400 text-[10px] block">{msg.nickname}</span>
                  <p className="text-slate-200 mt-0.5">{msg.text}</p>
                </div>
              ))
            )}
          </div>

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
              className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs"
            >
              <Send className="w-3.5 h-3.5" />
            </button>
          </form>
        </div>
      </div>

      {showFriendModal && <FriendModal onClose={() => setShowFriendModal(false)} />}
    </div>
  );
};

// Sub-component for Team Battle Seat Display with ON MIC status
function SeatSlotCard({
  slotIndex,
  player,
  currentUserId,
  isMicOn,
  isSpeaking,
  speakingUsers,
  mutedUsers,
  teamName,
  teamColor,
  isHostUser,
  onKick,
  onAddBot,
  addingBot,
}: {
  slotIndex: number;
  player?: RoomPlayer;
  currentUserId?: string;
  isMicOn: boolean;
  isSpeaking: boolean;
  speakingUsers: Record<string, boolean>;
  mutedUsers: Record<string, boolean>;
  teamName: string;
  teamColor: 'red' | 'blue';
  isHostUser: boolean;
  onKick: (id: string) => void;
  onAddBot?: () => void;
  addingBot?: boolean;
}) {
  const isRed = teamColor === 'red';
  const isMe = player?.userId === currentUserId;
  const playerSpeaking = isMe ? isSpeaking : player ? Boolean(speakingUsers[player.userId]) : false;
  const playerMuted = isMe ? !isMicOn : player ? Boolean(mutedUsers[player.userId]) : false;

  return (
    <div
      className={`relative z-10 w-40 sm:w-44 rounded-2xl p-2.5 border backdrop-blur-md transition-all ${
        player
          ? isRed
            ? playerSpeaking
              ? 'bg-red-950 border-emerald-400 shadow-[0_0_20px_rgba(16,185,129,0.5)] ring-2 ring-emerald-400'
              : 'bg-red-950/70 border-red-700/60'
            : playerSpeaking
            ? 'bg-blue-950 border-emerald-400 shadow-[0_0_20px_rgba(16,185,129,0.5)] ring-2 ring-emerald-400'
            : 'bg-blue-950/70 border-blue-700/60'
          : 'bg-slate-950/40 border-dashed border-slate-800 text-slate-600'
      }`}
    >
      <div className="flex items-center justify-between mb-1">
        <span
          className={`text-[8px] sm:text-[9px] font-black uppercase tracking-wider ${
            isRed ? 'text-red-400' : 'text-blue-400'
          }`}
        >
          {teamName}
        </span>
        <span className="text-[8px] text-slate-500">Kursi #{slotIndex + 1}</span>
      </div>

      {player ? (
        <div className="flex items-center gap-2">
          <div className="relative shrink-0">
            <span
              className={`text-2xl inline-block transition-transform ${
                playerSpeaking ? 'scale-110 drop-shadow-[0_0_8px_rgba(52,211,153,0.8)]' : ''
              }`}
            >
              {AVATAR_ICONS[player.avatar] || '🦁'}
            </span>

            {/* Speaking / Mic indicator */}
            <div className="absolute -bottom-1 -right-1">
              {playerSpeaking ? (
                <span className="w-3.5 h-3.5 rounded-full bg-emerald-500 text-slate-950 flex items-center justify-center text-[8px] shadow animate-bounce">
                  <Mic className="w-2 h-2" />
                </span>
              ) : playerMuted ? (
                <span className="w-3.5 h-3.5 rounded-full bg-red-950 border border-red-500 text-red-400 flex items-center justify-center text-[8px]">
                  <MicOff className="w-2 h-2" />
                </span>
              ) : (
                <span className="w-3.5 h-3.5 rounded-full bg-slate-900 border border-emerald-500/40 text-emerald-400 flex items-center justify-center text-[8px]">
                  <Mic className="w-2 h-2" />
                </span>
              )}
            </div>
          </div>

          <div className="overflow-hidden flex-1">
            <div className="flex items-center gap-1">
              <span className="font-bold text-white text-xs truncate">{player.nickname}</span>
              {player.isHost && <Crown className="w-3 h-3 text-amber-400 shrink-0" />}
            </div>
            <div className="mt-0.5">
              {player.isHost ? (
                <span className="text-[9px] text-amber-400 font-semibold">Host</span>
              ) : player.isBot ? (
                <span className="text-[9px] text-purple-300 font-bold">Bot Siap</span>
              ) : player.isReady ? (
                <span className="text-[9px] text-emerald-400 font-bold">Siap</span>
              ) : (
                <span className="text-[9px] text-slate-400">Belum Siap</span>
              )}
            </div>
          </div>

          {isHostUser && !player.isHost && (
            <button
              onClick={() => onKick(player.userId)}
              title="Keluarkan"
              className="text-red-400 hover:text-white"
            >
              <UserX className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      ) : (
        <div className="text-center py-1">
          {isHostUser && onAddBot ? (
            <button
              onClick={onAddBot}
              disabled={addingBot}
              className="w-full py-1 px-1.5 rounded-xl bg-purple-950/70 border border-purple-500/40 text-purple-200 text-[9px] font-bold flex items-center justify-center gap-1"
            >
              <Bot className="w-2.5 h-2.5 text-purple-400" />
              + Bot
            </button>
          ) : (
            <span className="text-[10px] text-slate-500">Kursi Kosong</span>
          )}
        </div>
      )}
    </div>
  );
}
