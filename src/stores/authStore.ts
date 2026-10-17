import { create } from 'zustand';
import { getSocket, updateSocketAuthToken, disconnectSocket } from '@/lib/socket';

export interface UserProfile {
  id: string;
  username: string;
  email: string;
  nickname: string;
  avatar: string;
  totalGames: number;
  wins: number;
  losses: number;
  soloGames: number;
  soloWins: number;
  teamGames: number;
  teamWins: number;
  rankTier?: string;
  rankDivision?: string;
  rankStars?: number;
  rankScore?: number;
  role?: string;
  isBanned?: boolean;
}

interface AuthState {
  user: UserProfile | null;
  token: string | null;
  isLoading: boolean;
  error: string | null;

  checkAuth: () => Promise<void>;
  login: (identifier: string, pass: string) => Promise<{ success: boolean; error?: string }>;
  register: (u: string, e: string, p: string, nick?: string) => Promise<{ success: boolean; error?: string }>;
  updateProfile: (nick: string, ava: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  clearError: () => void;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  token: null,
  isLoading: true,
  error: null,

  clearError: () => set({ error: null }),

  checkAuth: async () => {
    try {
      set({ isLoading: true });
      const res = await fetch('/api/auth/me');
      if (res.ok) {
        const data = await res.json();
        set({ user: data.user, token: data.token, isLoading: false, error: null });
        if (data.token) {
          updateSocketAuthToken(data.token);
        }
      } else {
        set({ user: null, token: null, isLoading: false });
        updateSocketAuthToken(null);
      }
    } catch {
      set({ user: null, token: null, isLoading: false });
    }
  },

  login: async (identifier, password) => {
    try {
      set({ error: null });
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        set({ error: data.error || 'Login gagal.' });
        return { success: false, error: data.error };
      }

      set({ user: data.user, token: data.token, error: null });
      updateSocketAuthToken(data.token);

      return { success: true };
    } catch (err: any) {
      set({ error: err.message || 'Kesalahan jaringan saat login.' });
      return { success: false, error: err.message };
    }
  },

  register: async (username, email, password, nickname) => {
    try {
      set({ error: null });
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, email, password, nickname }),
      });
      const data = await res.json();
      if (!res.ok) {
        set({ error: data.error || 'Pendaftaran gagal.' });
        return { success: false, error: data.error };
      }

      set({ user: data.user, token: data.token, error: null });
      updateSocketAuthToken(data.token);

      return { success: true };
    } catch (err: any) {
      set({ error: err.message || 'Kesalahan jaringan saat registrasi.' });
      return { success: false, error: err.message };
    }
  },

  updateProfile: async (nickname, avatar) => {
    try {
      const res = await fetch('/api/user/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nickname, avatar }),
      });
      const data = await res.json();
      if (!res.ok) {
        return { success: false, error: data.error || 'Gagal mengubah profil.' };
      }

      set((state) => ({
        user: state.user ? { ...state.user, ...data.user } : data.user,
        token: data.token || state.token,
      }));

      if (data.token) {
        updateSocketAuthToken(data.token);
      }

      const socket = getSocket();
      if (socket.connected) {
        socket.emit('profile:nickname:update', { nickname, avatar });
      }

      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message || 'Gagal memperbarui profil.' };
    }
  },

  logout: async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } finally {
      disconnectSocket();
      set({ user: null, token: null, error: null });
    }
  },
}));
