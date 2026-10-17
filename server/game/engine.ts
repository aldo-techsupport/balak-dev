import {
  AuthoritativeGameState,
  BoardPlacedTile,
  DominoTile,
  GameMoveRecord,
  GameWinnerResult,
  PlayerSlot,
  RoomData,
  SanitizedGameState,
  Team,
} from '../types';
import {
  dealHands,
  findStartingPlayer,
  getHandPips,
  getPlayableTileIds,
  connectTileToBoard,
} from './domino';
import { prisma } from '../../src/lib/prisma';
import { calculateRankResult } from '../../src/lib/rank';

export class GameEngine {
  /**
   * Initialize a new game round
   */
  public static initGame(room: RoomData): AuthoritativeGameState {
    const playerIds = room.players.map((p) => p.userId);
    const { hands, drawPile } = dealHands(playerIds);
    const { startingUserId, requiredInitialTile, mustPlayBalak } = findStartingPlayer(
      playerIds,
      hands,
      room.lastWinnerUserId
    );

    const startingPlayer = room.players.find((p) => p.userId === startingUserId)!;
    const now = Date.now();
    const turnDurationMs = (room.turnTimeout || 20) * 1000;

    return {
      board: [],
      leftEnd: null,
      rightEnd: null,
      hands,
      drawPile,
      currentTurnSeat: startingPlayer.seatIndex,
      currentTurnUserId: startingPlayer.userId,
      turnDeadline: now + turnDurationMs,
      sequenceNumber: 1,
      consecutivePasses: 0,
      moveHistory: [],
      winnerResult: null,
      isFinished: false,
      requiredInitialTileId: requiredInitialTile?.id,
      mustPlayBalak: mustPlayBalak || false,
    };
  }

  /**
   * Produce a safe snapshot for a specific player (hiding opponent tiles)
   */
  public static getSanitizedState(
    game: AuthoritativeGameState,
    forUserId: string
  ): SanitizedGameState {
    const myHand = game.hands[forUserId] || [];
    const opponentTileCounts: Record<string, number> = {};

    for (const [userId, hand] of Object.entries(game.hands)) {
      if (userId !== forUserId) {
        opponentTileCounts[userId] = hand.length;
      }
    }

    const isOpeningMove = game.board.length === 0;
    const playableTileIds =
      game.currentTurnUserId === forUserId && !game.isFinished
        ? getPlayableTileIds(
            myHand,
            game.leftEnd,
            game.rightEnd,
            isOpeningMove ? game.requiredInitialTileId : undefined,
            isOpeningMove ? game.mustPlayBalak : false
          )
        : [];

    return {
      board: game.board,
      leftEnd: game.leftEnd,
      rightEnd: game.rightEnd,
      myHand,
      opponentTileCounts,
      drawPileCount: game.drawPile.length,
      currentTurnSeat: game.currentTurnSeat,
      currentTurnUserId: game.currentTurnUserId,
      turnDeadline: game.turnDeadline,
      sequenceNumber: game.sequenceNumber,
      moveHistory: game.moveHistory.slice(-15), // Last 15 moves
      winnerResult: game.winnerResult,
      isFinished: game.isFinished,
      playableTileIds,
      requiredInitialTileId: isOpeningMove ? game.requiredInitialTileId : undefined,
      mustPlayBalak: isOpeningMove ? game.mustPlayBalak : false,
    };
  }

