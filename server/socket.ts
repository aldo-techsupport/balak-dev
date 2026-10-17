import { Server as SocketIOServer, Socket } from 'socket.io';
import { parse } from 'cookie';
import { verifyToken, TokenPayload } from '../src/lib/auth';
import { prisma } from '../src/lib/prisma';
import { roomManager } from './roomManager';
import { GameEngine } from './game/engine';
import { DominoBotAI } from './game/botAI';
import { RoomData, ChatMessage } from './types';

interface AuthenticatedSocket extends Socket {
  user?: {
    id: string;
    username: string;
    nickname: string;
    avatar: string;
    rankTier?: string;
    rankDivision?: string;
    rankStars?: number;
  };
}

export function registerSocketHandlers(io: SocketIOServer) {
  // Authentication middleware
  io.use(async (socket: AuthenticatedSocket, next) => {
    try {
      let token: string | undefined = socket.handshake.auth?.token;

      // Check cookie if token not passed in handshake auth
      if (!token && socket.handshake.headers.cookie) {
        const cookies = parse(socket.handshake.headers.cookie);
        token = cookies['gaple_session'];
      }

      if (!token) {
        return next(new Error('Autentikasi gagal: Token tidak ditemukan.'));
      }

      const payload = verifyToken(token);
      if (!payload || !payload.userId) {
        return next(new Error('Autentikasi gagal: Sesi tidak valid atau kedaluwarsa.'));
      }

      // Fetch fresh user data from PostgreSQL
      const user = await prisma.user.findUnique({
        where: { id: payload.userId },
        select: {
          id: true,
          username: true,
          nickname: true,
          avatar: true,
          rankTier: true,
          rankDivision: true,
          rankStars: true,
        },
      });

      if (!user) {
        return next(new Error('Autentikasi gagal: Pengguna tidak ditemukan.'));
      }

      socket.user = user;
      next();
    } catch (err: any) {
      console.error('[Socket Auth] Error:', err);
      next(new Error('Autentikasi gagal: Kesalahan server.'));
    }
  });

  // Broadcast sanitized game state to all players in a room
  const broadcastGameState = (room: RoomData) => {
    if (!room.game) return;

    for (const player of room.players) {
      if (player.socketId) {
        const sanitized = GameEngine.getSanitizedState(room.game, player.userId);
        io.to(player.socketId).emit('game:state', sanitized);
      }
    }
  };

  // Broadcast room lobby update to all in room
  const broadcastRoomUpdate = (room: RoomData) => {
    io.to(room.code).emit('room:updated', {
      code: room.code,
      name: room.name,
      mode: room.mode,
      isPublic: room.isPublic,
      maxPlayers: room.maxPlayers,
      hostId: room.hostId,
      status: room.status,
      roundNumber: room.roundNumber,
      lastWinnerUserId: room.lastWinnerUserId,
      lastWinnerTeam: room.lastWinnerTeam,
      players: room.players.map((p) => ({
        userId: p.userId,
        username: p.username,
        nickname: p.nickname,
        avatar: p.avatar,
        seatIndex: p.seatIndex,
        team: p.team,
        rankTier: p.rankTier,
        rankDivision: p.rankDivision,
        rankStars: p.rankStars,
        isReady: p.isReady,
        isConnected: p.isConnected,
        isHost: p.isHost,
        isBot: Boolean(p.isBot),
      })),
    });
    if (room.isPublic) {
      broadcastPublicRooms();
    }
  };

  const broadcastPublicRooms = () => {
    io.emit('rooms:list-updated', roomManager.getPublicRooms());
  };

  // Automated execution for Hard Mode AI bots
  const checkAndTriggerBotTurn = (room: RoomData) => {
    const game = room.game;
    if (!game || game.isFinished || room.status !== 'PLAYING') return;

    const currentTurnUserId = game.currentTurnUserId;
    const currentSlot = room.players.find((p) => p.userId === currentTurnUserId);
    if (!currentSlot || !currentSlot.isBot) return;

    // Natural delay so human players can see the turn indicator & flow (700ms - 1300ms)
    const delayMs = Math.floor(Math.random() * 600) + 700;

    setTimeout(async () => {
      // Re-verify room & turn validity
      if (room.status !== 'PLAYING' || !room.game || room.game.isFinished) return;
      if (room.game.currentTurnUserId !== currentTurnUserId) return;

      const decision = DominoBotAI.getBestMove(
        room.game,
        currentTurnUserId,
        room.mode,
        room.players
      );

      let moveResult: { success: boolean; isGameOver?: boolean; error?: string };
      if (decision.action === 'PLAY' && decision.tileId && decision.end) {
        moveResult = await GameEngine.playTile(
          room,
          currentTurnUserId,
          decision.tileId,
          decision.end
        );
      } else {
        moveResult = await GameEngine.passTurn(room, currentTurnUserId);
      }

      broadcastGameState(room);

      if (moveResult.isGameOver) {
        io.to(room.code).emit('game:finished', room.game.winnerResult);
        room.status = 'FINISHED';
        broadcastRoomUpdate(room);
      } else {
        // Chain to next bot if next turn is also a bot
        checkAndTriggerBotTurn(room);
      }
    }, delayMs);
  };

  io.on('connection', (socket: AuthenticatedSocket) => {
    const user = socket.user!;
    console.log(`[Socket Connected] User ${user.nickname} (${user.id}) - Socket ID: ${socket.id}`);

    // Send public rooms list to newly connected client immediately
    socket.emit('rooms:list-updated', roomManager.getPublicRooms());

    // --- EVENT: rooms:request ---
    socket.on('rooms:request', (ack?: (rooms: any[]) => void) => {
      const list = roomManager.getPublicRooms();
      if (ack) ack(list);
      else socket.emit('rooms:list-updated', list);
    });

    // Check if user was in a game room and reconnect them
    const existingRoom = roomManager.findUserRoom(user.id);
    if (existingRoom) {
      const slot = existingRoom.players.find((p) => p.userId === user.id);
      if (slot) {
        slot.socketId = socket.id;
        slot.isConnected = true;
        slot.disconnectedAt = null;
        socket.join(existingRoom.code);
        io.to(existingRoom.code).emit('player:reconnected', {
          userId: user.id,
          nickname: user.nickname,
        });
        broadcastRoomUpdate(existingRoom);

        if (existingRoom.game) {
          const sanitized = GameEngine.getSanitizedState(existingRoom.game, user.id);
          socket.emit('game:state', sanitized);
          if (existingRoom.game.isFinished && existingRoom.game.winnerResult) {
            socket.emit('game:finished', existingRoom.game.winnerResult);
          }
        }
      }
    }

    // --- EVENT: sync:state ---
    // Critical for seamless mobile page refresh and reconnect state restoration
    socket.on('sync:state', (ack?: (res: any) => void) => {
      const room = roomManager.findUserRoom(user.id);
      if (room) {
        const slot = room.players.find((p) => p.userId === user.id);
        if (slot) {
          slot.socketId = socket.id;
          slot.isConnected = true;
          slot.disconnectedAt = null;
        }
        socket.join(room.code);

        const clientRoomData = {
          code: room.code,
          name: room.name,
          mode: room.mode,
          isPublic: room.isPublic,
          maxPlayers: room.maxPlayers,
          hostId: room.hostId,
          status: room.status,
          roundNumber: room.roundNumber,
          lastWinnerUserId: room.lastWinnerUserId,
          lastWinnerTeam: room.lastWinnerTeam,
          players: room.players.map((p) => ({
            userId: p.userId,
            username: p.username,
            nickname: p.nickname,
            avatar: p.avatar,
            seatIndex: p.seatIndex,
            team: p.team,
            rankTier: p.rankTier,
            rankDivision: p.rankDivision,
            rankStars: p.rankStars,
            isReady: p.isReady,
            isConnected: p.isConnected,
            isHost: p.userId === room.hostId,
            isBot: Boolean(p.isBot),
          })),
        };

        let sanitizedState = null;
        if (room.game) {
          sanitizedState = GameEngine.getSanitizedState(room.game, user.id);
        }

        io.to(room.code).emit('player:reconnected', {
          userId: user.id,
          nickname: user.nickname,
        });
        broadcastRoomUpdate(room);

        if (sanitizedState) {
          socket.emit('game:state', sanitizedState);
          if (room.game?.isFinished && room.game?.winnerResult) {
            socket.emit('game:finished', room.game.winnerResult);
          }
        }

        if (ack) {
          ack({
            success: true,
            room: clientRoomData,
            gameState: sanitizedState,
          });
        }
      } else {
        if (ack) {
          ack({
            success: true,
            room: null,
            gameState: null,
          });
        }
      }
    });

    // --- EVENT: room:create ---
    socket.on('room:create', (payload: any, ack?: (res: any) => void) => {
      try {
        const { name, mode, isPublic, maxPlayers, turnTimeout } = payload || {};
        const room = roomManager.createRoom({
          hostUser: user,
          name: name || `Meja ${user.nickname}`,
          mode: mode === 'TEAM_BATTLE' ? 'TEAM_BATTLE' : 'SOLO',
          isPublic: Boolean(isPublic),
          maxPlayers: Number(maxPlayers) || 4,
          turnTimeout: Number(turnTimeout) || 20,
        });

        const hostSlot = room.players.find((p) => p.userId === user.id)!;
        hostSlot.socketId = socket.id;

        socket.join(room.code);
        broadcastRoomUpdate(room);

        const clientRoomData = {
          code: room.code,
          name: room.name,
          mode: room.mode,
          isPublic: room.isPublic,
          maxPlayers: room.maxPlayers,
          hostId: room.hostId,
          status: room.status,
          roundNumber: room.roundNumber,
          lastWinnerUserId: room.lastWinnerUserId,
          lastWinnerTeam: room.lastWinnerTeam,
          players: room.players.map((p) => ({
            userId: p.userId,
            username: p.username,
            nickname: p.nickname,
            avatar: p.avatar,
            seatIndex: p.seatIndex,
            team: p.team,
            rankTier: p.rankTier,
            rankDivision: p.rankDivision,
            rankStars: p.rankStars,
            isReady: p.isReady,
            isConnected: p.isConnected,
            isHost: p.isHost,
            isBot: Boolean(p.isBot),
          })),
        };

        if (ack) ack({ success: true, roomCode: room.code, room: clientRoomData });
        socket.emit('room:created', { roomCode: room.code });
      } catch (err: any) {
        console.error('[room:create] Error:', err);
        if (ack) ack({ success: false, error: err.message });
      }
    });

    // --- EVENT: room:join ---
    socket.on('room:join', (payload: any, ack?: (res: any) => void) => {
      try {
        const { roomCode } = payload || {};
        if (!roomCode) {
          if (ack) ack({ success: false, error: 'Kode room tidak boleh kosong.' });
          return;
        }

        const joinResult = roomManager.joinRoom(roomCode, user);
        if (!joinResult.success || !joinResult.room) {
          if (ack) ack({ success: false, error: joinResult.error });
          return;
        }

        const room = joinResult.room;
        const playerSlot = room.players.find((p) => p.userId === user.id)!;
        playerSlot.socketId = socket.id;

        socket.join(room.code);
        io.to(room.code).emit('room:player-joined', {
          userId: user.id,
          nickname: user.nickname,
          avatar: user.avatar,
        });
        broadcastRoomUpdate(room);

        // If game is already active and user reconnected
        if (room.status === 'PLAYING' && room.game) {
          const sanitized = GameEngine.getSanitizedState(room.game, user.id);
          socket.emit('game:state', sanitized);
        }

        const clientRoomData = {
          code: room.code,
          name: room.name,
          mode: room.mode,
          isPublic: room.isPublic,
          maxPlayers: room.maxPlayers,
          hostId: room.hostId,
          status: room.status,
          roundNumber: room.roundNumber,
          lastWinnerUserId: room.lastWinnerUserId,
          lastWinnerTeam: room.lastWinnerTeam,
          players: room.players.map((p) => ({
            userId: p.userId,
            username: p.username,
            nickname: p.nickname,
            avatar: p.avatar,
            seatIndex: p.seatIndex,
            team: p.team,
            rankTier: p.rankTier,
            rankDivision: p.rankDivision,
            rankStars: p.rankStars,
            isReady: p.isReady,
            isConnected: p.isConnected,
            isHost: p.isHost,
            isBot: Boolean(p.isBot),
          })),
        };

        if (ack) ack({ success: true, roomCode: room.code, room: clientRoomData });
      } catch (err: any) {
        console.error('[room:join] Error:', err);
        if (ack) ack({ success: false, error: err.message });
      }
    });

    // --- EVENT: room:ready ---
    socket.on('room:ready', (payload: any, ack?: (res: any) => void) => {
      try {
        const { roomCode } = payload || {};
        const result = roomManager.toggleReady(roomCode, user.id);
        if (!result.success) {
          if (ack) ack({ success: false, error: result.error });
          return;
        }

        const room = roomManager.getRoom(roomCode);
        if (room) broadcastRoomUpdate(room);

        if (ack) ack({ success: true, isReady: result.isReady });
      } catch (err: any) {
        console.error('[room:ready] Error:', err);
        if (ack) ack({ success: false, error: err.message });
      }
    });

    // --- EVENT: room:start ---
    socket.on('room:start', (payload: any, ack?: (res: any) => void) => {
      try {
        const { roomCode } = payload || {};
        const startResult = roomManager.startGame(roomCode, user.id);
        if (!startResult.success || !startResult.room) {
          if (ack) ack({ success: false, error: startResult.error });
          return;
        }

        const room = startResult.room;
        io.to(room.code).emit('room:started', { code: room.code });
        broadcastRoomUpdate(room);
        broadcastGameState(room);
        checkAndTriggerBotTurn(room);

        if (ack) ack({ success: true });
      } catch (err: any) {
        console.error('[room:start] Error:', err);
        if (ack) ack({ success: false, error: err.message });
      }
    });

    // --- EVENT: room:add-bot ---
    socket.on('room:add-bot', (payload: any, ack?: (res: any) => void) => {
      try {
        const { roomCode } = payload || {};
        const addResult = roomManager.addBot(roomCode, user.id);
        if (!addResult.success || !addResult.room) {
          if (ack) ack({ success: false, error: addResult.error });
          return;
        }

        const room = addResult.room;
        broadcastRoomUpdate(room);
        if (ack) ack({ success: true, bot: addResult.bot });
      } catch (err: any) {
        console.error('[room:add-bot] Error:', err);
        if (ack) ack({ success: false, error: err.message });
      }
    });

    // --- EVENT: room:kick ---
    socket.on('room:kick', (payload: any, ack?: (res: any) => void) => {
      try {
        const { roomCode, targetUserId } = payload || {};
        const kickResult = roomManager.kickPlayer(roomCode, user.id, targetUserId);
        if (!kickResult.success || !kickResult.room) {
          if (ack) ack({ success: false, error: kickResult.error });
          return;
        }

        const room = kickResult.room;
        io.to(room.code).emit('room:player-left', { userId: targetUserId, reason: 'KICKED' });
        broadcastRoomUpdate(room);

        if (ack) ack({ success: true });
      } catch (err: any) {
        console.error('[room:kick] Error:', err);
        if (ack) ack({ success: false, error: err.message });
      }
    });

    // --- EVENT: room:leave ---
    socket.on('room:leave', (payload: any, ack?: (res: any) => void) => {
      try {
        const { roomCode } = payload || {};
        const leaveResult = roomManager.leaveRoom(roomCode, user.id);
        socket.leave(roomCode);

        if (!leaveResult.roomDeleted && leaveResult.room) {
          io.to(roomCode).emit('room:player-left', { userId: user.id });
          broadcastRoomUpdate(leaveResult.room);
        } else {
          broadcastPublicRooms();
        }

        if (ack) ack({ success: true });
      } catch (err: any) {
        console.error('[room:leave] Error:', err);
        if (ack) ack({ success: false, error: err.message });
      }
    });

    // --- EVENT: room:play-again ---
    // Stay in room, reset board, return room to WAITING for next round
    socket.on('room:play-again', (payload: any, ack?: (res: any) => void) => {
      try {
        const { roomCode } = payload || {};
        const resetResult = roomManager.resetRoomForNextRound(roomCode, user.id);
        if (!resetResult.success || !resetResult.room) {
          if (ack) ack({ success: false, error: resetResult.error });
          return;
        }

        const room = resetResult.room;
        io.to(room.code).emit('room:reset', { roundNumber: room.roundNumber });
        broadcastRoomUpdate(room);

        if (ack) ack({ success: true, roundNumber: room.roundNumber });
      } catch (err: any) {
        console.error('[room:play-again] Error:', err);
        if (ack) ack({ success: false, error: err.message });
      }
    });

    // --- EVENT: game:play ---
    socket.on('game:play', async (payload: any, ack?: (res: any) => void) => {
      try {
        const { roomCode, tileId, end } = payload || {};
        const room = roomManager.getRoom(roomCode);
        if (!room) {
          if (ack) ack({ success: false, error: 'Room tidak ditemukan.' });
          return;
        }

        const result = await GameEngine.playTile(room, user.id, tileId, end);
        if (!result.success) {
          socket.emit('game:move-rejected', { error: result.error });
          if (ack) ack({ success: false, error: result.error });
          return;
        }

        socket.emit('game:move-accepted', { tileId, end });
        broadcastGameState(room);

        if (result.isGameOver) {
          io.to(room.code).emit('game:finished', room.game?.winnerResult);
          room.status = 'FINISHED';
          broadcastRoomUpdate(room);
        } else {
          checkAndTriggerBotTurn(room);
        }

        if (ack) ack({ success: true });
      } catch (err: any) {
        console.error('[game:play] Error:', err);
        if (ack) ack({ success: false, error: err.message });
      }
    });

    // --- EVENT: game:pass ---
    socket.on('game:pass', async (payload: any, ack?: (res: any) => void) => {
      try {
        const { roomCode } = payload || {};
        const room = roomManager.getRoom(roomCode);
        if (!room) {
          if (ack) ack({ success: false, error: 'Room tidak ditemukan.' });
          return;
        }

        const result = await GameEngine.passTurn(room, user.id);
        if (!result.success) {
          if (ack) ack({ success: false, error: result.error });
          return;
        }

        broadcastGameState(room);

        if (result.isGameOver) {
          io.to(room.code).emit('game:finished', room.game?.winnerResult);
          room.status = 'FINISHED';
          broadcastRoomUpdate(room);
        } else {
          checkAndTriggerBotTurn(room);
        }

        if (ack) ack({ success: true });
      } catch (err: any) {
        console.error('[game:pass] Error:', err);
        if (ack) ack({ success: false, error: err.message });
      }
    });

    // --- EVENT: chat:send ---
    socket.on('chat:send', (payload: any) => {
      try {
        const { roomCode, text, isEmote } = payload || {};
        if (!roomCode || !text) return;

        const cleanText = String(text).substring(0, 150);
        const chatMsg: ChatMessage = {
          id: `${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
          userId: user.id,
          nickname: user.nickname,
          avatar: user.avatar,
          text: cleanText,
          isEmote: Boolean(isEmote),
          timestamp: Date.now(),
        };

        io.to(roomCode).emit('chat:message', chatMsg);
      } catch (err: any) {
        console.error('[chat:send] Error:', err);
      }
    });

    // --- EVENT: profile:nickname:update ---
    socket.on('profile:nickname:update', (payload: any) => {
      const { nickname, avatar } = payload || {};
      if (nickname) user.nickname = nickname;
      if (avatar) user.avatar = avatar;

      const room = roomManager.findUserRoom(user.id);
      if (room) {
        const p = room.players.find((pl) => pl.userId === user.id);
        if (p) {
          if (nickname) p.nickname = nickname;
          if (avatar) p.avatar = avatar;
          broadcastRoomUpdate(room);
        }
      }
    });

    // --- EVENT: disconnect ---
    socket.on('disconnect', () => {
      console.log(`[Socket Disconnected] User ${user.nickname} (${user.id})`);
      const { room } = roomManager.handleDisconnect(socket.id);
      if (room) {
        io.to(room.code).emit('player:disconnected', {
          userId: user.id,
          nickname: user.nickname,
          gracePeriodSeconds: 60,
        });
        broadcastRoomUpdate(room);
      }
    });
  });

  // Background Turn Timer Loop (runs every 1 second)
  setInterval(async () => {
    const now = Date.now();
    for (const room of (roomManager as any).rooms.values()) {
      if (room.status === 'PLAYING' && room.game && !room.game.isFinished) {
        if (now > room.game.turnDeadline) {
          console.log(`[Turn Timeout] Room ${room.code} Player ${room.game.currentTurnUserId}`);
          const result = await GameEngine.handleTimeout(room);
          broadcastGameState(room);

          if (result.isGameOver) {
            io.to(room.code).emit('game:finished', room.game.winnerResult);
            room.status = 'FINISHED';
            broadcastRoomUpdate(room);
          } else {
            checkAndTriggerBotTurn(room);
          }
        }
      }
    }
  }, 1000);

  // Background Room Cleanup Loop (runs every 30 seconds)
  setInterval(() => {
    roomManager.cleanupExpiredRooms();
  }, 30000);
}
