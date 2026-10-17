import { GameMode, PlayerSlot, RoomData, Team } from './types';
import { GameEngine } from './game/engine';

export const HARD_BOT_POOL = [
  {
    userId: 'a042c586-91a6-42a1-b9ea-b5228902999f',
    username: 'bot_hard_1',
    nickname: '👑 AI Mythic Glory (100★)',
    avatar: 'avatar_8',
    rankTier: 'MYTHIC',
    rankDivision: 'Mythic',
    rankStars: 100,
  },
  {
    userId: 'cd948096-2c70-4fd4-a695-fab4e5a0b1c1',
    username: 'bot_hard_2',
    nickname: '⚡ Dewa Balak Mythic (100★)',
    avatar: 'avatar_4',
    rankTier: 'MYTHIC',
    rankDivision: 'Mythic',
    rankStars: 100,
  },
  {
    userId: '27f548d3-faf0-4ed9-8810-027034990de5',
    username: 'bot_hard_3',
    nickname: '🔥 Grandmaster Gaple (100★)',
    avatar: 'avatar_1',
    rankTier: 'MYTHIC',
    rankDivision: 'Mythic',
    rankStars: 100,
  },
  {
    userId: 'e5e7d365-2dd0-402e-86b4-3e2de5db2351',
    username: 'bot_hard_4',
    nickname: '🤖 Alpha Domino (100★)',
    avatar: 'avatar_6',
    rankTier: 'MYTHIC',
    rankDivision: 'Mythic',
    rankStars: 100,
  },
  {
    userId: 'c32e1a48-a5a5-4129-8c33-30656fbe69b6',
    username: 'bot_hard_5',
    nickname: '🎯 Predator Balak (100★)',
    avatar: 'avatar_3',
    rankTier: 'MYTHIC',
    rankDivision: 'Mythic',
    rankStars: 100,
  },
  {
    userId: 'ac4691b0-e679-48a6-b5d2-903285f6834e',
    username: 'bot_hard_6',
    nickname: '🏆 Sang Juara Mythic (100★)',
    avatar: 'avatar_5',
    rankTier: 'MYTHIC',
    rankDivision: 'Mythic',
    rankStars: 100,
  },
];

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
    hostUser: {
      id: string;
      username: string;
      nickname: string;
      avatar: string;
      rankTier?: string;
      rankDivision?: string;
      rankStars?: number;
    };
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
      rankTier: params.hostUser.rankTier || 'WARRIOR',
      rankDivision: params.hostUser.rankDivision || 'III',
      rankStars: params.hostUser.rankStars || 0,
      wins: (params.hostUser as any).wins || 0,
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
      roundNumber: 1,
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
    user: {
      id: string;
      username: string;
      nickname: string;
      avatar: string;
      rankTier?: string;
      rankDivision?: string;
      rankStars?: number;
    }
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
      if (user.rankTier) existing.rankTier = user.rankTier;
      if (user.rankDivision) existing.rankDivision = user.rankDivision;
      if (user.rankStars !== undefined) existing.rankStars = user.rankStars;
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
      rankTier: user.rankTier || 'WARRIOR',
      rankDivision: user.rankDivision || 'III',
      rankStars: user.rankStars || 0,
      wins: (user as any).wins || 0,
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
   * Host adds a Hard Mode Bot to an empty seat
   */
  public addBot(
    code: string,
    hostUserId: string
  ): { success: boolean; error?: string; room?: RoomData; bot?: PlayerSlot } {
    const room = this.getRoom(code);
    if (!room) return { success: false, error: 'Room tidak ditemukan.' };

    if (room.hostId !== hostUserId) {
      return { success: false, error: 'Hanya host yang dapat menambahkan bot ke meja.' };
    }

    if (room.status !== 'WAITING') {
      return { success: false, error: 'Tidak dapat menambah bot saat permainan sedang berlangsung.' };
    }

    if (room.players.length >= room.maxPlayers) {
      return { success: false, error: 'Meja sudah penuh.' };
    }

    // Find next available bot from pool not currently in room
    const currentOccupiedBotIds = new Set(room.players.map((p) => p.userId));
    const availableBot = HARD_BOT_POOL.find((b) => !currentOccupiedBotIds.has(b.userId));
    if (!availableBot) {
      return { success: false, error: 'Semua bot sedang digunakan di meja ini.' };
    }

    // Find first free seat index (0..maxPlayers-1)
    const takenSeats = new Set(room.players.map((p) => p.seatIndex));
    let seatIndex = 0;
    while (takenSeats.has(seatIndex) && seatIndex < room.maxPlayers) {
      seatIndex++;
    }

    let team: Team | null = null;
    if (room.mode === 'TEAM_BATTLE') {
      team = seatIndex % 2 === 0 ? 'TEAM_A' : 'TEAM_B';
    }

    const botSlot: PlayerSlot = {
      userId: availableBot.userId,
      username: availableBot.username,
      nickname: availableBot.nickname,
      avatar: availableBot.avatar,
      seatIndex,
      team,
      rankTier: availableBot.rankTier,
      rankDivision: availableBot.rankDivision,
      rankStars: availableBot.rankStars,
      wins: 15,
      isReady: true, // Bots are ready immediately
      isConnected: true,
      isHost: false,
      isBot: true,
      socketId: null,
      disconnectedAt: null,
    };

    room.players.push(botSlot);
    room.lastActiveAt = Date.now();
    return { success: true, room, bot: botSlot };
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
   * Reset room for next round without kicking players out
   */
  public resetRoomForNextRound(
    code: string,
    userId: string
  ): { success: boolean; error?: string; room?: RoomData } {
    const room = this.getRoom(code);
    if (!room) return { success: false, error: 'Room tidak ditemukan.' };

    const player = room.players.find((p) => p.userId === userId);
    if (!player) return { success: false, error: 'Pemain tidak ditemukan di room.' };

    // Reset status to WAITING and clear previous game board
    room.status = 'WAITING';
    room.game = null;
    room.roundNumber = (room.roundNumber || 1) + 1;

    // Reset ready states: host & bots are ready, other human players need to ready up
    room.players.forEach((p) => {
      p.isReady = p.isHost || Boolean(p.isBot);
    });

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
    hostAvatar?: string;
    hostRankTier?: string;
    hostRankDivision?: string;
    roundNumber?: number;
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
          hostAvatar: host?.avatar,
          hostRankTier: host?.rankTier,
          hostRankDivision: host?.rankDivision,
          roundNumber: room.roundNumber || 1,
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

  /**
   * Get all rooms for admin panel inspection
   */
  public getAllRoomsDetailed(): any[] {
    const list = [];
    for (const room of this.rooms.values()) {
      list.push({
        code: room.code,
        name: room.name,
        mode: room.mode,
        isPublic: room.isPublic,
        playerCount: room.players.length,
        maxPlayers: room.maxPlayers,
        status: room.status,
        roundNumber: room.roundNumber || 1,
        lastActiveAt: room.lastActiveAt,
        players: room.players.map((p) => ({
          userId: p.userId,
          username: p.username,
          nickname: p.nickname,
          avatar: p.avatar,
          seatIndex: p.seatIndex,
          team: p.team,
          isHost: p.isHost,
          isReady: p.isReady,
          isConnected: p.isConnected,
          rankTier: p.rankTier,
          rankDivision: p.rankDivision,
          rankStars: p.rankStars,
        })),
      });
    }
    return list;
  }

  /**
   * Force close a room by admin
   */
  public forceCloseRoom(code: string): { success: boolean; room?: RoomData } {
    const room = this.rooms.get(code);
    if (!room) return { success: false };
    this.rooms.delete(code);
    return { success: true, room };
  }
}

export const roomManager = new RoomManager();
