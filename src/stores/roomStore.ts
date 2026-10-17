import { create } from 'zustand';
import { getSocket } from '@/lib/socket';
import { sound } from '@/lib/audio';
import { useAuthStore } from './authStore';
import { useGameStore } from './gameStore';

export interface RoomPlayer {
  userId: string;
  username: string;
  nickname: string;
  avatar: string;
  seatIndex: number;
  team: 'TEAM_A' | 'TEAM_B' | null;
  rankTier?: string;
  rankDivision?: string;
  rankStars?: number;
  isBot?: boolean;
  isReady: boolean;
  isConnected: boolean;
  isHost: boolean;
}

export interface ClientRoom {
  code: string;
  name: string;
  mode: 'SOLO' | 'TEAM_BATTLE';
  isPublic: boolean;
  maxPlayers: number;
  hostId: string;
  status: 'WAITING' | 'PLAYING' | 'FINISHED';
  roundNumber?: number;
  lastWinnerUserId?: string;
  lastWinnerTeam?: 'TEAM_A' | 'TEAM_B' | null;
  players: RoomPlayer[];
}

export interface ChatMessage {
  id: string;
  userId: string;
  nickname: string;
  avatar: string;
  text: string;
  isEmote?: boolean;
  timestamp: number;
}

interface RoomState {
  currentRoom: ClientRoom | null;
  chatMessages: ChatMessage[];
  isCreating: boolean;
  isJoining: boolean;
  error: string | null;

  setRoom: (room: ClientRoom | null) => void;
  addChatMessage: (msg: ChatMessage) => void;
  clearRoom: () => void;
  setError: (err: string | null) => void;
  syncState: () => void;

  createRoom: (params: {
    name: string;
    mode: 'SOLO' | 'TEAM_BATTLE';
    isPublic: boolean;
    maxPlayers?: number;
    turnTimeout?: number;
  }) => Promise<{ success: boolean; roomCode?: string; error?: string }>;

  joinRoom: (roomCode: string) => Promise<{ success: boolean; error?: string }>;
  leaveRoom: () => Promise<void>;
  toggleReady: () => void;
  startGame: () => void;
  kickPlayer: (targetUserId: string) => void;
  sendChat: (text: string, isEmote?: boolean) => void;
  addBot: () => Promise<{ success: boolean; error?: string }>;
  playAgain: () => Promise<{ success: boolean; error?: string }>;
  initSocketListeners: () => void;
}

