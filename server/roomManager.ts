import { GameMode, PlayerSlot, RoomData, Team } from './types';
import { GameEngine } from './game/engine';

export class RoomManager {
  private rooms: Map<string, RoomData> = new Map();

  /**
   * Generate random 6-character room code
   */
  private generateRoomCode(): string {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Avoid O, 0, 1, I
    let code = '';
    for (let i = 0; i < 6; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
  }

  /**
   * Create a new room
   */
  public createRoom(params: {
    hostUser: { id: string; username: string; nickname: string; avatar: string };
    name: string;
    mode: GameMode;
    isPublic: boolean;
    maxPlayers?: number;
    turnTimeout?: number;
  }): RoomData {
    let code = this.generateRoomCode();
    while (this.rooms.has(code)) {
      code = this.generateRoomCode();
    }

    const mode = params.mode;
    const maxPlayers = mode === 'TEAM_BATTLE' ? 4 : (params.maxPlayers || 4);

    const hostSlot: PlayerSlot = {
      userId: params.hostUser.id,
      username: params.hostUser.username,
      nickname: params.hostUser.nickname,
      avatar: params.hostUser.avatar,
      seatIndex: 0,
      team: mode === 'TEAM_BATTLE' ? 'TEAM_A' : null,
      isReady: true, // Host is ready by default
      isConnected: true,
      isHost: true,
      socketId: null,
      disconnectedAt: null,
    };

    const room: RoomData = {
      code,
      name: params.name || `Meja Gaple #${code}`,
      mode,
      isPublic: params.isPublic,
      maxPlayers,
      hostId: params.hostUser.id,
      turnTimeout: params.turnTimeout || 20,
      status: 'WAITING',
      players: [hostSlot],
      game: null,
      createdAt: Date.now(),
      lastActiveAt: Date.now(),
    };

    this.rooms.set(code, room);
    return room;
  }

  /**
   * Find room by code
   */
  public getRoom(code: string): RoomData | undefined {
    return this.rooms.get(code.toUpperCase());
  }

  /**
   * Find room where user is currently seated
   */
  public findUserRoom(userId: string): RoomData | undefined {
    for (const room of this.rooms.values()) {
      if (room.players.some((p) => p.userId === userId)) {
        return room;
      }
    }
    return undefined;
  }

  /**
   * Join an existing room
   */
  public joinRoom(
    code: string,
    user: { id: string; username: string; nickname: string; avatar: string }
  ): { success: boolean; room?: RoomData; error?: string } {
    const room = this.getRoom(code);
    if (!room) {
      return { success: false, error: 'Room tidak ditemukan.' };
    }

    // Check if user is already in this room (reconnection scenario)
    const existingIndex = room.players.findIndex((p) => p.userId === user.id);
    if (existingIndex !== -1) {
      const existing = room.players[existingIndex];
      existing.isConnected = true;
      existing.disconnectedAt = null;
      existing.nickname = user.nickname;
      existing.avatar = user.avatar;
      room.lastActiveAt = Date.now();
      return { success: true, room };
    }

    // New joiner validation
    if (room.status !== 'WAITING') {
      return { success: false, error: 'Permainan di room ini sudah berlangsung.' };
    }

    if (room.players.length >= room.maxPlayers) {
      return { success: false, error: 'Room sudah penuh.' };
    }

    // Find first available seat index (0..3)
    const takenSeats = new Set(room.players.map((p) => p.seatIndex));
    let seatIndex = 0;
    while (takenSeats.has(seatIndex) && seatIndex < room.maxPlayers) {
      seatIndex++;
    }

    // Team Battle Seat mapping:
    // Seat 0: Team A
    // Seat 1: Team B
    // Seat 2: Team A (facing Seat 0)
    // Seat 3: Team B (facing Seat 1)
    let team: Team | null = null;
    if (room.mode === 'TEAM_BATTLE') {
      team = seatIndex % 2 === 0 ? 'TEAM_A' : 'TEAM_B';
    }

    const newSlot: PlayerSlot = {
      userId: user.id,
      username: user.username,
      nickname: user.nickname,
      avatar: user.avatar,
      seatIndex,
      team,
      isReady: false,
      isConnected: true,
      isHost: false,
      socketId: null,
      disconnectedAt: null,
    };

    room.players.push(newSlot);
    room.lastActiveAt = Date.now();
    return { success: true, room };
  }

  /**
   * Leave a room
   */
  public leaveRoom(
    code: string,
    userId: string
  ): { success: boolean; roomDeleted: boolean; room?: RoomData } {
    const room = this.getRoom(code);
    if (!room) {
      return { success: false, roomDeleted: false };
    }

    const playerIndex = room.players.findIndex((p) => p.userId === userId);
    if (playerIndex === -1) {
      return { success: false, roomDeleted: false };
    }

    const player = room.players[playerIndex];

    // If game in progress, we don't immediately remove player slot, but mark disconnected
    if (room.status === 'PLAYING') {
      player.isConnected = false;
      player.disconnectedAt = Date.now();

      // Check if all players are disconnected
      const activeCount = room.players.filter((p) => p.isConnected).length;
      if (activeCount === 0) {
        this.rooms.delete(code);
        return { success: true, roomDeleted: true };
      }

      return { success: true, roomDeleted: false, room };
    }

    // In lobby: remove player slot
    room.players.splice(playerIndex, 1);

    if (room.players.length === 0) {
      this.rooms.delete(code);
      return { success: true, roomDeleted: true };
    }

    // If host left, appoint new host
    if (player.isHost) {
      room.players[0].isHost = true;
      room.players[0].isReady = true;
      room.hostId = room.players[0].userId;
    }

    room.lastActiveAt = Date.now();
    return { success: true, roomDeleted: false, room };
  }

  /**
   * Toggle player ready status
   */
  public toggleReady(code: string, userId: string): { success: boolean; isReady?: boolean; error?: string } {
    const room = this.getRoom(code);
    if (!room) return { success: false, error: 'Room tidak ditemukan.' };

    const player = room.players.find((p) => p.userId === userId);
    if (!player) return { success: false, error: 'Pemain tidak ditemukan di room.' };

    if (player.isHost) {
      player.isReady = true; // Host is always ready
    } else {
      player.isReady = !player.isReady;
    }

    room.lastActiveAt = Date.now();
    return { success: true, isReady: player.isReady };
  }

  /**
   * Host kicks a player from lobby
   */
  public kickPlayer(
    code: string,
    hostUserId: string,
    targetUserId: string
  ): { success: boolean; error?: string; room?: RoomData } {
    const room = this.getRoom(code);
    if (!room) return { success: false, error: 'Room tidak ditemukan.' };

    if (room.hostId !== hostUserId) {
      return { success: false, error: 'Hanya host yang dapat mengeluarkan pemain.' };
    }

    if (room.status !== 'WAITING') {
      return { success: false, error: 'Tidak dapat mengeluarkan pemain saat permainan berlangsung.' };
    }

    if (hostUserId === targetUserId) {
      return { success: false, error: 'Host tidak dapat mengeluarkan diri sendiri.' };
    }

    const targetIdx = room.players.findIndex((p) => p.userId === targetUserId);
    if (targetIdx === -1) {
      return { success: false, error: 'Pemain target tidak ditemukan di room.' };
    }

    room.players.splice(targetIdx, 1);
    room.lastActiveAt = Date.now();
    return { success: true, room };
  }

  /**
   * Host starts the game
   */
  public startGame(
    code: string,
    hostUserId: string
  ): { success: boolean; error?: string; room?: RoomData } {
    const room = this.getRoom(code);
    if (!room) return { success: false, error: 'Room tidak ditemukan.' };

    if (room.hostId !== hostUserId) {
      return { success: false, error: 'Hanya host yang dapat memulai pertandingan.' };
    }

    if (room.status === 'PLAYING') {
      return { success: false, error: 'Pertandingan sudah berjalan.' };
    }

    // Mode Validation
    if (room.mode === 'TEAM_BATTLE') {
      if (room.players.length !== 4) {
        return {
          success: false,
          error: 'Mode Team Battle 2 vs 2 membutuhkan tepat 4 pemain untuk memulai.',
        };
      }
    } else {
      // Solo Mode: 2 to 4 players
      if (room.players.length < 2) {
        return {
          success: false,
          error: 'Dibutuhkan minimal 2 pemain untuk memulai permainan Solo.',
        };
      }
    }

    // Check ready state: all non-hosts must be ready
    const notReady = room.players.filter((p) => !p.isReady && !p.isHost);
    if (notReady.length > 0) {
      const names = notReady.map((p) => p.nickname).join(', ');
      return {
        success: false,
        error: `Semua pemain harus siap (Ready). Belum siap: ${names}`,
      };
    }

    // Initialize Game Engine
    room.game = GameEngine.initGame(room);
    room.status = 'PLAYING';
    room.lastActiveAt = Date.now();

    return { success: true, room };
  }

  /**
   * Mark player disconnected
   */
  public handleDisconnect(socketId: string): { room?: RoomData; userId?: string } {
    for (const room of this.rooms.values()) {
      const player = room.players.find((p) => p.socketId === socketId);
      if (player) {
        player.isConnected = false;
        player.disconnectedAt = Date.now();
        room.lastActiveAt = Date.now();
        return { room, userId: player.userId };
      }
    }
    return {};
  }

  /**
   * List public rooms with available slots
   */
  public getPublicRooms(): {
    code: string;
    name: string;
    mode: GameMode;
    playerCount: number;
    maxPlayers: number;
    status: string;
    hostNickname: string;
  }[] {
    const publicList = [];
    for (const room of this.rooms.values()) {
      if (room.isPublic) {
        const host = room.players.find((p) => p.isHost);
        publicList.push({
          code: room.code,
          name: room.name,
          mode: room.mode,
          playerCount: room.players.length,
          maxPlayers: room.maxPlayers,
          status: room.status,
          hostNickname: host?.nickname || 'Host',
        });
      }
    }
    return publicList;
  }

  /**
   * Periodic cleanup of dead or abandoned rooms
   */
  public cleanupExpiredRooms(): void {
    const now = Date.now();
    const MAX_INACTIVE_MS = 15 * 60 * 1000; // 15 mins
    const RECONNECT_GRACE_PERIOD_MS = 60 * 1000; // 60 seconds grace period

    for (const [code, room] of this.rooms.entries()) {
      // Only treat room as abandoned if ALL players have been disconnected for at least 60s
      const allDisconnectedLongEnough =
        room.players.length > 0 &&
        room.players.every(
          (p) => !p.isConnected && p.disconnectedAt && now - p.disconnectedAt > RECONNECT_GRACE_PERIOD_MS
        );
      const isExpired = now - room.lastActiveAt > MAX_INACTIVE_MS;

      if (allDisconnectedLongEnough || isExpired) {
        console.log(`[RoomManager] Cleaning up abandoned room ${code} (grace period expired)`);
        this.rooms.delete(code);
      }
    }
  }
}

export const roomManager = new RoomManager();
