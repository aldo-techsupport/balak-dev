'use client';

import React, { useState, useEffect } from 'react';
import { useAuthStore } from '@/stores/authStore';
import { useRoomStore } from '@/stores/roomStore';
import {
  Users,
  UserPlus,
  Search,
  Trash2,
  Share2,
  Check,
  Trophy,
  Sparkles,
  Gamepad2,
  X,
  AlertCircle,
} from 'lucide-react';
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

interface FriendItem {
  friendshipId: string;
  id: string;
  username: string;
  nickname: string;
  avatar: string;
  rankTier?: string;
  rankDivision?: string;
  rankStars?: number;
  totalGames: number;
  wins: number;
}

interface SearchUser {
  id: string;
  username: string;
  nickname: string;
  avatar: string;
  rankTier?: string;
  rankDivision?: string;
  rankStars?: number;
  totalGames: number;
  wins: number;
  isFriend: boolean;
}

interface FriendModalProps {
  onClose: () => void;
}

export const FriendModal: React.FC<FriendModalProps> = ({ onClose }) => {
  const { user } = useAuthStore();
  const { currentRoom } = useRoomStore();

  const [activeTab, setActiveTab] = useState<'friends' | 'search'>('friends');
  const [friends, setFriends] = useState<FriendItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchUser[]>([]);
  const [searching, setSearching] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [copiedRoomCode, setCopiedRoomCode] = useState<string | null>(null);

  const fetchFriends = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/friends');
      if (res.ok) {
        const data = await res.json();
        setFriends(data.friends || []);
      }
    } catch (err) {
      console.error('Fetch friends error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      fetchFriends();
    }
  }, [user]);

  // Live search users
  useEffect(() => {
    if (!searchQuery.trim() || searchQuery.trim().length < 2) {
      setSearchResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      try {
        setSearching(true);
        const res = await fetch(`/api/friends/search?q=${encodeURIComponent(searchQuery.trim())}`);
        if (res.ok) {
          const data = await res.json();
          setSearchResults(data.users || []);
        }
      } catch (err) {
        console.error('Search friends error:', err);
      } finally {
        setSearching(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  const handleAddFriend = async (friendId?: string, friendUsername?: string) => {
    try {
      setErrorMessage(null);
      const res = await fetch('/api/friends', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ friendId, friendUsername }),
      });
      const data = await res.json();
      if (!res.ok) {
        setErrorMessage(data.error || 'Gagal menambahkan teman.');
        return;
      }
      setStatusMessage(data.message || 'Teman berhasil ditambahkan!');
      setTimeout(() => setStatusMessage(null), 3000);
      fetchFriends();
      // Update search results isFriend state
      if (friendId) {
        setSearchResults((prev) =>
          prev.map((u) => (u.id === friendId ? { ...u, isFriend: true } : u))
        );
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Kesalahan jaringan.');
    }
  };

  const handleRemoveFriend = async (friendId: string, nickname: string) => {
    if (!confirm(`Hapus ${nickname} dari daftar teman?`)) return;

    try {
      const res = await fetch(`/api/friends?friendId=${friendId}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        setFriends((prev) => prev.filter((f) => f.id !== friendId));
        setStatusMessage(`${nickname} dihapus dari daftar teman.`);
        setTimeout(() => setStatusMessage(null), 3000);
      }
    } catch (err) {
      console.error('Remove friend error:', err);
    }
  };

  const handleInviteToRoom = (friend: FriendItem) => {
    if (!currentRoom) {
      setErrorMessage('Anda belum berada di dalam meja game.');
      setTimeout(() => setErrorMessage(null), 3000);
      return;
    }

    const socket = getSocket();
    socket.emit('friend:invite', {
      targetUserId: friend.id,
      roomCode: currentRoom.code,
    });

    navigator.clipboard.writeText(currentRoom.code);
    setCopiedRoomCode(friend.id);
    setStatusMessage(`Undangan dikirim ke ${friend.nickname}! Kode #${currentRoom.code} disalin.`);
    setTimeout(() => {
      setCopiedRoomCode(null);
      setStatusMessage(null);
    }, 3000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-3 sm:p-4 animate-fade-in select-none">
      <div className="bg-gradient-to-b from-slate-900 via-slate-950 to-black border border-amber-500/40 rounded-3xl max-w-lg w-full p-4 sm:p-6 shadow-[0_0_50px_rgba(245,158,11,0.2)] flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-amber-600 to-yellow-400 flex items-center justify-center text-slate-950 shadow-md">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-black text-white flex items-center gap-1.5">
                Daftar Teman
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 font-bold border border-amber-500/30">
                  {friends.length} Teman
                </span>
              </h3>
              <p className="text-[11px] text-slate-400">Main bareng dan ajak teman ke meja Gaple</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-white transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Selector */}
        <div className="flex items-center gap-2 mt-4 p-1 bg-slate-900 border border-slate-800 rounded-2xl">
          <button
            onClick={() => setActiveTab('friends')}
            className={`flex-1 py-2 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 ${
              activeTab === 'friends'
                ? 'bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            Teman Saya ({friends.length})
          </button>
          <button
            onClick={() => setActiveTab('search')}
            className={`flex-1 py-2 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 ${
              activeTab === 'search'
                ? 'bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <UserPlus className="w-3.5 h-3.5" />
            Cari & Tambah
          </button>
        </div>

        {/* Notification alerts */}
        {statusMessage && (
          <div className="mt-3 p-2.5 rounded-xl bg-emerald-950/80 border border-emerald-500/60 text-emerald-200 text-xs flex items-center gap-2">
            <Check className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{statusMessage}</span>
          </div>
        )}

        {errorMessage && (
          <div className="mt-3 p-2.5 rounded-xl bg-red-950/80 border border-red-500/60 text-red-200 text-xs flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
              <span>{errorMessage}</span>
            </div>
            <button onClick={() => setErrorMessage(null)} className="text-red-400 hover:text-white text-xs font-bold">
              ✕
            </button>
          </div>
        )}

        {/* Tab 1: Friends List */}
        {activeTab === 'friends' && (
          <div className="flex-1 overflow-y-auto mt-3 space-y-2 pr-1 min-h-[220px]">
            {loading ? (
              <div className="py-12 text-center text-slate-400 text-xs">
                <div className="w-8 h-8 border-2 border-amber-400 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                Memuat daftar teman...
              </div>
            ) : friends.length === 0 ? (
              <div className="py-12 px-4 text-center border border-dashed border-slate-800 rounded-2xl bg-slate-950/40">
                <Users className="w-10 h-10 text-slate-600 mx-auto mb-2" />
                <p className="text-white font-bold text-sm">Belum Ada Teman</p>
                <p className="text-slate-400 text-xs mt-1">
                  Cari pemain di tab "Cari & Tambah" untuk menambahkan teman bermain Gaple.
                </p>
                <button
                  onClick={() => setActiveTab('search')}
                  className="mt-3 px-4 py-2 rounded-xl bg-amber-500 text-slate-950 font-bold text-xs"
                >
                  Cari Pemain Sekarang
                </button>
              </div>
            ) : (
              friends.map((friend) => {
                const rankInfo = getRankInfo(friend.rankTier, friend.rankDivision, friend.rankStars);
                const winRate =
                  friend.totalGames > 0 ? Math.round((friend.wins / friend.totalGames) * 100) : 0;

                return (
                  <div
                    key={friend.id}
                    className="p-3 rounded-2xl bg-slate-900/80 border border-slate-800 hover:border-slate-700 transition flex items-center justify-between gap-2"
                  >
                    <div className="flex items-center gap-3 truncate">
                      <span className="text-2xl sm:text-3xl shrink-0">
                        {AVATAR_ICONS[friend.avatar] || '🦁'}
                      </span>
                      <div className="truncate">
                        <div className="flex items-center gap-1.5">
                          <span className="text-white font-bold text-xs sm:text-sm truncate">
                            {friend.nickname}
                          </span>
                          <span className="text-[10px] text-slate-400 font-mono">
                            @{friend.username}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-[10px] mt-0.5">
                          <span className="text-amber-300 font-bold flex items-center gap-0.5">
                            <span>{rankInfo.icon}</span>
                            <span>{rankInfo.title}</span>
                          </span>
                          <span className="text-slate-500">•</span>
                          <span className="text-emerald-400 font-mono font-bold">
                            {winRate}% WR ({friend.wins}W)
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-1.5 shrink-0">
                      {currentRoom && (
                        <button
                          onClick={() => handleInviteToRoom(friend)}
                          className="px-2.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[10px] flex items-center gap-1 transition"
                          title="Ajak ke meja saat ini"
                        >
                          <Gamepad2 className="w-3 h-3" />
                          <span>Ajak</span>
                        </button>
                      )}

                      <button
                        onClick={() => handleRemoveFriend(friend.id, friend.nickname)}
                        className="p-1.5 rounded-xl bg-slate-800 hover:bg-red-950/60 text-slate-400 hover:text-red-400 transition"
                        title="Hapus Teman"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}

        {/* Tab 2: Search Users to Add */}
        {activeTab === 'search' && (
          <div className="flex-1 overflow-y-auto mt-3 space-y-3 pr-1 min-h-[220px]">
            {/* Search Bar */}
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Ketik username atau nickname pemain..."
                className="w-full bg-slate-900 border border-slate-700 rounded-2xl pl-9 pr-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-400"
              />
            </div>

            {searching ? (
              <div className="py-8 text-center text-slate-400 text-xs">Mencari pemain...</div>
            ) : searchResults.length === 0 ? (
              <div className="py-8 text-center text-slate-500 text-xs">
                {searchQuery.trim().length >= 2
                  ? 'Pemain tidak ditemukan.'
                  : 'Ketik minimal 2 karakter untuk mencari pemain.'}
              </div>
            ) : (
              searchResults.map((target) => {
                const rankInfo = getRankInfo(target.rankTier, target.rankDivision, target.rankStars);

                return (
                  <div
                    key={target.id}
                    className="p-3 rounded-2xl bg-slate-900/80 border border-slate-800 flex items-center justify-between gap-2"
                  >
                    <div className="flex items-center gap-3 truncate">
                      <span className="text-2xl shrink-0">
                        {AVATAR_ICONS[target.avatar] || '🦁'}
                      </span>
                      <div className="truncate">
                        <div className="flex items-center gap-1.5">
                          <span className="text-white font-bold text-xs truncate">
                            {target.nickname}
                          </span>
                          <span className="text-[10px] text-slate-400 font-mono">
                            @{target.username}
                          </span>
                        </div>
                        <span className="text-[10px] text-amber-300 font-bold block mt-0.5">
                          {rankInfo.icon} {rankInfo.title}
                        </span>
                      </div>
                    </div>

                    <div>
                      {target.isFriend ? (
                        <span className="px-3 py-1 rounded-xl bg-slate-800 text-slate-400 text-[10px] font-bold">
                          Berteman
                        </span>
                      ) : (
                        <button
                          onClick={() => handleAddFriend(target.id, target.username)}
                          className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black text-xs flex items-center gap-1 transition active:scale-95 shadow-md"
                        >
                          <UserPlus className="w-3.5 h-3.5" />
                          <span>Tambah</span>
                        </button>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}
      </div>
    </div>
  );
};
