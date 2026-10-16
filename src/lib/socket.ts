import { io, Socket } from 'socket.io-client';

let socket: Socket | null = null;

export function getSocket(token?: string | null): Socket {
  // If token passed in, store it
  if (token && typeof window !== 'undefined') {
    try {
      localStorage.setItem('gaple_token', token);
    } catch {}
  }

  // If no token passed, try localStorage in browser
  let activeToken = token;
  if (!activeToken && typeof window !== 'undefined') {
    try {
      activeToken = localStorage.getItem('gaple_token');
    } catch {}
  }

  if (!socket) {
    let socketUrl = process.env.NEXT_PUBLIC_SOCKET_URL || '';
    if (typeof window !== 'undefined') {
      // In the browser, always connect to the current origin (e.g. https://balakdev.digitaltekno.cloud)
      // This completely eliminates mixed content and Private Network prompts on mobile and PC
      if (!socketUrl || !window.location.hostname.includes('localhost')) {
        socketUrl = window.location.origin;
      }
    }
    if (!socketUrl) {
      socketUrl = 'http://localhost:4000';
    }

    socket = io(socketUrl, {
      autoConnect: false,
      withCredentials: true,
      auth: {
        token: activeToken || undefined,
      },
      reconnection: true,
      reconnectionAttempts: 15,
      reconnectionDelay: 1000,
      transports: ['websocket', 'polling'],
    });

    socket.on('connect', () => {
      console.log('⚡ Socket connected to game server! ID:', socket?.id);
    });

    socket.on('connect_error', (err) => {
      console.warn('⚠️ Socket connection error:', err.message);
    });

    socket.on('disconnect', (reason) => {
      console.log('🔌 Socket disconnected:', reason);
    });
  }

  // Update token if provided or changed
  if (activeToken) {
    if (!socket.auth) socket.auth = {};
    (socket.auth as any).token = activeToken;
    if (!socket.connected) {
      socket.connect();
    }
  }

  return socket;
}

export function updateSocketAuthToken(token: string | null) {
  if (typeof window !== 'undefined') {
    try {
      if (token) {
        localStorage.setItem('gaple_token', token);
      } else {
        localStorage.removeItem('gaple_token');
      }
    } catch {}
  }

  if (socket) {
    if (!socket.auth) socket.auth = {};
    (socket.auth as any).token = token || undefined;
    if (token && !socket.connected) {
      socket.connect();
    } else if (!token && socket.connected) {
      socket.disconnect();
    }
  }
}

export function disconnectSocket() {
  if (typeof window !== 'undefined') {
    try {
      localStorage.removeItem('gaple_token');
    } catch {}
  }
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}