  /**
   * Handle placing a domino tile
   */
  public static async playTile(
    room: RoomData,
    userId: string,
    tileId: string,
    requestedEnd: 'LEFT' | 'RIGHT'
  ): Promise<{ success: boolean; error?: string; isGameOver?: boolean }> {
    const game = room.game;
    if (!game || game.isFinished) {
      return { success: false, error: 'Permainan belum dimulai atau sudah selesai.' };
    }

    if (game.currentTurnUserId !== userId) {
      return { success: false, error: 'Bukan giliran Anda.' };
    }

    const hand = game.hands[userId];
    if (!hand) {
      return { success: false, error: 'Data kartu pemain tidak ditemukan.' };
    }

    const tileIndex = hand.findIndex((t) => t.id === tileId);
    if (tileIndex === -1) {
      return { success: false, error: 'Anda tidak memiliki kartu ini di tangan.' };
    }

    const tile = hand[tileIndex];
    const turnNumber = game.board.length + 1;

    // Opening move validation (Round 1 balak 0 or Round 2+ winner balak)
    if (game.board.length === 0) {
      if (game.requiredInitialTileId && tile.id !== game.requiredInitialTileId) {
        return {
          success: false,
          error: `Untuk permainan pertama, kartu pembuka harus Balak 0 (0-0).`,
        };
      }
      if (game.mustPlayBalak && tile.left !== tile.right) {
        const hasBalakInHand = hand.some((t) => t.left === t.right);
        if (hasBalakInHand) {
          return {
            success: false,
            error: `Pemenang ronde sebelumnya wajib membuka dengan kartu balak miliknya.`,
          };
        }
      }
    }

    // Validate and connect to board
    const placement = connectTileToBoard(
      game.board,
      tile,
      requestedEnd,
      game.leftEnd,
      game.rightEnd,
      turnNumber
    );

    if (!placement.valid) {
      return { success: false, error: placement.error || 'Penempatan kartu tidak valid.' };
    }

    // Apply move
    hand.splice(tileIndex, 1);
    game.board = placement.newBoard;
    game.leftEnd = placement.newLeft;
    game.rightEnd = placement.newRight;
    game.consecutivePasses = 0;
    game.sequenceNumber += 1;

    const player = room.players.find((p) => p.userId === userId)!;
    game.moveHistory.push({
      userId,
      nickname: player.nickname,
      action: 'PLAY',
      tile,
      end: requestedEnd,
      leftEnd: game.leftEnd,
      rightEnd: game.rightEnd,
      timestamp: Date.now(),
    });

    // Check Win Condition 1: Hand is empty (Normal Win / Gaple)
    if (hand.length === 0) {
      game.isFinished = true;
      await this.finalizeMatch(room, 'NORMAL_WIN', userId);
      return { success: true, isGameOver: true };
    }

    // Shift to next turn
    this.advanceTurn(room);
    return { success: true, isGameOver: false };
  }

  /**
   * Handle player passing turn ("Lewat")
   */
  public static async passTurn(
    room: RoomData,
    userId: string
  ): Promise<{ success: boolean; error?: string; isGameOver?: boolean }> {
    const game = room.game;
    if (!game || game.isFinished) {
      return { success: false, error: 'Permainan belum dimulai atau sudah selesai.' };
    }

    if (game.currentTurnUserId !== userId) {
      return { success: false, error: 'Bukan giliran Anda.' };
    }

    const hand = game.hands[userId] || [];
    const playableIds = getPlayableTileIds(hand, game.leftEnd, game.rightEnd);

    // If player still has playable tiles, they CANNOT pass
    if (playableIds.length > 0) {
      return {
        success: false,
        error: 'Anda masih memiliki kartu yang dapat dipasang dan tidak boleh lewat.',
      };
    }

    // If draw pile has tiles, player must draw before passing
    if (game.drawPile.length > 0) {
      const drawnTile = game.drawPile.pop()!;
      hand.push(drawnTile);
      game.sequenceNumber += 1;

      const player = room.players.find((p) => p.userId === userId)!;
      game.moveHistory.push({
        userId,
        nickname: player.nickname,
        action: 'DRAW',
        timestamp: Date.now(),
      });

      // Check if newly drawn card is playable
      const newPlayable = getPlayableTileIds(hand, game.leftEnd, game.rightEnd);
      if (newPlayable.length > 0) {
        // Player draws and can now play, reset timer slightly
        game.turnDeadline = Date.now() + (room.turnTimeout || 20) * 1000;
        return { success: true, isGameOver: false };
      }
    }

    // Register Pass
    game.consecutivePasses += 1;
    game.sequenceNumber += 1;

    const player = room.players.find((p) => p.userId === userId)!;
    game.moveHistory.push({
      userId,
      nickname: player.nickname,
      action: 'PASS',
      leftEnd: game.leftEnd,
      rightEnd: game.rightEnd,
      timestamp: Date.now(),
    });

    // Check Deadlock Condition ("Buntu" / "Trun")
    // When consecutive passes equals the number of active players, nobody can move!
    if (game.consecutivePasses >= room.players.length) {
      game.isFinished = true;
      await this.finalizeMatch(room, 'DEADLOCK');
      return { success: true, isGameOver: true };
    }

    // Advance turn to next player
    this.advanceTurn(room);
    return { success: true, isGameOver: false };
  }

  /**
   * Advance turn counter to the next valid seat
   */
  public static advanceTurn(room: RoomData): void {
    const game = room.game!;
    const sortedPlayers = [...room.players].sort((a, b) => a.seatIndex - b.seatIndex);
    const currentIndex = sortedPlayers.findIndex((p) => p.seatIndex === game.currentTurnSeat);

    const nextIndex = (currentIndex + 1) % sortedPlayers.length;
    const nextPlayer = sortedPlayers[nextIndex];

    game.currentTurnSeat = nextPlayer.seatIndex;
    game.currentTurnUserId = nextPlayer.userId;
    game.turnDeadline = Date.now() + (room.turnTimeout || 20) * 1000;
    game.sequenceNumber += 1;
  }