export const useRoomStore = create<RoomState>((set, get) => ({
  currentRoom: null,
  chatMessages: [],
  isCreating: false,
  isJoining: false,
  error: null,

  setRoom: (room) => set({ currentRoom: room }),
  addChatMessage: (msg) =>
    set((state) => ({ chatMessages: [...state.chatMessages.slice(-50), msg] })),
  clearRoom: () => set({ currentRoom: null, chatMessages: [] }),
  setError: (error) => set({ error }),

  syncState: () => {
    const socket = getSocket();
    if (!socket.connected) {
      socket.connect();
    }
    socket.emit('sync:state', (res: any) => {
      if (res && res.success) {
        if (res.room) {
          set({ currentRoom: res.room, error: null });
        }
        if (res.gameState) {
          useGameStore.getState().setGameState(res.gameState);
        }
      }
    });
  },

  initSocketListeners: () => {
    const socket = getSocket();

    socket.off('connect');
    socket.off('room:updated');
    socket.off('room:player-joined');
    socket.off('room:player-left');
    socket.off('room:started');
    socket.off('chat:message');
    socket.off('player:disconnected');
    socket.off('player:reconnected');
    socket.off('room:reset');

    socket.on('connect', () => {
      get().syncState();
    });

    socket.on('room:updated', (updatedRoom: ClientRoom) => {
      set({ currentRoom: updatedRoom, isCreating: false, isJoining: false, error: null });
    });

    socket.on('room:reset', () => {
      sound.playTileClick();
      useGameStore.getState().resetGame();
      useAuthStore.getState().checkAuth();
      set((state) =>
        state.currentRoom
          ? { currentRoom: { ...state.currentRoom, status: 'WAITING' } }
          : {}
      );
      get().syncState();
    });

    socket.on('room:player-joined', () => {
      sound.playTileClick();
    });

    socket.on('room:player-left', () => {
      sound.playPass();
    });

    socket.on('room:started', () => {
      sound.playShuffle();
      set((state) =>
        state.currentRoom
          ? { currentRoom: { ...state.currentRoom, status: 'PLAYING' } }
          : {}
      );
      // Trigger sync immediately to receive fresh domino hand
      get().syncState();
    });

    socket.on('chat:message', (msg: ChatMessage) => {
      sound.playChatPop();
      get().addChatMessage(msg);
    });

    socket.on('player:reconnected', () => {
      sound.playTileClick();
    });

    // Auto-sync immediately on listener initialization
    if (socket.connected) {
      get().syncState();
    }
  },

  createRoom: async (params) => {
    set({ isCreating: true, error: null });

    const user = useAuthStore.getState().user;
    if (!user) {
      const errMsg = 'Silakan masuk (login) terlebih dahulu untuk membuat meja.';
      set({ isCreating: false, error: errMsg });
      return { success: false, error: errMsg };
    }

    const socket = getSocket();
    if (!socket.connected) {
      socket.connect();
    }

    return new Promise((resolve) => {
      let resolved = false;

      // 6-second timeout failsafe prevents button from ever getting stuck in "Membuat..."
      const timer = setTimeout(() => {
        if (!resolved) {
          resolved = true;
          set({
            isCreating: false,
            error: 'Koneksi ke game server tidak merespons. Pastikan Anda sudah login atau coba refresh halaman.',
          });
          resolve({ success: false, error: 'Waktu tunggu habis.' });
        }
      }, 6000);

      socket.emit('room:create', params, (res: any) => {
        if (resolved) return;
        resolved = true;
        clearTimeout(timer);
        set({ isCreating: false });

        if (res && res.success) {
          if (res.room) {
            set({ currentRoom: res.room, error: null });
          }
          resolve({ success: true, roomCode: res.roomCode });
        } else {
          const err = res?.error || 'Gagal membuat room.';
          set({ error: err });
          resolve({ success: false, error: err });
        }
      });
    });
  },

  joinRoom: async (roomCode: string) => {
    set({ isJoining: true, error: null });

    const user = useAuthStore.getState().user;
    if (!user) {
      const errMsg = 'Silakan masuk (login) terlebih dahulu untuk bergabung ke meja.';
      set({ isJoining: false, error: errMsg });
      return { success: false, error: errMsg };
    }

    const socket = getSocket();
    if (!socket.connected) {
      socket.connect();
    }

    return new Promise((resolve) => {
      let resolved = false;

      const timer = setTimeout(() => {
        if (!resolved) {
          resolved = true;
          set({
            isJoining: false,
            error: 'Waktu tunggu habis. Pastikan kode room benar dan server aktif.',
          });
          resolve({ success: false, error: 'Waktu tunggu habis.' });
        }
      }, 6000);

      socket.emit('room:join', { roomCode: roomCode.trim().toUpperCase() }, (res: any) => {
        if (resolved) return;
        resolved = true;
        clearTimeout(timer);
        set({ isJoining: false });

        if (res && res.success) {
          if (res.room) {
            set({ currentRoom: res.room, error: null });
          }
          resolve({ success: true });
        } else {
          const err = res?.error || 'Gagal bergabung ke room.';
          set({ error: err });
          resolve({ success: false, error: err });
        }
      });
    });
  },

  leaveRoom: async () => {
    const room = get().currentRoom;
    if (room) {
      const socket = getSocket();
      socket.emit('room:leave', { roomCode: room.code });
      set({ currentRoom: null, chatMessages: [] });
    }
  },

  toggleReady: () => {
    const room = get().currentRoom;
    if (room) {
      const socket = getSocket();
      socket.emit('room:ready', { roomCode: room.code });
    }
  },

  startGame: () => {
    const room = get().currentRoom;
    if (room) {
      const socket = getSocket();
      socket.emit('room:start', { roomCode: room.code }, (res: any) => {
        if (res && !res.success) {
          set({ error: res.error });
        }
      });
    }
  },

  kickPlayer: (targetUserId: string) => {
    const room = get().currentRoom;
    if (room) {
      const socket = getSocket();
      socket.emit('room:kick', { roomCode: room.code, targetUserId });
    }
  },

  sendChat: (text: string, isEmote?: boolean) => {
    const room = get().currentRoom;
    if (room && text.trim()) {
      const socket = getSocket();
      socket.emit('chat:send', { roomCode: room.code, text, isEmote });
    }
  },

  addBot: async () => {
    const room = get().currentRoom;
    if (!room) return { success: false, error: 'Tidak ada room aktif.' };

    const socket = getSocket();
    return new Promise((resolve) => {
      socket.emit('room:add-bot', { roomCode: room.code }, (res: any) => {
        if (res && res.success) {
          resolve({ success: true });
        } else {
          const err = res?.error || 'Gagal menambahkan bot ke meja.';
          set({ error: err });
          resolve({ success: false, error: err });
        }
      });
    });
  },

  playAgain: async () => {
    const room = get().currentRoom;
    if (!room) return { success: false, error: 'Tidak ada room aktif.' };

    const socket = getSocket();
    return new Promise((resolve) => {
      socket.emit('room:play-again', { roomCode: room.code }, (res: any) => {
        if (res && res.success) {
          useGameStore.getState().resetGame();
          useAuthStore.getState().checkAuth();
          set((state) =>
            state.currentRoom
              ? {
                  currentRoom: {
                    ...state.currentRoom,
                    status: 'WAITING',
                    roundNumber: res.roundNumber,
                  },
                }
              : {}
          );
          resolve({ success: true });
        } else {
          resolve({
            success: false,
            error: res?.error || 'Gagal mereset room untuk ronde berikutnya.',
          });
        }
      });
    });
  },
}));