  /**
   * Auto move on turn timeout: Play legal card or pass
   */
  public static async handleTimeout(
    room: RoomData
  ): Promise<{ success: boolean; isGameOver?: boolean }> {
    const game = room.game;
    if (!game || game.isFinished) return { success: false };

    const currentUserId = game.currentTurnUserId;
    const hand = game.hands[currentUserId] || [];
    const playableIds = getPlayableTileIds(hand, game.leftEnd, game.rightEnd);

    if (playableIds.length > 0) {
      const tileId = playableIds[0];
      const tile = hand.find((t) => t.id === tileId)!;

      // Determine end
      let end: 'LEFT' | 'RIGHT' = 'RIGHT';
      if (game.leftEnd !== null && (tile.left === game.leftEnd || tile.right === game.leftEnd)) {
        end = 'LEFT';
      }

      return await this.playTile(room, currentUserId, tileId, end);
    } else {
      return await this.passTurn(room, currentUserId);
    }
  }

  /**
   * Finalize match: calculate scores, determine winners, and record to PostgreSQL
   */
  private static async finalizeMatch(
    room: RoomData,
    endReason: 'NORMAL_WIN' | 'DEADLOCK',
    finisherUserId?: string
  ): Promise<void> {
    const game = room.game!;
    const isTeamBattle = room.mode === 'TEAM_BATTLE';

    // Summary of pips for every player
    const pipsSummary = room.players.map((p) => {
      const hand = game.hands[p.userId] || [];
      const pips = getHandPips(hand);
      return {
        userId: p.userId,
        nickname: p.nickname,
        avatar: p.avatar,
        team: p.team,
        seatIndex: p.seatIndex,
        pips,
        tiles: [...hand],
        isWinner: false,
        isBot: Boolean(p.isBot),
      };
    });

    let winningTeam: Team | undefined;
    let winnerId: string | undefined;
    let winnerNickname: string | undefined;
    let teamScores: { teamA: number; teamB: number } | undefined;

    if (endReason === 'NORMAL_WIN') {
      winnerId = finisherUserId;
      const winner = room.players.find((p) => p.userId === finisherUserId);

      if (isTeamBattle && winner?.team) {
        winningTeam = winner.team;
        const teamName = winningTeam === 'TEAM_A' ? 'Tim Merah (Tim A)' : 'Tim Biru (Tim B)';
        const winnerTeammates = room.players
          .filter((p) => p.team === winningTeam)
          .map((p) => p.nickname)
          .join(' & ');
        winnerNickname = `${teamName} — ${winner.nickname} Gaple! (${winnerTeammates})`;
        room.lastWinnerUserId = finisherUserId;
        room.lastWinnerTeam = winningTeam;

        pipsSummary.forEach((p) => {
          if (p.team === winningTeam) p.isWinner = true;
        });
      } else {
        winnerNickname = winner?.nickname;
        room.lastWinnerUserId = winnerId;
        const winnerSummary = pipsSummary.find((p) => p.userId === winnerId);
        if (winnerSummary) winnerSummary.isWinner = true;
      }
    } else {
      // DEADLOCK ("BUNTU"): calculate lowest pip count
      if (isTeamBattle) {
        const teamAPips = pipsSummary
          .filter((p) => p.team === 'TEAM_A')
          .reduce((sum, p) => sum + p.pips, 0);

        const teamBPips = pipsSummary
          .filter((p) => p.team === 'TEAM_B')
          .reduce((sum, p) => sum + p.pips, 0);

        teamScores = { teamA: teamAPips, teamB: teamBPips };

        // Lowest pip team wins
        if (teamAPips < teamBPips) {
          winningTeam = 'TEAM_A';
        } else if (teamBPips < teamAPips) {
          winningTeam = 'TEAM_B';
        } else {
          // Tie-break: lowest individual pip in deadlock
          const lowestPipPlayer = [...pipsSummary].sort((a, b) => a.pips - b.pips)[0];
          winningTeam = lowestPipPlayer.team || 'TEAM_A';
        }

        const teamName = winningTeam === 'TEAM_A' ? 'Tim Merah (Tim A)' : 'Tim Biru (Tim B)';
        const winningMembers = pipsSummary
          .filter((p) => p.team === winningTeam)
          .sort((a, b) => a.pips - b.pips);

        room.lastWinnerUserId = winningMembers[0]?.userId;
        room.lastWinnerTeam = winningTeam;
        winnerId = room.lastWinnerUserId;
        winnerNickname = `${teamName} Menang Buntu! (${teamScores.teamA} vs ${teamScores.teamB} Balak)`;

        pipsSummary.forEach((p) => {
          if (p.team === winningTeam) p.isWinner = true;
        });
      } else {
        // Solo mode: player with minimum pips wins
        const sorted = [...pipsSummary].sort((a, b) => a.pips - b.pips);
        const champion = sorted[0];
        winnerId = champion.userId;
        winnerNickname = champion.nickname;
        champion.isWinner = true;
        room.lastWinnerUserId = winnerId;
      }
    }

    // Rank Progression Calculation
    try {
      const userIds = pipsSummary.map((p) => p.userId);
      const userRecords = await prisma.user.findMany({
        where: { id: { in: userIds } },
        select: { id: true, rankTier: true, rankDivision: true, rankStars: true, rankScore: true },
      });
      const userMap = new Map(userRecords.map((u) => [u.id, u]));

      for (const p of pipsSummary) {
        const u = userMap.get(p.userId);
        const curTier = u?.rankTier || 'WARRIOR';
        const curDiv = u?.rankDivision || 'III';
        const curStars = u?.rankStars || 0;

        const rankRes = calculateRankResult(curTier, curDiv, curStars, p.isWinner);
        const pRank = p as any;
        pRank.rankTier = rankRes.newTier;
        pRank.rankDivision = rankRes.newDivision;
        pRank.rankStars = rankRes.newStars;
        pRank.starChange = rankRes.starChange;
        pRank.rankFormatted = rankRes.rankInfo.formatted;
        pRank.isPromotion = rankRes.isPromotion;
        pRank.isDemotion = rankRes.isDemotion;

        const slot = room.players.find((pl) => pl.userId === p.userId);
        if (slot) {
          slot.rankTier = rankRes.newTier;
          slot.rankDivision = rankRes.newDivision;
          slot.rankStars = rankRes.newStars;
        }
      }
    } catch (rankErr) {
      console.error('[GameEngine] Error calculating rank:', rankErr);
    }

    game.winnerResult = {
      winnerId,
      winnerNickname,
      winningTeam,
      endReason,
      pipsSummary,
      teamScores,
    };

    // Update in-memory player win count for this table session
    for (const p of pipsSummary) {
      if (p.isWinner) {
        const rp = room.players.find((pl) => pl.userId === p.userId);
        if (rp) {
          rp.wins = (rp.wins || 0) + 1;
        }
      }
    }

    // Save to PostgreSQL via Prisma
    try {
      await prisma.$transaction(async (tx) => {
        // 1. Create MatchHistory record
        const matchRecord = await tx.matchHistory.create({
          data: {
            roomCode: room.code,
            gameMode: room.mode,
            playerCount: room.players.length,
            winnerId: winnerId || null,
            winnerNickname: winnerNickname || (winningTeam ? winningTeam : 'Draw'),
            winningTeam: winningTeam || null,
            endReason,
          },
        });

        // 2. Create Participant snapshots & update account stats
        for (const p of pipsSummary) {
          const rankData = p as any;
          await tx.matchParticipant.create({
            data: {
              matchId: matchRecord.id,
              userId: p.userId,
              userNicknameSnapshot: p.nickname,
              userAvatarSnapshot: p.avatar,
              seatIndex: p.seatIndex,
              team: p.team,
              isWinner: p.isWinner,
              remainingPips: p.pips,
              remainingTiles: JSON.stringify(p.tiles),
              rankStarsChange: rankData.starChange || 0,
              rankSnapshot: rankData.rankFormatted || 'Warrior III (0★)',
            },
          });

          // Update user aggregate stats & rank
          await tx.user.update({
            where: { id: p.userId },
            data: {
              totalGames: { increment: 1 },
              wins: p.isWinner ? { increment: 1 } : undefined,
              losses: !p.isWinner ? { increment: 1 } : undefined,
              soloGames: !isTeamBattle ? { increment: 1 } : undefined,
              soloWins: !isTeamBattle && p.isWinner ? { increment: 1 } : undefined,
              teamGames: isTeamBattle ? { increment: 1 } : undefined,
              teamWins: isTeamBattle && p.isWinner ? { increment: 1 } : undefined,
              rankTier: rankData.rankTier || undefined,
              rankDivision: rankData.rankDivision || undefined,
              rankStars: rankData.rankStars !== undefined ? rankData.rankStars : undefined,
              rankScore: { increment: p.isWinner ? 1 : 0 },
            },
          });
        }
      });
      console.log(`[GameEngine] Match saved successfully for room ${room.code}`);
    } catch (dbErr) {
      console.error('[GameEngine] Error recording match to database:', dbErr);
    }
  }
}
